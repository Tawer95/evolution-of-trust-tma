# Discovery — Stage 1: Каркас (Telegram WebApp + скелет бота)

**Дата:** 2026-06-22 · **Slug:** stage-1-karkas

## Задача
Поднять рабочий каркас TMA: скопировать игру в `webapp/`, подключить Telegram WebApp SDK + тонкий `init.js` (`ready()`/`expand()`), поднять локальный статик-сервер, написать минимальный aiogram-бот `/start` → inline-кнопка запуска Mini App. Цель этапа — игра **открывается и проходится внутри Telegram** (desktop + mobile через HTTPS-туннель).

## Фронт (webapp)
- **COPY** `reference-code/ncase-trust/*` → `webapp/` (вся игра as-is; движок `js/lib|core|sims|slides` не трогаем). [verified: `docs/CODE-MAP.md`]
- **ADAPT** `webapp/index.html`: `telegram-web-app.js` в `<head>` (до игрового кода — иначе `Telegram.WebApp` undefined к `window.onload`); `js/telegram/init.js` — ПОСЛЕ `main.js` (нужны `slideshow`/`publish`). [verified: CODE-MAP §1 порядок script-тегов, §9 webview-риск `window.onload`]
- **CREATE** `webapp/js/telegram/init.js`: `TG.wa = Telegram.WebApp; ready(); expand();` (+ guard `if (window.Telegram && Telegram.WebApp)`).
- Движок НЕ правим. RU/EN, тема, хаптика, save — следующие этапы.

## Бэк (backend)
- **CREATE** минимальный aiogram-бот: `app/bot/main.py` (Bot, Dispatcher, include start-router, long polling, graceful shutdown), `app/bot/handlers/start.py` (`cmd_start` → приветствие + inline-кнопка), `app/bot/keyboards.py`, `app/core/config.py` (pydantic-settings: `BOT_TOKEN`, `WEBAPP_URL`), `pyproject.toml` (aiogram 3, pydantic-settings, ruff, pyright, pytest).
- Кнопка: `InlineKeyboardButton(text="Играть", web_app=WebAppInfo(url=settings.WEBAPP_URL))`. **[НЕ ВЕРИФИЦИРОВАНО]** — точные имена/импорты aiogram 3 (`WebAppInfo`, `web_app=`) сверить с `docs.aiogram.dev` ДО реализации (workflow-проверка упала на 529).

## БД
— (в Stage 1 нет; появляется в Stage 4). Docker не нужен на этом этапе.

## Telegram-платформа
- SDK `https://telegram.org/js/telegram-web-app.js`. Методы `ready()`, `expand()` — стабильные, низкий риск. **[from-knowledge — NEEDS-VERIFY]** при реализации сверить с `core.telegram.org/bots/webapps`.
- На боте: `WebAppInfo(url=...)` в inline-кнопке; `WEBAPP_URL` обязан быть `https://`.
- initData / CloudStorage / theme / haptics — НЕ в этом этапе.

## i18n
Не затрагивается в Stage 1. При COPY игра несёт оригинальный `words.html` (англ). Разнесение на `words.en.html`/`words.ru.html` + переключатель — Stage 2.

## Integrity-path
**Не затрагивается** (нет initData-auth, лидерборда, save в Stage 1). Появляется с Stage 3 (save) и Stage 4 (initData/лидерборд).

## Референс (COPY / ADAPT / CREATE / SKIP)
| Источник | → Назначение | Действие |
|---|---|---|
| `reference-code/ncase-trust/*` | `webapp/` | COPY |
| `webapp/index.html` | — | ADAPT (SDK + init.js + viewport meta) |
| — | `webapp/js/telegram/init.js` | CREATE |
| — | `backend/app/{bot,core}` + `pyproject.toml` | CREATE |

## Runtime-окружение
`BOT_TOKEN` (в `.env`, есть). `WEBAPP_URL` — HTTPS-туннель cloudflared (DNS-фикс `1.1.1.1`/VPN на стороне юзера; quick-tunnel URL эфемерный) ИЛИ хостинг с доменом. Локально: `python3 -m http.server 8080` для `webapp/`. Docker — не нужен.

## Затронутые файлы
- `webapp/*` (COPY), `webapp/index.html` (ADAPT), `webapp/js/telegram/init.js` (CREATE).
- `backend/pyproject.toml`, `backend/app/core/config.py`, `backend/app/bot/{main.py,keyboards.py,handlers/start.py}` (CREATE).
- `docs/manual-tests/stage-1.md` (CREATE).

## Открытые вопросы для plan-фазы
1. **Текст приветствия/кнопки бота** (RU) — дефолт: кнопка «Играть», приветствие в 1–2 строки. → Дефолт в плане.
2. **Backend layout сейчас** — заложить структуру из CLAUDE.md (`app/bot`, `app/core`; `api/db/services` достроятся в Stage 4) vs плоско. → Дефолт: сразу слоистую (меньше переделок на Stage 4).
3. **words.html в Stage 1** — оставить оригинальный `words.html` как есть (разнести в Stage 2) vs сразу `words.en.html`. → Дефолт: оставить `words.html` (минимум правок движка сейчас).
4. **aiogram-API** — `[НЕ ВЕРИФИЦИРОВАНО]`: подтвердить `WebAppInfo`/`web_app=` по `docs.aiogram.dev` перед /implement.

**Следующий шаг:** `/plan stage-1-karkas`.
