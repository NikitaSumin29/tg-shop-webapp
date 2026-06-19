import json
import os
from contextlib import asynccontextmanager
from typing import List

import jwt
import models
import schemas
from aiogram import Bot
from config import settings
from database import AsyncSessionLocal, Base, engine, get_db
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

tg_bot = Bot(token=settings.BOT_TOKEN)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Создаем таблицы, если их нет
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. АВТОЗАПОЛНЕНИЕ ТОВАРОВ ИЗ JSON (Database Seeding)
    async with AsyncSessionLocal() as session:
        file_path = "products.json"
        # Проверяем, существует ли файл
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                products_data = json.load(f)

            for p_data in products_data:
                # Проверяем, есть ли уже товар с таким именем в базе
                result = await session.execute(
                    select(models.Product).where(models.Product.name == p_data["name"])
                )
                existing_product = result.scalar_one_or_none()

                # Если товара нет - добавляем его!
                if not existing_product:
                    new_product = models.Product(
                        name=p_data["name"],
                        description=p_data["description"],
                        price=p_data["price"],
                        image_url=p_data.get("image_url", "/no-image.svg"),
                    )
                    session.add(new_product)
            # Сохраняем все новые товары в БД
            await session.commit()

    yield


app = FastAPI(title="Telegram Shop API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def format_price(price: float):
    return f"{price:,.2f}".replace(",", " ")


# --- ФУНКЦИЯ РАСШИФРОВКИ И ПРОВЕРКИ ТОКЕНА ---
def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.BOT_TOKEN, algorithms=["HS256"])
    except Exception:
        raise HTTPException(
            status_code=401, detail="Ошибка безопасности: Неверный токен!"
        )


# --- 1. КАТАЛОГ ТОВАРОВ ---
@app.get("/api/products", response_model=List[schemas.ProductResponse])
async def get_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Product).where(models.Product.is_active))
    return result.scalars().all()


# --- 2. ПОЛУЧЕНИЕ ДАННЫХ ЮЗЕРА (БАЛАНС + ЗАКАЗЫ) ---
@app.get("/api/user_data")
async def get_user_data(token: str, db: AsyncSession = Depends(get_db)):
    # Проверяем токен!
    payload = verify_token(token)
    real_tg_id = payload["tg_id"]
    real_username = payload.get("username")

    result = await db.execute(
        select(models.User).where(models.User.tg_id == real_tg_id)
    )
    user = result.scalar_one_or_none()

    # Если юзер зашел впервые - регистрируем, если поменял ник - обновляем
    if not user:
        user = models.User(tg_id=real_tg_id, username=real_username)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif user.username != real_username:
        user.username = real_username  # type: ignore
        await db.commit()

    # Достаем историю заказов
    orders_res = await db.execute(
        select(models.Order)
        .options(
            selectinload(models.Order.items).selectinload(models.OrderItem.product)
        )
        .where(models.Order.user_id == user.id)
        .order_by(models.Order.created_at.desc())
    )
    return {"balance": user.balance, "orders": orders_res.scalars().all()}


# --- 3. СОЗДАНИЕ ЗАКАЗА ---
@app.post("/api/orders")
async def create_order(
    order_data: schemas.OrderCreate, db: AsyncSession = Depends(get_db)
):
    # Проверяем токен из JSON-тела!
    payload = verify_token(order_data.token)  # type: ignore
    real_tg_id = payload["tg_id"]

    result = await db.execute(
        select(models.User).where(models.User.tg_id == real_tg_id)
    )
    user = result.scalar_one()

    # Считаем сумму
    total_sum = 0.0
    actual_items = []
    for item in order_data.items:
        prod_res = await db.execute(
            select(models.Product).where(models.Product.id == item.product_id)
        )
        product = prod_res.scalar_one_or_none()
        if product:
            total_sum += float(product.price) * item.quantity  # type: ignore
            actual_items.append({"product": product, "qty": item.quantity})

    # ПРОВЕРКА БАЛАНСА
    if float(user.balance) < total_sum:  # type: ignore
        raise HTTPException(
            status_code=400,
            detail={"msg": "insufficient_funds", "balance": user.balance},
        )

    # Списываем деньги
    user.balance = float(user.balance) - total_sum  # type: ignore

    new_order = models.Order(user_id=user.id, status="new")
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)

    # Добавляем товары
    for item in actual_items:
        db.add(
            models.OrderItem(
                order_id=new_order.id,
                product_id=item["product"].id,
                quantity=item["qty"],
                price_at_purchase=item["product"].price,
            )
        )
    await db.commit()

    # Отправляем чек в Телеграм
    try:
        receipt_text = (
            f"✅ <b>Заказ #{new_order.id} успешно оформлен!</b>\n\n"
            f"💰 Сумма заказа: <b>{format_price(total_sum)} ₽</b>\n"
            f"💳 Ваш текущий баланс: <b>{format_price(float(user.balance))} ₽</b>"  # type: ignore
        )
        await tg_bot.send_message(
            chat_id=real_tg_id, text=receipt_text, parse_mode="HTML"
        )
    except Exception as e:
        print(f"Ошибка отправки ТГ: {e}")

    return {"message": "ok", "new_balance": user.balance, "order_id": new_order.id}


# --- 4. ОТМЕНА ЗАКАЗА И ВОЗВРАТ ДЕНЕГ ---
@app.patch("/api/orders/{order_id}/cancel")
async def cancel_order(order_id: int, token: str, db: AsyncSession = Depends(get_db)):
    verify_token(token)  # Проверяем, что запрос от реального юзера!

    res = await db.execute(
        select(models.Order)
        .options(selectinload(models.Order.items))
        .where(models.Order.id == order_id)
    )
    order = res.scalar_one_or_none()

    if not order or order.status != "new":  # type: ignore
        raise HTTPException(status_code=400, detail="error")

    user_res = await db.execute(
        select(models.User).where(models.User.id == order.user_id)
    )
    user = user_res.scalar_one()

    # Возвращаем деньги
    total = sum(float(i.price_at_purchase) * i.quantity for i in order.items)  # type: ignore
    user.balance = float(user.balance) + total  # type: ignore
    order.status = "cancelled"  # type: ignore
    await db.commit()

    return {"message": "ok", "refunded": total, "new_balance": user.balance}


# --- 5. ПОПОЛНИТЬ БАЛАНС (Для бота) ---
@app.post("/api/users/{tg_id}/topup")
async def topup_balance(
    tg_id: int,
    secret_token: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    if secret_token != settings.BOT_TOKEN:
        raise HTTPException(status_code=403, detail="Доступ запрещен!")

    res = await db.execute(select(models.User).where(models.User.tg_id == tg_id))
    user = res.scalar_one_or_none()
    if not user:
        user = models.User(tg_id=tg_id)
        db.add(user)

    # Используем переменную из настроек!
    user.balance = float(user.balance or 0.0) + settings.TOPUP_AMOUNT  # type: ignore
    await db.commit()
    return {"balance": user.balance}
