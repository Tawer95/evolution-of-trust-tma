from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # .env лежит в корне проекта; бот запускается из backend/, поэтому ищем и там, и тут.
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    bot_token: str
    webapp_url: str  # обязателен: пустой URL → кнопка не откроет Mini App (fail-fast при старте)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # значения берутся из env/.env
