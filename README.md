# Эволюция доверия — Telegram Mini App

Порт интерактивной игры по теории игр **«The Evolution of Trust»** (Nicky Case, 2017) в Telegram как Mini App.

> Оригинал: <https://ncase.me/trust/> · русский перевод: <https://notdotteam.github.io/trust/>
> Игра, музыка и звуки — **CC0 / public domain**. Этот порт распространяется на тех же условиях.

## Стек
- **Фронтенд (`webapp/`)** — оригинальная игра as-is: vanilla JS, PixiJS, Howler.js, TweenJS. Сверху — тонкий Telegram-слой (`js/telegram/`, `telegram-web-app.js`).
- **Бэкенд (`backend/`)** — Python 3.12 · aiogram 3 (бот) · FastAPI + PostgreSQL (лидерборд — со Stage 4).

## Структура
| Каталог | Назначение |
|---|---|
| `webapp/` | игра (движок `js/{lib,core,sims,slides}`) + `js/telegram/` (наш слой) |
| `backend/` | aiogram-бот (+ API/БД на следующих этапах) |
| `docs/` | ТЗ, карта кода, план портирования, история (`LOG.md`) |
| `.claude/` | pipeline разработки (агенты / команды / git-guard) |

## Быстрый старт (dev)
```bash
# фронт — нужен HTTPS для Telegram (хостинг или туннель)
cd webapp && python3 -m http.server 8080
# бот
cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
# .env (в корне): BOT_TOKEN=... · WEBAPP_URL=https://...
.venv/bin/python -m app.bot.main
```

## Этапы
- [x] **Stage 1** — каркас: игра открывается в Telegram + бот `/start`.
- [ ] **Stage 2** — RU/EN-переключатель, тема Telegram, хаптика, viewport-fit.
- [ ] **Stage 3** — сохранение прогресса (CloudStorage).
- [ ] **Stage 4** — лидерборд + валидация initData.
- [ ] **Stage 5** — share + кроссплатформенный полиш + деплой.

Полное ТЗ — [`docs/TZ-trust-tma-v1.0.md`](docs/TZ-trust-tma-v1.0.md).
