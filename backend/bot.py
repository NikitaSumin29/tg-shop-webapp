import asyncio
import logging
import urllib.parse

import aiohttp
import jwt
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BotCommand,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from config import settings

logging.basicConfig(level=logging.INFO)
bot = Bot(token=settings.BOT_TOKEN)
dp = Dispatcher()

# ССЫЛКА САЙТА МАГАЗИНА
WEBAPP_URL = "https://3c43c19a351646.lhr.life"
BACKEND_URL = "http://127.0.0.1:8000"


# ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ ТОКЕНА
def get_token(user: types.User):
    payload = {"tg_id": user.id, "username": user.username}
    return jwt.encode(payload, settings.BOT_TOKEN, algorithm="HS256")


def get_store_url(user: types.User):
    safe_name = urllib.parse.quote(user.first_name)
    return f"{WEBAPP_URL}?token={get_token(user)}&name={safe_name}"


def format_price(price: float):
    return f"{price:,.2f}".replace(",", " ")


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    if not message.from_user:
        return
    inline_markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Открыть магазин", url=get_store_url(message.from_user)
                )
            ]
        ]
    )
    reply_markup = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📦 Мои заказы"), KeyboardButton(text="💰 Мой баланс")]
        ],
        resize_keyboard=True,
        input_field_placeholder="Управление:",
    )
    await message.answer(
        f"Привет, {message.from_user.first_name}! 👋\n\nДобро пожаловать в наш магазин.\nЗдесь вы найдете лучшие товары по самым выгодным ценам!",
        reply_markup=reply_markup,
    )
    await message.answer(
        "👇 Нажмите сюда, чтобы перейти к покупкам:", reply_markup=inline_markup
    )


@dp.message(Command("shop"))
async def cmd_shop(message: types.Message):
    if not message.from_user:
        return
    inline_markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Открыть магазин", url=get_store_url(message.from_user)
                )
            ]
        ]
    )
    await message.answer(
        "👇 Нажмите сюда, чтобы перейти к покупкам:", reply_markup=inline_markup
    )


# БАЛАНС И ПОПОЛНЕНИЕ
@dp.message(F.text == "💰 Мой баланс")
async def show_balance(message: types.Message):
    if not message.from_user:
        return

    token = get_token(message.from_user)
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BACKEND_URL}/api/user_data?token={token}") as resp:
            data = await resp.json()
            balance = data.get("balance", 0.0)

    builder = InlineKeyboardBuilder()
    builder.button(text="💳 Пополнить на 20 000 ₽", callback_data="topup")
    await message.answer(
        f"💳 Ваш текущий баланс: <b>{format_price(balance)} ₽</b>",
        reply_markup=builder.as_markup(),
        parse_mode="HTML",
    )


@dp.callback_query(F.data == "topup")
async def process_topup(callback: types.CallbackQuery):
    async with aiohttp.ClientSession() as session:
        # Передаем токен бота как секретный пароль
        headers = {"secret-token": settings.BOT_TOKEN}

        async with session.post(
            f"{BACKEND_URL}/api/users/{callback.from_user.id}/topup", headers=headers
        ) as resp:
            data = await resp.json()
            new_balance = data.get("balance", 0.0)

    if isinstance(callback.message, types.Message):
        builder = InlineKeyboardBuilder()
        builder.button(text="💳 Пополнить на 20 000 ₽", callback_data="topup")
        await callback.message.edit_text(
            f"💳 Ваш текущий баланс: <b>{format_price(new_balance)} ₽</b>\n\n<i>✅ Баланс успешно пополнен!</i>",
            reply_markup=builder.as_markup(),
            parse_mode="HTML",
        )
    await callback.answer("Баланс пополнен на 20 000 ₽!", show_alert=True)


# ЗАКАЗЫ
@dp.message(F.text == "📦 Мои заказы")
async def show_orders(message: types.Message):
    if not message.from_user:
        return

    token = get_token(message.from_user)
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BACKEND_URL}/api/user_data?token={token}") as resp:
            if resp.status != 200:
                return await message.answer("❌ Ошибка сервера.")
            data = await resp.json()
            orders = data.get("orders", [])

    active_orders = [o for o in orders if o["status"] == "new"]
    if not active_orders:
        await message.answer("У вас нет активных заказов 😔")
        return

    for order in active_orders:
        total = sum(
            item["price_at_purchase"] * item["quantity"] for item in order["items"]
        )
        text = (
            f"📦 <b>Заказ #{order['id']}</b>\n📅 Дата: {order['created_at'][:10]}\n"
            f"💰 Сумма: <b>{format_price(total)} ₽</b>\n🟢 Статус: Новый"
        )
        builder = InlineKeyboardBuilder()
        builder.button(text="👁 Состав заказа", callback_data=f"view_{order['id']}")
        builder.button(text="❌ Отменить", callback_data=f"cancel_{order['id']}")
        builder.adjust(1)
        await message.answer(text, reply_markup=builder.as_markup(), parse_mode="HTML")


@dp.callback_query(F.data.startswith("view_"))
async def view_order(callback: types.CallbackQuery):
    if (
        not callback.data
        or not callback.from_user
        or not isinstance(callback.message, types.Message)
    ):
        return
    order_id = callback.data.split("_")[1]

    token = get_token(callback.from_user)
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BACKEND_URL}/api/user_data?token={token}") as resp:
            data = await resp.json()
            orders = data.get("orders", [])

    order = next((o for o in orders if str(o["id"]) == order_id), None)
    if not order:
        return await callback.answer("Заказ не найден", show_alert=True)

    items_text = f"🛒 <b>Состав заказа #{order['id']}</b>:\n\n"
    for item in order["items"]:
        items_text += f"🔹 {item['product']['name']} — {item['quantity']} шт. (по {format_price(item['price_at_purchase'])} ₽)\n"
    await callback.message.answer(items_text, parse_mode="HTML")
    await callback.answer()


@dp.callback_query(F.data.startswith("cancel_"))
async def cancel_order(callback: types.CallbackQuery):
    if not callback.data or not isinstance(callback.message, types.Message):
        return
    order_id = callback.data.split("_")[1]

    token = get_token(callback.from_user)
    async with aiohttp.ClientSession() as session:
        async with session.patch(
            f"{BACKEND_URL}/api/orders/{order_id}/cancel?token={token}"
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                if callback.message.html_text:
                    new_text = callback.message.html_text.replace(
                        "🟢 Статус: Новый", "🔴 Статус: Отменен"
                    )
                    await callback.message.edit_text(
                        new_text, reply_markup=None, parse_mode="HTML"
                    )
                await callback.answer(
                    f"Заказ отменен! Баланс пополнен. Текущий баланс: {format_price(data['new_balance'])} ₽",
                    show_alert=True,
                )
            else:
                await callback.answer("Нельзя отменить этот заказ", show_alert=True)


async def main():
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Главное меню"),
            BotCommand(command="shop", description="Открыть магазин"),
        ]
    )
    print("🤖 Бот успешно запущен!")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
