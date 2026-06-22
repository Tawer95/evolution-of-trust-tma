from aiogram.types import InlineKeyboardMarkup, WebAppInfo

from app.bot.keyboards import start_kb
from app.bot.main import build_dispatcher


def test_start_kb_has_webapp_button() -> None:
    url = "https://example.com/app"
    kb = start_kb(url)
    assert isinstance(kb, InlineKeyboardMarkup)
    button = kb.inline_keyboard[0][0]
    assert isinstance(button.web_app, WebAppInfo)
    assert button.web_app.url == url


def test_build_dispatcher_registers_start_router() -> None:
    dp = build_dispatcher()
    assert dp is not None
