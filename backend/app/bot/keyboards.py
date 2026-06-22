from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo


def start_kb(webapp_url: str) -> InlineKeyboardMarkup:
    button = InlineKeyboardButton(text="Играть", web_app=WebAppInfo(url=webapp_url))
    return InlineKeyboardMarkup(inline_keyboard=[[button]])
