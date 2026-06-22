# CLAUDE.md — рабочие правила проекта «Эволюция доверия» (TMA)

Telegram Mini App — порт интерактивной игры **«The Evolution of Trust»** (Nicky Case, лицензия **CC0 / public domain**) в Telegram. Делается **по этапам** на базе оригинального кода игры. Эталон: `reference-code/ncase-trust` (vanilla JS / PixiJS), русский перевод — `reference-code/notdotteam-trust`. `reference-code/` — временная папка-эталон, **удаляется в конце**; игровой код копируется в `webapp/` и дорабатывается, поэтому до удаления весь нужный контент должен жить в `webapp/` + `docs/`.

## Главное правило
**«делаем этап N»** → план этапа в `docs/plans/<slug>.md` (через `/discover` → `/plan`) и иду по нему: цель → референс (`file:line` из `reference-code/` или `docs/`) → COPY/ADAPT/CREATE/SKIP → фронт (`webapp/`) → бэк (`backend/`) → API → i18n → тесты → manual-test → DoD.

**Anti-invention:** копировать из оригинала игры, НЕ выдумывать. Любой символ (функция / pub-sub-событие / ассет / Telegram WebApp API / endpoint / поле БД) — подтвердить Read/grep ДО использования. Источник правды: **код игры** (`reference-code/` или `webapp/`) > `docs/CODE-MAP.md` / `docs/TMA-INTEGRATION.md` > офиц. docs (Telegram / aiogram / PixiJS) > память. Не уверен → пометь `[НЕ ВЕРИФИЦИРОВАНО]`, проверь/спроси; правдоподобная заглушка запрещена; фиксим причину, не симптом (заплатка — только с явного ок юзера + TODO с условием снятия).

**Integrity-path = STOP при расхождении** (аналог money-path): валидация Telegram **initData** (HMAC-подпись), целостность **лидерборда** (анти-накрутка очков), сохранение/чтение **прогресса** игрока. Здесь не «фиксим молча» — STOP + report юзеру.

**Доки — три рабочих файла (не дублировать):** CLAUDE.md = правила (не растёт, история сюда не пишется) · `docs/ARCHITECTURE.md` = карта текущего состояния (слои/инварианты/долги) · `docs/LOG.md` = append-only история (запись на каждый PR в `/commit-pr`; целиком не читать — grep). Плюс read-only справка: `docs/GAME-OVERVIEW.md` (механики/нарратив), `docs/CODE-MAP.md` (архитектура оригинала), `docs/TMA-INTEGRATION.md` (детали портирования), `docs/reference/` (сырые копии README / notes / words EN+RU).

## Стек
**Фронтенд (`webapp/`)** — оригинал as-is: vanilla JS (ES5-стиль, глобалы), **PixiJS** (рендер), **Howler.js** (звук), **TweenJS/CreateJS** (анимация), **Q** (промисы), **MinPubSub** (pub/sub `publish`/`subscribe`), **Pegasus** (XHR), Balloon.css (тултипы). Без build-системы — script-теги. Сверху тонкий **Telegram-слой**: `telegram-web-app.js` (WebApp SDK) + наш модуль `js/telegram/` (init/expand/theme/haptics/CloudStorage/share). i18n RU/EN — переключение `words.<lang>.html`.

**Бэкенд (`backend/`)** — Python 3.12 · **aiogram 3** (бот: `/start` → web_app-кнопка) · **FastAPI** (API лидерборда + проверка initData) · SQLAlchemy 2 async · asyncpg · PostgreSQL 16 · Alembic · pydantic 2 · structlog. Минимальный: бот отдаёт кнопку Mini App; API принимает счёт (с HMAC-проверкой initData) и отдаёт лидерборд.

**Инфра:** docker-compose (postgres); хостинг статики `webapp` (**HTTPS обязателен** — Telegram не откроет Mini App по HTTP) + backend.

## Структура (план)
```
webapp/   index.html · css/ · js/{lib,core,sims,slides}=оригинал · js/telegram/=наш слой · words.en.html · words.ru.html · assets/
backend/  app/bot (хендлеры aiogram) · app/api (FastAPI routes + initData-auth) · app/services · app/db (models/repositories/migrations) · app/core (config/logging/i18n)
docs/     plans · discoveries · ARCHITECTURE.md · LOG.md · manual-tests · GAME-OVERVIEW.md · CODE-MAP.md · TMA-INTEGRATION.md · reference/
reference-code/  эталон игры (временно, удаляется в конце)
```

