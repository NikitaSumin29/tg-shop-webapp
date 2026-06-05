import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // НОВОЕ: Состояние для корзины (массив добавленных товаров)
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/products")
      .then((response) => response.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Ошибка при загрузке:", error);
        setLoading(false);
      });
  }, []);

  // НОВОЕ: Функция добавления в корзину
  const addToCart = (product) => {
    setCart([...cart, product]);
    // В реальном проекте тут можно добавить всплывающее уведомление (Toast)
  };

  // НОВОЕ: Вычисляем общую сумму корзины
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="app-container">
      <header className="header">
        <h1>🛍️ TG Mini Shop</h1>

        {/* НОВОЕ: Блок с информацией о корзине */}
        <div className="cart-summary">
          <span>
            🛒 В корзине: <b>{cart.length}</b> шт.
          </span>
          {cart.length > 0 && (
            <span className="cart-total">
              {" "}
              (Сумма: {totalPrice.toFixed(2)} ₽)
            </span>
          )}
        </div>
      </header>

      <main className="main-content">
        {loading ? (
          <p className="loading-text">Загрузка товаров...</p>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <img
                  src={
                    product.image_url ||
                    "https://placehold.co/400x400/eeeeee/999999?text=No+Image"
                  }
                  alt={product.name}
                  className="product-image"
                />
                <div className="product-info">
                  <h2 className="product-title">{product.name}</h2>
                  <p className="product-desc">{product.description}</p>
                  <div className="product-footer">
                    <span className="product-price">{product.price.toFixed(2)} ₽</span>
                    {/* НОВОЕ: Вешаем обработчик клика на кнопку */}
                    <button
                      className="add-button"
                      onClick={() => addToCart(product)}
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
    </div>
  );
}

export default App;
