import asyncio
import logging

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from config import settings

logging.basicConfig(level=logging.INFO)

# НИКАКИХ ПРОКСИ! Бот использует глобальный VPN твоего компьютера
bot = Bot(token=settings.BOT_TOKEN)
dp = Dispatcher()

# СЮДА ВСТАВИМ НОВУЮ ССЫЛКУ
WEBAPP_URL = "https://a53e5ec44ae1f8.lhr.life"


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Открыть магазин", web_app=WebAppInfo(url=WEBAPP_URL)
                )
            ]
        ]
    )

    user_name = message.from_user.first_name if message.from_user else "гость"
    await message.answer(
        f"Привет, {user_name}! 👋\n\nДобро пожаловать в наш магазин.\nНажми на кнопку ниже.",
        reply_markup=markup,
    )


async def main():
    print("🤖 Бот успешно запущен!")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
