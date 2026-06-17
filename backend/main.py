from contextlib import asynccontextmanager
from typing import List

import models
import schemas
from database import Base, engine, get_db
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # --- ВРЕМЕННЫЙ СКРИПТ ОЧИСТКИ ---
        # Удаляем все записи из таблиц заказов при каждом запуске
        await conn.execute(text("DELETE FROM order_items;"))
        await conn.execute(text("DELETE FROM orders;"))
        # --------------------------------

    yield


app = FastAPI(title="Telegram Shop API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# МЕТОД ДЛЯ ПОЛУЧЕНИЯ ВСЕХ ТОВАРОВ
@app.get("/api/products", response_model=List[schemas.ProductResponse])
async def get_products(db: AsyncSession = Depends(get_db)):
    # Делаем SQL запрос: SELECT * FROM products WHERE is_active = True
    result = await db.execute(select(models.Product).where(models.Product.is_active))
    products = result.scalars().all()
    return products


# 1. ОФОРМИТЬ ЗАКАЗ
@app.post("/api/orders", response_model=schemas.OrderResponse)
async def create_order(
    order_data: schemas.OrderCreate, db: AsyncSession = Depends(get_db)
):
    # Ищем пользователя в БД или создаем нового (незаметная регистрация)
    result = await db.execute(
        select(models.User).where(models.User.tg_id == order_data.tg_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = models.User(tg_id=order_data.tg_id, username=order_data.username)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Создаем сам заказ
    new_order = models.Order(user_id=user.id, status="new")
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)

    # Добавляем товары в заказ
    for item in order_data.items:
        # Достаем актуальную цену товара из БД
        prod_res = await db.execute(
            select(models.Product).where(models.Product.id == item.product_id)
        )
        product = prod_res.scalar_one_or_none()

        if product:
            order_item = models.OrderItem(
                order_id=new_order.id,
                product_id=product.id,
                quantity=item.quantity,
                price_at_purchase=product.price,  # Фиксируем цену для 3НФ!
            )
            db.add(order_item)

    await db.commit()

    # Возвращаем созданный заказ
    final_res = await db.execute(
        select(models.Order)
        .options(selectinload(models.Order.items))
        .where(models.Order.id == new_order.id)
    )
    return final_res.scalar_one()


# 2. ПОЛУЧИТЬ ИСТОРИЮ ЗАКАЗОВ (Для экрана "Мои заказы")
@app.get("/api/orders/{tg_id}", response_model=List[schemas.OrderResponse])
async def get_user_orders(tg_id: int, db: AsyncSession = Depends(get_db)):
    # Ищем пользователя
    user_res = await db.execute(select(models.User).where(models.User.tg_id == tg_id))
    user = user_res.scalar_one_or_none()

    if not user:
        return []  # Если юзера нет, у него пустая история

    # Достаем все его заказы вместе с товарами (сортируем от новых к старым)
    orders_res = await db.execute(
        select(models.Order)
        .options(selectinload(models.Order.items))
        .where(models.Order.user_id == user.id)
        .order_by(models.Order.created_at.desc())
    )
    return orders_res.scalars().all()


# 3. ОТМЕНИТЬ ЗАКАЗ (Твоя идея!)
@app.patch("/api/orders/{order_id}/cancel")
async def cancel_order(order_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Order).where(models.Order.id == order_id))
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.status != "new":  # type: ignore
        raise HTTPException(
            status_code=400, detail="Можно отменить только новые заказы"
        )

    order.status = "cancelled"  # type: ignore
    await db.commit()
    return {"message": "Заказ успешно отменен"}
