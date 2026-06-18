import datetime

from database import Base
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tg_id = Column(BigInteger, unique=True, index=True)  # ID пользователя в Telegram
    username = Column(String, nullable=True)
    balance = Column(Float, default=0.0)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    image_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # Ссылка на покупателя
    status = Column(String, default="new")  # Статус (new, shipped, delivered)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.UTC)
    )

    # Связь с таблицей товаров в заказе
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)

    # ДЛЯ 3НФ: Мы сохраняем цену на момент покупки,
    # чтобы она не зависела от текущей цены в таблице products
    price_at_purchase = Column(Float)

    order = relationship("Order", back_populates="items")
    # Связываем позицию в заказе с конкретным товаром
    product = relationship("Product")
