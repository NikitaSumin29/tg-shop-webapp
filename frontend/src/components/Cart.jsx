import React from "react";
import ProductImage from "./ProductImage";
import { formatPrice } from "../utils/formatters";

function Cart({
  cartItems,
  onBack,
  onCheckout,
  openProduct,
  updateQuantity,
  removeItem,
  clearCart,
}) {
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return (
    <div className="cart-screen">
      <button className="back-button" onClick={onBack}>
        ← Назад
      </button>

      <div className="cart-header-row">
        <h2>🛒 Ваша корзина</h2>
        {cartItems.length > 0 && (
          <button className="clear-cart-btn" onClick={clearCart}>
            Очистить всё
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <p className="empty-cart">Корзина пуста 😔</p>
      ) : (
        <>
          <div className="cart-list">
            {cartItems.map((item, index) => (
              <div key={index} className="cart-item">
                {/* Клик по картинке или названию открывает товар */}
                <div
                  className="cart-item-main"
                  onClick={() => openProduct(item.product)}
                >
                  <ProductImage
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="cart-item-img"
                  />
                  <div className="cart-item-info">
                    <h4>{item.product.name}</h4>
                    <span className="cart-item-price">
                      {formatPrice(item.product.price)}
                    </span>
                  </div>
                </div>

                {/* Панель управления количеством */}
                <div className="cart-item-controls">
                  <button
                    className="mini-qty-btn"
                    onClick={() => updateQuantity(item.product.id, -1)}
                  >
                    -
                  </button>
                  <span className="mini-qty-number">{item.quantity}</span>
                  <button
                    className="mini-qty-btn"
                    onClick={() => updateQuantity(item.product.id, 1)}
                  >
                    +
                  </button>

                  <button
                    className="remove-item-btn"
                    onClick={() => removeItem(item.product.id)}
                    title="Удалить"
                  >
                    🗑️
                  </button>
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
