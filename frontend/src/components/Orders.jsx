import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatters";

export default function Orders({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Достаем ID юзера (или фейк для браузера)
  const tg = window.Telegram.WebApp;
  const tg_id = tg.initDataUnsafe?.user?.id || 111111;

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/orders/${tg_id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [tg_id]);

  const cancelOrder = async (orderId) => {
    // Нативное ТГ-подтверждение (если не сработает в браузере - используем обычный confirm)
    if (!window.confirm("Вы уверены, что хотите отменить заказ?")) return;

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/orders/${orderId}/cancel`,
        {
          method: "PATCH",
        },
      );

      if (res.ok) {
        // Локально обновляем статус в интерфейсе, чтобы не делать новый запрос к БД
        setOrders(
          orders.map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" } : o,
          ),
        );
        tg.showAlert("Заказ успешно отменен.");
      } else {
        tg.showAlert("Не удалось отменить заказ.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="orders-screen">
      <button className="back-button" onClick={onBack}>
        ← Назад в каталог
      </button>
      <h2>📦 Мои заказы</h2>

      {loading ? (
        <p className="loading-text">Загружаем историю...</p>
      ) : orders.length === 0 ? (
        <p className="empty-cart">У вас еще нет заказов.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            // Считаем сумму заказа
            const orderTotal = order.items.reduce(
              (sum, item) => sum + item.price_at_purchase * item.quantity,
              0,
            );

            return (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <span className="order-number">Заказ #{order.id}</span>
                  <span className={`order-status ${order.status}`}>
                    {order.status === "new"
                      ? "🟢 Новый"
                      : order.status === "cancelled"
                        ? "🔴 Отменен"
                        : order.status}
                  </span>
                </div>

                <div className="order-details">
                  <p>
                    Дата:{" "}
                    {new Date(order.created_at).toLocaleDateString("ru-RU")}
                  </p>
                  <p>Товаров: {order.items.length} шт.</p>
                  <p className="order-total-price">
                    Сумма: {formatPrice(orderTotal)}
                  </p>
                </div>

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
