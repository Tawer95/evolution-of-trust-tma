# План — Stage 1: Каркас (Telegram WebApp + скелет бота)

**Дата:** 2026-06-22 · **Slug:** stage-1-karkas · **Ветка (план):** `feat/stage-1-karkas`

## Понимание задачи (intent-check)
Сделать так, чтобы игра «Эволюция доверия» открывалась и проходилась **внутри Telegram** как Mini App, запускаясь из бота. Без новых фич игры — чистый каркас: копия игры + Telegram WebApp SDK + минимальный бот с кнопкой. **Критерий приёмки:** `/start` в Telegram → кнопка «Играть» → Mini App грузится, PixiJS рендерит, звук по тапу PLAY, слайды листаются; на desktop и mobile.

## Дефолты (approve плана = approve дефолтов)
- **D1.** Текст бота: приветствие «Это интерактивная игра про доверие. Нажми, чтобы играть.» + кнопка «Играть». Меняется тривиально.
- **D2.** Backend — слоистая структура из CLAUDE.md (`app/bot`, `app/core`); `app/api|db|services` достроятся в Stage 4.
- **D3.** `words.html` остаётся как есть (оригинальный англ.); разнесение на `words.en/ru.html` — Stage 2 (минимум правок движка сейчас).
- **D4.** Бот — long polling (не webhook); webhook — при деплое (Stage 5).
- **D5.** Docker/Postgres не поднимаем (нет БД до Stage 4).

## Baseline (заполняется на /branch)
- `BASE_SHA: <git rev-parse HEAD>`
- `BASE_TESTS: 0 (backend ещё нет — создаётся в этом этапе)`

## Pre-flight (ОБЯЗАТЕЛЬНО до Implement)
- **Сверить aiogram 3 API** `[НЕ ВЕРИФИЦИРОВАНО]`: `WebAppInfo`, `InlineKeyboardButton(web_app=...)`, минимальный Dispatcher/polling — по `docs.aiogram.dev` (workflow-verify упал на 529). Без подтверждения — не пишем код бота.
- Опц. сверить `Telegram.WebApp.ready()/expand()` по `core.telegram.org/bots/webapps`.

## Шаги (atomic; per-step проверка обязательна)

**[1] COPY игры в webapp/**
- Слой: frontend. Файлы: `cp -R reference-code/ncase-trust/* webapp/` (без `.git`).
- Проверка: `ls webapp/index.html webapp/js/main.js && ls webapp/js/core | wc -l` (=12) `&& ls webapp/assets`.
- Риск: затащить `.git` форка → исключить. Откат: `rm -rf webapp`.

**[2] ADAPT webapp/index.html**
- Слой: frontend. Файлы: `webapp/index.html`.
- Изменения: `telegram-web-app.js` в `<head>`; `<script src="js/telegram/init.js">` ПОСЛЕ `main.js`; viewport meta (`width=device-width, initial-scale=1, viewport-fit=cover`).
- Проверка: `grep -c "telegram-web-app.js" webapp/index.html` (=1) `&& grep -n "js/telegram/init.js" webapp/index.html` (после строки с `main.js`).
- Риск: порядок тегов сломает движок (CODE-MAP §1). Откат: git revert файла.

**[3] CREATE webapp/js/telegram/init.js**
- Слой: frontend. Файлы: `webapp/js/telegram/init.js`.
- Содержимое: guard `if (window.Telegram && window.Telegram.WebApp)`, `TG.wa.ready()`, `TG.wa.expand()`.
- Проверка: `grep -E "ready\(\)|expand\(\)" webapp/js/telegram/init.js`; открыть `http://localhost:8080` в браузере — игра грузится без JS-ошибок (guard не падает вне Telegram).
- Риск: падение вне Telegram → guard. Откат: удалить файл + строку из index.

**[4] CREATE backend skeleton**
- Слой: backend. Файлы: `backend/pyproject.toml`, `backend/app/core/config.py`, `backend/app/bot/{main.py,keyboards.py,handlers/start.py,handlers/__init__.py}`.
- `config.py`: pydantic-settings (`BOT_TOKEN`, `WEBAPP_URL`), `get_settings()` lru_cache. `keyboards.py`: `start_kb()` → inline `WebAppInfo(url)`. `start.py`: `cmd_start(message)` → приветствие + kb. `main.py`: Bot, Dispatcher, include router, polling, graceful shutdown.
- Проверка: `cd backend && ruff check . && ruff format --check . && pyright && python -c "import app.bot.main"`.
- Риск: aiogram имена `[НЕ ВЕРИФИЦИРОВАНО]` → Pre-flight verify обязателен. Откат: git revert.

**[5] CREATE smoke-тест**
- Слой: backend. Файлы: `backend/tests/test_smoke.py`.
- Тест: `cmd_start` (или `start_kb()`) строит `InlineKeyboardMarkup` с кнопкой, у которой `web_app.url == WEBAPP_URL`.
- Проверка: `cd backend && PYTHONPATH=. pytest -q` (зелёный).
- Откат: удалить тест.

**[6] CREATE manual-test doc**
- Файлы: `docs/manual-tests/stage-1.md` (чеклист из ТЗ 1.11).
- Проверка: файл существует, пункты 1–7 на месте.

## Verification / DoD
- `cd backend && ruff check . && ruff format --check . && pyright` — чисто.
- `cd backend && PYTHONPATH=. pytest -q` — зелёный (smoke).
- `python -c "import app.bot.main"` — без ошибок.
- Открыть `webapp/index.html` через `http.server` в браузере — игра грузится (guard не падает вне Telegram).
- **Manual в Telegram** (`docs/manual-tests/stage-1.md`): `/start` → «Играть» → Mini App → PixiJS рендер → PLAY → звук + слайды (desktop + mobile через туннель).

## Pre-mortem (топ-3 риска)
1. **SDK timing / `Telegram.WebApp` undefined** → init.js guard + SDK в `<head>`. Детект: console в webview; браузер вне Telegram не падает.
2. **`WEBAPP_URL` не https / туннель лёг** → Telegram не откроет Mini App. Детект: кнопка не открывает / ошибка. Митигация: проверить URL https + туннель до теста.
3. **aiogram API имена неверны** → import/runtime fail. Детект: `pyright`/`python -c import`/старт бота. Митигация: Pre-flight verify по docs.aiogram.dev.

## Фактчек (verification ladder)
- `[verified docs/CODE-MAP.md §1]` порядок script-тегов; SDK до `window.onload`; наш слой после `main.js`.
- `[verified docs/CODE-MAP.md §9]` webview-риски (onload/audio/viewport).
- `[verified reference-code]` структура игры (js/core = 12 файлов, assets, words.html).
- `[НЕ ВЕРИФИЦИРОВАНО → Pre-flight]` aiogram 3 `WebAppInfo`/`web_app=`; `Telegram.WebApp.ready/expand` — сверить с офиц. docs перед Implement.
- **Итог: 3/4 verified; 1 — обязательная Pre-flight сверка (не из памяти в код).**

## Triple self-review
- **Фронт/TMA:** движок не правим (только index.html ADAPT + новый init.js); seams не используются в Stage 1; SDK-порядок учтён.
- **Бэк/API+БД:** БД нет; бот изолирован; config через pydantic-settings из `.env`; секреты не в коде.
- **Domain:** integrity-path не затронут; anti-invention — aiogram/WebApp факты помечены и уйдут в Pre-flight verify.
