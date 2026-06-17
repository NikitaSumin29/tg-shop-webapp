from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# Схема для ДОБАВЛЕНИЯ нового товара
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    is_active: bool = True


# Схема для ОТВЕТА (когда мы запрашиваем список товаров)
class ProductResponse(ProductCreate):
    id: int  # В ответе всегда будет ID из базы данных

    class Config:
        from_attributes = True


# 1. Что React пришлет для каждого товара в корзине
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = 1


# 2. Что React пришлет при нажатии "Оформить заказ"
class OrderCreate(BaseModel):
    tg_id: int
    first_name: str
    username: Optional[str] = None
    items: list[OrderItemCreate]


# 3. Схемы для возврата истории заказов на фронтенд
class OrderItemResponse(BaseModel):
    product_id: int
    quantity: int
    price_at_purchase: float

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    status: str
    created_at: datetime
    items: list[OrderItemResponse]

    class Config:
        from_attributes = True
