# Этап 1: Сборка React
FROM node:22-alpine AS builder
WORKDIR /app

# Говорим pnpm, что мы собираем в автоматическом режиме
ENV CI=true

# Включаем pnpm
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Копируем исходный код (теперь БЕЗ node_modules благодаря .dockerignore)
COPY . .
RUN pnpm run build

# Этап 2: Запуск через Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
