import { useState, useEffect } from "react";
import Orders from "./components/Orders";
import ProductDetail from "./components/ProductDetail";
import Cart from "./components/Cart";
import ProductImage from "./components/ProductImage";
import { formatPrice } from "./utils/formatters";
import "./App.css";

const tg = window.Telegram.WebApp;

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [currentScreen, setCurrentScreen] = useState("catalog");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState(null); // НОВОЕ СОСТОЯНИЕ ДЛЯ ОКНА

  // Функция для показа уведомления на 3 секунды
  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOrdersCount = () => {
    const user = tg.initDataUnsafe?.user || { id: 111111 };
    fetch(`http://127.0.0.1:8000/api/orders/${user.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        // Считаем только те заказы, которые не отменены
        const active = data.filter((o) => o.status === "new").length;
        setActiveOrdersCount(active);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    tg.ready();
    fetch("http://127.0.0.1:8000/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка сети:", err);
        setLoading(false);
      });
    fetchOrdersCount(); // Запрашиваем количество при входе
  }, []);

  useEffect(() => {
    if (currentScreen === "catalog") {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
      tg.BackButton.onClick(goBack);
    }
  }, [currentScreen]);

  const openProduct = (product) => {
    setSelectedProduct(product);
    setCurrentScreen("product");
  };

  const goBack = () => {
    setCurrentScreen("catalog");
    setSelectedProduct(null);
    fetchOrdersCount();
  };

  const addToCart = (product) => {
    setCart((prevCart) => [...prevCart, product]); // Лучшая практика работы с состоянием
    if (currentScreen === "product") goBack();
  };

  const handleCheckout = async () => {
    const items = cart.map((item) => ({ product_id: item.id, quantity: 1 }));
    const user = tg.initDataUnsafe?.user || {
      id: 111111,
      first_name: "Тестовый Покупатель",
      username: "test_buyer",
    };
    const orderData = {
      tg_id: user.id,
      first_name: user.first_name,
      username: user.username,
      items: items,
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        showToast("Успешно!", "Новый заказ добавлен."); // Наше белое окно
        setCart([]); // Очищаем корзину
        fetchOrdersCount();
        goBack(); // Возвращаемся в каталог
      } else {
        showToast("Ошибка", "Попробуйте позже.");
      }
    } catch (error) {
      showToast("Ошибка", "Нет связи с сервером.");
    }
  };

  // Вычисляем сумму корзины один раз
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="app-container">
      {currentScreen === "catalog" && (
        <>
          <header className="header">
            <h1>🛍️ TG Mini Shop</h1>
            <div
              className="cart-summary"
              onClick={() => setCurrentScreen("cart")}
              style={{ cursor: "pointer" }}
            >
              <span>
                🛒 В корзине: <b>{cart.length}</b> шт.
              </span>
              {cart.length > 0 && (
                <span className="cart-total">({formatPrice(cartTotal)})</span>
              )}
            </div>
            <button
              className="orders-link-btn"
              onClick={() => setCurrentScreen("orders")}
            >
              📦 Мои заказы {activeOrdersCount > 0 ? activeOrdersCount : ""}
            </button>
          </header>

          <main className="main-content">
            {loading ? (
              <p className="loading-text">Загрузка...</p>
            ) : (
              <div className="products-grid">
                {products.map((product) => (
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
                        {/* Используем форматер цены! */}
                        <span className="product-price">
                          {formatPrice(product.price)}
                        </span>
                        <button
                          className="add-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
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
      {currentScreen === "product" && selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onBack={goBack}
          onAddToCart={addToCart}
        />
      )}
      {currentScreen === "cart" && (
        <Cart cartItems={cart} onBack={goBack} onCheckout={handleCheckout} />
      )}
      {currentScreen === "orders" && <Orders onBack={goBack} />}{" "}
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
