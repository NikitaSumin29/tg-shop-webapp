from config import settings
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Подключаемся к PostgreSQL через ссылку из .env
engine = create_async_engine(settings.DATABASE_URL, echo=True)

# Фабрика сессий для работы с БД
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


# Базовый класс для всех наших таблиц
class Base(DeclarativeBase):
    pass
