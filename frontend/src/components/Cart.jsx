import React from "react";
import ProductImage from "./ProductImage";
import { formatPrice } from "../utils/formatters";

function Cart({ cartItems, onBack, onCheckout }) {
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="cart-screen">
      <button className="back-button" onClick={onBack}>
        ← Назад в каталог
      </button>

      <h2>🛒 Ваша корзина</h2>

      {cartItems.length === 0 ? (
        <p className="empty-cart">Корзина пуста 😔</p>
      ) : (
        <>
          <div className="cart-list">
            {cartItems.map((item, index) => (
              <div key={index} className="cart-item">
                <ProductImage
                  src={item.image_url}
                  alt={item.name}
                  className="cart-item-img"
                />
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <span>{formatPrice(item.price)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-footer">
            <h3>Итого: {formatPrice(totalPrice)}</h3>
            <button className="checkout-button" onClick={onCheckout}>
              Оформить заказ
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
