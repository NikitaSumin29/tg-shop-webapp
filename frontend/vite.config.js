import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Разрешаем Vite принимать запросы через любые туннели (Pinggy, Cloudflare и т.д.)
    allowedHosts: true,
  },
});
