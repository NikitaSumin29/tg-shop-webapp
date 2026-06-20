import { useState, useEffect, useRef } from "react";
import Orders from "./components/Orders";
import ProductDetail from "./components/ProductDetail";
import Cart from "./components/Cart";
import ProductImage from "./components/ProductImage";
import { formatPrice } from "./utils/formatters";
import "./App.css";

const tg = window.Telegram?.WebApp;
const API_URL = ""; // <--- ЕДИНЫЙ АДРЕС БЭКЕНДА
const BOT_URL = "https://t.me/sumin_test_shop_bot"; // <--- ЕДИНАЯ ССЫЛКА НА БОТА

function App() {
  // 1. Читаем токен и имя из ссылки
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const name = urlParams.get("name");

  // Состояния
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [currentScreen, setCurrentScreen] = useState("catalog");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // Состояние поиска

  // Глобальные состояния юзера
  const [userBalance, setUserBalance] = useState(0);
  const [globalOrders, setGlobalOrders] = useState([]);
  const previousOrders = useRef([]);

  // Объект юзера (хранит токен для запросов)
  const user = {
    token: token,
    first_name: name ? decodeURIComponent(name) : "Гость",
  };

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Единый опрос сервера: Баланс и Заказы
  const fetchUserData = async () => {
    if (!user.token) return; // Не делаем запрос, если нет токена

    try {
      const res = await fetch(`${API_URL}/api/user_data?token=${user.token}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUserBalance(data.balance);
        setGlobalOrders(data.orders);

        // Проверка отмены из бота
        if (previousOrders.current.length > 0) {
          data.orders.forEach((newOrder) => {
            const oldOrder = previousOrders.current.find(
              (o) => o.id === newOrder.id,
            );
            if (
              oldOrder &&
              oldOrder.status === "new" &&
              newOrder.status === "cancelled"
            ) {
              const total = newOrder.items.reduce(
                (s, i) => s + i.price_at_purchase * i.quantity,
                0,
              );
              showToast(
                "Заказ отменен из бота!",
                `Возврат ${formatPrice(total)}. Ваш баланс: ${formatPrice(data.balance)}`,
              );
            }
          });
        }
        previousOrders.current = data.orders;
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user.token) {
      fetch(`${API_URL}/api/products`)
        .then((res) => res.json())
        .then((data) => {
          setProducts(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Ошибка сети:", err);
          setLoading(false);
        });

      fetchUserData();
      const interval = setInterval(fetchUserData, 3000);
      return () => clearInterval(interval);
    }
  }, [user.token]);

  // ЭКРАН БЛОКИРОВКИ: Если зашли просто из браузера без токена
  if (!user.token) {
    return (
      <div className="access-denied-screen">
        <h2>⚠️ Доступ ограничен</h2>
        <p>
          Для безопасного входа откройте магазин через нашего Telegram-бота.
        </p>
        <a href={BOT_URL} className="tg-link-btn">
          Перейти в бота
        </a>
      </div>
    );
  }

  const openProduct = (product) => {
    setSelectedProduct(product);
    setCurrentScreen("product");
  };

  const goBack = () => {
    setCurrentScreen("catalog");
    setSelectedProduct(null);
  };

  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const exist = prev.find((i) => i.product.id === product.id);
      if (exist)
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      return [...prev, { product, quantity }];
    });
    if (currentScreen === "product") goBack();
  };

  const updateQuantity = (productId, amount) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id === productId) {
          const nQ = i.quantity + amount;
          return nQ > 0 ? { ...i, quantity: nQ } : i;
        }
        return i;
      }),
    );
  };

  const removeItem = (id) =>
    setCart((prev) => prev.filter((i) => i.product.id !== id));

  const clearCart = () => {
    if (window.confirm("Очистить корзину?")) setCart([]);
  };

  const handleCheckout = async () => {
    const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

    if (userBalance < total) {
      showToast(
        "Недостаточно средств!",
        `Сумма: ${formatPrice(total)}. Ваш баланс: ${formatPrice(userBalance)}`,
      );
      return;
    }

    const items = cart.map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity,
    }));

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: user.token, // Отправляем токен!
          first_name: user.first_name,
          items: items,
        }),
      });

      const resData = await response.json();
      if (response.ok) {
        showToast(
          "Заказ оформлен!",
          `Списано ${formatPrice(total)}. Остаток: ${formatPrice(resData.new_balance)}`,
        );
        setCart([]);
        fetchUserData();
        goBack();
      } else {
        if (resData.detail?.msg === "insufficient_funds") {
          showToast(
            "Ошибка",
            `Недостаточно средств. Баланс: ${formatPrice(resData.detail.balance)}`,
          );
        } else {
          showToast("Ошибка", "Сбой при оформлении заказа.");
        }
      }
    } catch (error) {
      showToast("Ошибка", "Нет связи с сервером.");
    }
  };

  const activeOrdersCount = globalOrders.filter(
    (o) => o.status === "new",
  ).length;
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartItemsCount = cart.reduce((s, i) => s + i.quantity, 0);
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="app-container">
      {/* Профиль с БАЛАНСОМ виден везде! */}
      <div className="user-profile-corner">
        <div className="user-avatar">{user.first_name.charAt(0)}</div>
        <div className="user-info-col">
          <span className="user-name">{user.first_name}</span>
          <span className="user-balance">{formatPrice(userBalance)}</span>
        </div>
      </div>

      {currentScreen === "catalog" && (
        <>
          <header className="header">
            <a
              href={BOT_URL}
              className="back-to-bot-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              🤖 Вернуться в чат с ботом
            </a>
            <h1>🛍️ E-commerce Store</h1>
            <div
              className="cart-summary"
              onClick={() => setCurrentScreen("cart")}
              style={{ cursor: "pointer" }}
            >
              <span>
                🛒 В корзине: <b>{cartItemsCount}</b> шт.
              </span>
              {cartItemsCount > 0 && (
                <span className="cart-total">({formatPrice(cartTotal)})</span>
              )}
            </div>

            <button
              className="orders-link-btn"
              onClick={() => setCurrentScreen("orders")}
            >
              📦 Мои заказы {activeOrdersCount > 0 ? activeOrdersCount : ""}
            </button>

            <div className="search-bar">
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="clear-search"
                  onClick={() => setSearchQuery("")}
                >
                  ✖
                </button>
              )}
            </div>
          </header>

          <main className="main-content">
            {loading ? (
              <p className="loading-text">Загрузка...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="empty-cart">Товары не найдены</p>
            ) : (
              <div className="products-grid">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="product-card"
                    onClick={() => openProduct(product)}
                  >
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      className="product-image"
                    />

                    <div className="product-info">
                      <h2 className="product-title">{product.name}</h2>
                      <div className="product-footer">
                        <span className="product-price">
                          {formatPrice(product.price)}
                        </span>
                        <button
                          className="add-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                          }}
                        >
                          В корзину
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {currentScreen === "product" && (
        <ProductDetail
          product={selectedProduct}
          onBack={goBack}
          onAddToCart={addToCart}
        />
      )}

      {currentScreen === "cart" && (
        <Cart
          cartItems={cart}
          onBack={goBack}
          onCheckout={handleCheckout}
          openProduct={openProduct}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          clearCart={clearCart}
        />
      )}

      {currentScreen === "orders" && (
        <Orders
          onBack={goBack}
          openProduct={openProduct}
          globalOrders={globalOrders}
          fetchUserData={fetchUserData}
          showToast={showToast}
          user={user}
          API_URL={API_URL}
        />
      )}

      {toast && (
        <div className="toast-notification">
          <h4>{toast.title}</h4>
          <p>{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default App;
