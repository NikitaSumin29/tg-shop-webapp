import React, { useState } from "react";
import ProductImage from "./ProductImage";
import { formatPrice } from "../utils/formatters";

function ProductDetail({ product, onBack, onAddToCart }) {
  // НОВОЕ: Локальное состояние для выбора количества
  const [quantity, setQuantity] = useState(1);

  const handleDecrease = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  const handleIncrease = () => {
    setQuantity((q) => q + 1);
  };

  return (
    <div className="product-detail-screen">
      <button className="back-button" onClick={onBack}>
        ← Назад
      </button>

      <ProductImage
        src={product.image_url}
        alt={product.name}
        className="detail-image"
      />

      <div className="detail-info">
        <h2>{product.name}</h2>
        <p className="detail-price">{formatPrice(product.price * quantity)}</p>

        <div className="detail-section">
          <h3>Описание</h3>
          <p>{product.description}</p>
        </div>

        {/* Выбор количества */}
        <div className="quantity-selector">
          <button className="qty-btn" onClick={handleDecrease}>
            -
          </button>
          <span className="qty-number">{quantity}</span>
          <button className="qty-btn" onClick={handleIncrease}>
            +
          </button>
        </div>

        <button
          className="add-button large"
          onClick={() => onAddToCart(product, quantity)}
        >
          Добавить в корзину
        </button>
      </div>
    </div>
  );
}

export default ProductDetail;
