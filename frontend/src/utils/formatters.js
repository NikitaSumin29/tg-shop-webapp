export const formatPrice = (price) => {
  if (typeof price !== "number") return "0.00 ₽";
  // toLocaleString сама расставит пробелы: 4 000.00
  return (
    price.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " ₽"
  );
};
