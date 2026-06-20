FROM python:3.13-slim
WORKDIR /app

# Устанавливаем uv
RUN pip install uv

# Копируем файл зависимостей
COPY pyproject.toml .

# Устанавливаем пакеты в систему
RUN uv pip install --system .

# Копируем весь код бэкенда
COPY . .
