import React, { useState } from "react";
import { formatPrice } from "../utils/formatters";
import ProductImage from "./ProductImage";

export default function Orders({
  onBack,
  openProduct,
  globalOrders,
  fetchUserData,
  showToast,
  user,
  API_URL,
}) {
  const [expandedOrders, setExpandedOrders] = useState({});
  const [activeTab, setActiveTab] = useState("current");

  const toggleOrder = (orderId) =>
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));

  const cancelOrder = async (orderId) => {
    if (
      !window.confirm(
        "Вы уверены, что хотите отменить заказ? (Средства вернутся на баланс)",
      )
    )
      return;

    try {
      // ПЕРЕДАЕМ ТОКЕН В ССЫЛКЕ
      const res = await fetch(
        `${API_URL}/api/orders/${orderId}/cancel?token=${user.token}`,
        {
          method: "PATCH",
        },
      );

      if (res.ok) {
        const data = await res.json();
        showToast(
          "Заказ отменен",
          `Сумма ${formatPrice(data.refunded)} возвращена. Баланс: ${formatPrice(data.new_balance)}`,
        );
        fetchUserData(); // Обновляем глобальные заказы
      } else {
        alert("Не удалось отменить заказ.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders =
    activeTab === "current"
      ? globalOrders.filter((o) => o.status === "new")
      : globalOrders.filter((o) => o.status === "cancelled");

  return (
    <div className="orders-screen">
      <button className="back-button" onClick={onBack}>
        ← Назад в каталог
      </button>
      <div className="orders-header-row">
        <h2>📦 Мои заказы</h2>
      </div>

      <div className="orders-tabs">
        <button
          className={`tab-btn ${activeTab === "current" ? "active" : ""}`}
          onClick={() => setActiveTab("current")}
        >
          Текущие
        </button>
        <button
          className={`tab-btn ${activeTab === "cancelled" ? "active" : ""}`}
          onClick={() => setActiveTab("cancelled")}
        >
          Отмененные
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="empty-cart">В этом разделе пока пусто 😔</p>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const orderTotal = order.items.reduce(
              (sum, item) => sum + item.price_at_purchase * item.quantity,
              0,
            );
            const isExpanded = expandedOrders[order.id];

            return (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <span className="order-number">Заказ #{order.id}</span>
                  <span className={`order-status ${order.status}`}>
                    {order.status === "new" ? "🟢 Новый" : "🔴 Отменен"}
                  </span>
                </div>

                <div className="order-details">
                  <p>
                    Дата:{" "}
                    {new Date(order.created_at).toLocaleDateString("ru-RU")}
                  </p>
                  <p className="order-total-price">
                    Сумма: {formatPrice(orderTotal)}
                  </p>
                </div>

                <div
                  className="expand-toggle"
                  onClick={() => toggleOrder(order.id)}
                >
                  <span>{order.items.length} товара(ов)</span>
                  <span className="expand-arrow">{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && (
                  <div className="order-items-preview">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="order-item-row"
                        onClick={() => openProduct(item.product)}
                      >
                        <ProductImage
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="order-item-mini-img"
                        />
                        <div className="order-item-mini-info">
                          <span className="name">{item.product.name}</span>
                          <span className="price">
                            {formatPrice(item.price_at_purchase)}
                            <span className="item-qty-text">
                              {" "}
                              x {item.quantity} шт.
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {order.status === "new" && (
                  <button
                    className="cancel-button"
                    onClick={() => cancelOrder(order.id)}
                  >
                    Отменить заказ
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