## Конвенции
**Фронт (анти-регресс оригинала):** игровой движок (`js/core`, `js/sims`, `js/slides`, `js/lib`) НЕ трогаем без причины — порт «as-is». Наш код — отдельно в `js/telegram/` (namespace `TG`), цепляется к pub/sub-событиям игры (см. `CODE-MAP.md` → Integration seams), движок не правит. Глобалы оригинала (`c_`, `createjs`, `Ticker`, `publish`/`subscribe`) уважаем. i18n: один `words.<lang>.html` за раз; **parity EN/RU обязателен** (множество ключей совпадает).

**Бэк (конвенции в стиле Andrei_bot):** Handlers `cb_{action}(callback)` / `handle_{action}(message)`; `Router(name=...)`. API-routes тонкие → `app/services`. Services: `async with session_scope()`. Repos: `{Entity}Repository` (`get_by_*` / `create`(flush, НЕ commit) / `list_*`); Models: `{Entity}(Base, TimestampMixin)` + `__tablename__`. DI: `get_settings()` (lru_cache), `get_logger(__name__)` (structlog, key-value не f-string). **initData валидируется на КАЖДОМ запросе API** (FastAPI dependency). Лидерборд: счёт привязан к telegram `user_id` из **verified** initData, НЕ из тела запроса.

## Telegram Mini App — ключевое
- **initData security:** проверять HMAC-SHA256 подпись initData серверным bot-token'ом (алгоритм — `docs/TMA-INTEGRATION.md`). Identity юзера берём ТОЛЬКО из verified initData, никогда из клиентского payload. Просроченный `auth_date` → reject.
- **CloudStorage:** прогресс (текущий слайд) — `Telegram.WebApp.CloudStorage` (клиентское, без БД).
- **Theme / Haptics:** `themeParams` → CSS-переменные; `HapticFeedback` на тапах кнопок.
- **Viewport:** `ready()` + `expand()`; учитывать `viewportStableHeight` / safe area; игра под фикс-размер — нужна адаптация (см. `CODE-MAP.md` → webview risks).
- **Share:** через WebApp (`switchInlineQuery` / `shareMessage` или ссылка `t.me/<bot>/<app>?startapp=...`).

## Dev-команды (ориентир; уточняется при сборке скелета)
```bash
# фронт (статика, без билда) — в Telegram нужен HTTPS-туннель (cloudflared/ngrok)
cd webapp && python3 -m http.server 8080
# бэк
docker compose up -d postgres
cd backend && pip install -e ".[dev]"
PYTHONPATH=. alembic upgrade head && python -m app.bot.main
# гейты
ruff check . && ruff format --check . && pyright && PYTHONPATH=. pytest -q
# i18n parity фронта (ключи words.en == words.ru)
node tools/i18n-parity.mjs
```

## Тесты
- **backend unit** — чистые функции / моки; **валидатор initData — на реальных тест-векторах** из Telegram docs (не на самопальных).
- **backend integration** — против РЕАЛЬНОГО PG-контейнера (`testcontainers`), миграции с нуля, изоляция rollback'ом сессии. Требует Docker daemon.
- **frontend** — ручной тест в Telegram (desktop + mobile webview), чеклист в `docs/manual-tests/`. Опц. lint нашего `js/telegram/`-слоя.

## Безопасность
Bot token / секреты — НИКОГДА в git (даже приватном). `.env` / `config/local.*` в `.gitignore`; локальный gitleaks pre-commit. **initData HMAC — единственный источник identity.** Лидерборд — анти-накрутка: rate-limit, валидация диапазона очков, score привязан к verified `user_id`. HTTPS обязателен.

## Git / процесс
Этап завершается по DoD (тесты + manual-чеклист + зелёные гейты) → **ручная приёмка юзера** → дальше git делаю **Я**: ветка `feat/<slug>` → **селективный** `git add` (НЕ `-A`/`.` — git-guard блокирует, проверить `git diff --cached --name-only` на секреты) → commit (`-F` файл) → `git push -u origin <ветка>`. PR через `gh` (если есть) или GitHub REST API (токен из `git credential fill`, в вывод НЕ печатать). Юзер мёрджит на вебе. **Никогда не commit/push/PR без явной приёмки юзера и явной команды `/commit-pr`.** Hook `git-guard` механически блокирует push в main/master, force-push, `--no-verify`, `git add -A/.`.

Co-Authored-By в коммитах: `Claude Opus 4.8 <noreply@anthropic.com>`. PR body заканчивается строкой `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Формат PR-отчёта
Заголовок: `<Этап>: <Название> — Complete`. Тело на русском (технические термины англ), секции по порядку: **Summary** (1-2 предл. + стек) · **Key Deliverables** (буллеты `**Категория:** детали`) · **Testing** (гейты + фактическое поведение) · **How to Verify** (```bash```) · **Out of Scope**. Указывать атрибуцию (порт CC0-игры Nicky Case) где уместно.
