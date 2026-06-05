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
