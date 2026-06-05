// frontend/src/utils/formatters.js
// Форматирует число в денежный формат (например: 500.00 ₽)

export const formatPrice = (price) => {
  // Проверка на случай, если price придет как undefined
  if (typeof price !== "number") return "0.00 ₽";
  return price.toFixed(2) + " ₽";
};
