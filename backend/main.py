from contextlib import asynccontextmanager

import models  # Обязательно импортируем, чтобы SQLAlchemy увидела таблицы  # noqa: F401
from database import Base, engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# Этот код срабатывает один раз при запуске сервера
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        # Создаем таблицы в PostgreSQL
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Telegram Shop API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Бэкенд работает, Postgres подключен!"}
