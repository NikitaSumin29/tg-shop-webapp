import { useState, useEffect } from "react";
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
  const [currentScreen, setCurrentScreen] = useState("catalog");
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    tg.ready();
    fetch("http://127.0.0.1:8000/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => console.error("Ошибка сети:", err));
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
  };

  const addToCart = (product) => {
    setCart((prevCart) => [...prevCart, product]); // Лучшая практика работы с состоянием
    if (currentScreen === "product") goBack();
  };

  const handleCheckout = () => {
    const total = cart.reduce((s, i) => s + i.price, 0);
    alert(`Заказ на сумму ${formatPrice(total)} отправлен на сервер!`);
    setCart([]);
    goBack();
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
    </div>
  );
}

export default App;
