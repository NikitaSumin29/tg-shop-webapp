from contextlib import asynccontextmanager
from typing import List

import models
import schemas
from database import Base, engine, get_db
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
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


# 1. МЕТОД ДЛЯ ПОЛУЧЕНИЯ ВСЕХ ТОВАРОВ
@app.get("/api/products", response_model=List[schemas.ProductResponse])
async def get_products(db: AsyncSession = Depends(get_db)):
    # Делаем SQL запрос: SELECT * FROM products WHERE is_active = True
    result = await db.execute(
        select(models.Product).where(models.Product.is_active == True)
    )
    products = result.scalars().all()
    return products


# 2. МЕТОД ДЛЯ ДОБАВЛЕНИЯ ТОВАРА (пока без админки, чисто для тестов)
@app.post("/api/products", response_model=schemas.ProductResponse)
async def create_product(
    product: schemas.ProductCreate, db: AsyncSession = Depends(get_db)
):
    # Создаем объект модели SQLAlchemy
    db_product = models.Product(**product.model_dump())
    # Добавляем в базу
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product
