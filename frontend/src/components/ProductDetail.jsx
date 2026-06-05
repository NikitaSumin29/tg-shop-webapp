import React from "react";
import ProductImage from "./ProductImage";
import { formatPrice } from "../utils/formatters";

function ProductDetail({ product, onBack, onAddToCart }) {
  return (
    <div className="product-detail-screen">
      {/* Кнопка назад для браузера (в самом ТГ будет нативная) */}
      <button className="back-button" onClick={onBack}>
        ← Назад в каталог
      </button>

      <ProductImage
        src={product.image_url}
        alt={product.name}
        className="detail-image"
      />

      <div className="detail-info">
        <h2>{product.name}</h2>
        <p className="detail-price">{formatPrice(product.price)}</p>

        <div className="detail-section">
          <h3>Описание</h3>
          <p>{product.description}</p>
        </div>

        {/* Заглушка для характеристик (для красоты в портфолио) */}
        <div className="detail-section">
          <h3>Характеристики</h3>
          <ul className="detail-specs">
            <li>
              <b>Состояние:</b> Новое
            </li>
            <li>
              <b>Доставка:</b> По всей РФ
            </li>
            <li>
              <b>Гарантия:</b> 1 год
            </li>
          </ul>
        </div>

        <button
          className="add-button large"
          onClick={() => onAddToCart(product)}
        >
          Добавить в корзину
        </button>
      </div>
    </div>
  );
}

export default ProductDetail;
