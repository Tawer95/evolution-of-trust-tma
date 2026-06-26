import asyncio
import logging

from aiogram import Bot, Dispatcher

from app.bot.handlers import start_router
from app.core.config import get_settings


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.include_router(start_router)
    return dp


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    logging.getLogger("bot").info("WEBAPP_URL = %s", settings.webapp_url)  # видно, какой URL уйдёт в кнопку
    bot = Bot(token=settings.bot_token)
    dp = build_dispatcher()
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
