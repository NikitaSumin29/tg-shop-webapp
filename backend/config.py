from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Эта переменная автоматически подтянется из файла .env
    DATABASE_URL: str
    BOT_TOKEN: str

    # Говорим искать файл .env на уровень выше (в корне проекта)
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


# Создаем объект настроек, чтобы импортировать его в другие файлы
settings = Settings()  # type: ignore
