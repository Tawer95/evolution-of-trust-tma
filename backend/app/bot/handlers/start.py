from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from app.bot.keyboards import start_kb
from app.core.config import get_settings

router = Router(name="start")

WELCOME = (
    "Это интерактивная игра про доверие — почему мы доверяем друг другу "
    "и как доверие выживает.\n\nНажми «Играть», чтобы открыть."
)


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    settings = get_settings()
    await message.answer(WELCOME, reply_markup=start_kb(settings.webapp_url))
