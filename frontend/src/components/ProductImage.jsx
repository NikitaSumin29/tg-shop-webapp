// frontend/src/components/ProductImage.jsx
import React from "react";

export default function ProductImage({ src, alt, className }) {
  const fallbackImage = "/no-image.svg";

  return (
    <img
      src={src || fallbackImage}
      alt={alt}
      className={className}
      onError={(e) => {
        e.target.onerror = null; // Защита от бесконечного цикла
        e.target.src = fallbackImage;
      }}
    />
  );
}
