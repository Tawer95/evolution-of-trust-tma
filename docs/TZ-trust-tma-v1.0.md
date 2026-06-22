# Техническое задание (для разработки) — «Эволюция доверия» (Telegram Mini App) v1.0

**Дата:** 2026-06-22

> **Статус источников (verification ladder).** Фронт-дизайн и карта движка — *verified* (чтение кода + game-engine-expert). Telegram-платформа / схема бэка — на основе `docs/TMA-INTEGRATION.md` + знаний (research-workflow упал на 529 ×2). **Алгоритм initData и aiogram web_app API сверены напрямую через WebFetch 2026-06-22** (`core.telegram.org/bots/webapps`, `docs.aiogram.dev`) — см. §15. Остаётся: прогон валидатора initData на реальном тест-векторе при реализации Stage 4.
> **Приоритет при расхождениях:** код игры (`reference-code/` или `webapp/`) > этот ТЗ > `docs/CODE-MAP.md` / `docs/TMA-INTEGRATION.md` > офиц. docs (Telegram/aiogram/PixiJS) > память. Все `file:line` верифицировать повторным Read перед использованием (строки могли сдвинуться при копировании в `webapp/`).

---

# ЧАСТЬ I — Обзор

## §0. Принцип реализации
Порт **«as-is»**: игровой движок (vanilla JS / PixiJS, `js/lib|core|sims|slides`) НЕ переписываем — копируем в `webapp/` и оборачиваем тонким **Telegram-слоем** (`webapp/js/telegram/`, namespace `TG`), цепляясь к существующим pub/sub-событиям движка. Делается **поэтапно** (Stage 1–5); каждый этап = отдельный PR по pipeline (`/discover → /plan → /branch → /implement → /review → /verify`), **STOP перед коммитом + ручной тест в реальном Telegram**, затем `/commit-pr`. **Anti-invention:** любой символ (pub/sub-событие, WebApp-метод, aiogram-API, поле БД) — verify Read/grep/docs ДО использования.

## §1. Цель проекта
Перенести интерактивную игру по теории игр «The Evolution of Trust» (Nicky Case, CC0) в Telegram как Mini App: пользователь открывает бота → запускает игру внутри Telegram (webview), проходит её на RU/EN, прогресс сохраняется, результаты песочницы/турнира попадают в лидерборд, можно поделиться.

## §2. Объём работ (MVP)
- **Порт игры** в Telegram-webview без регресса оригинала.
- **RU/EN** с рантайм-переключателем (parity ключей обязателен).
- **Тема Telegram** (светлая/тёмная) + **хаптика** на тапах.
- **Сохранение прогресса** (текущий слайд + язык) через CloudStorage.
- **Лидерборд** (бэкенд + БД) с привязкой результата к verified Telegram user_id.
- **Share** результата через Telegram.
- **Бот** (aiogram): `/start` → кнопка запуска Mini App.
Вне MVP (зазор на будущее): мультиплеер/PvP, аккаунты вне Telegram, кастомные турниры с шарингом конфигов, нативный экран лидерборда от бота.

## §3. Термины и ключевые решения
- **integrity-path** — пути, где STOP при любом расхождении (аналог money-path): валидация **initData** (HMAC), целостность **лидерборда** (анти-накрутка), сохранение/чтение **прогресса**.
- **Telegram-слой / `TG`** — наш код в `webapp/js/telegram/`, не трогающий движок.
- **seam** — pub/sub-канал движка, к которому цепляется `TG` (см. `docs/CODE-MAP.md` §10).
- **Решения (из приёмки заказчика):** фронт — as-is + Telegram-слой; бот/бэк — Python/aiogram; фичи MVP — save+share+leaderboard+haptics+theme; языки — RU+EN с переключателем.
- **Открытые (решаются на своих этапах):** лидерборд — *best* vs *last* score (рекоменд. best); что именно «score» и какие `mode`; хостинг прод-статики.

## §4. Стек
**Фронт (`webapp/`):** vanilla JS (ES5-стиль, глобалы), PixiJS, Howler.js, TweenJS/CreateJS, Q, MinPubSub, Pegasus, Balloon.css — оригинал, без build-системы (script-теги). Сверху: `telegram-web-app.js` (WebApp SDK) + наш `js/telegram/`.
**Бэк (`backend/`):** Python 3.12 · aiogram 3 · FastAPI · SQLAlchemy 2 async · asyncpg · PostgreSQL 16 · Alembic · pydantic 2 / pydantic-settings · structlog.
**Инфра:** docker-compose (postgres); хостинг статики `webapp` (HTTPS обязателен) + backend; локально — HTTPS-туннель (cloudflared) для теста в Telegram.

## §5. Архитектура
```
Telegram client
  └─ Mini App (webview)  ──HTTPS──>  webapp/ (статика)
       js/lib|core|sims|slides (движок, не трогаем)
       js/telegram/ TG-слой ──(Authorization: tma <initData>)──> backend API
  └─ Bot (long polling) <── aiogram ── backend/app/bot
backend/app: bot (aiogram) · api (FastAPI: initData-auth dep → routes) · services · db (models/repositories/migrations) · core (config/logging)
Postgres ── лидерборд
```
**Границы:** фронт-движок ↔ `TG`-слой через pub/sub; `TG` ↔ API через HTTPS с initData; API: `deps`(валидация initData) → `services` → `repositories` → БД.

## §6. Безопасность / integrity-path
- **initData = единственный источник identity.** HMAC-SHA256 проверка серверным bot-token'ом на КАЖДОМ защищённом запросе (FastAPI dependency). user_id/username — только из verified initData, никогда из тела. Просроченный `auth_date` → reject. Алгоритм — §15 `[НЕ ВЕРИФИЦИРОВАНО — сверить]`.
- **Лидерборд анти-накрутка:** score привязан к verified user_id; валидация диапазона; rate-limit; UNIQUE(user_id, mode).
- **XSS:** username в лидерборде рендерить с экранированием (webview innerHTML).
- **Секреты:** `BOT_TOKEN` / DB creds — в `.env` (gitignored), не в клиентском бандле, не в логах. HTTPS обязателен.
- **CORS:** origin = `WEBAPP_URL`, не `*` с credentials.

## §7. База данных (обзор)
Только бэкенд (Stage 4+). Таблица `leaderboard` (см. §13 / Stage 4.4). Прогресс игрока — НЕ в БД, а в Telegram CloudStorage (клиентское). Миграции — Alembic, инкрементально `n0X_<slug>`.

## §8. Тестирование и Definition of Done (общее)
- **Backend unit:** чистые функции / моки; **валидатор initData — на РЕАЛЬНОМ тест-векторе Telegram** (не самопальном).
- **Backend integration:** против реального PG-контейнера (`testcontainers`), миграции с нуля, rollback-изоляция. Требует Docker.
- **Frontend:** ручной тест в Telegram (desktop + mobile webview) по `docs/manual-tests/stage-N.md`; опц. lint `js/telegram/`; i18n parity EN/RU (`tools/i18n-parity.mjs`).
- **DoD этапа:** гейты зелёные (ruff/format/pyright/pytest бэка; parity фронта) + manual-чеклист пройден руками в Telegram + ветка/PR.

## §9. Конфигурация (env)
`.env` (gitignored): `BOT_TOKEN`, `WEBAPP_URL` (HTTPS-URL Mini App; в dev — туннель), `DATABASE_URL` (Stage 4). `.env.example` — шаблон (есть).

## §10. Карта реализации (project-level COPY / ADAPT / CREATE / SKIP)
| Источник | → Назначение | Действие | Дельта |
|---|---|---|---|
| `reference-code/ncase-trust/*` | `webapp/` | COPY | вся игра as-is (вкл. assets, css, js/lib|core|sims|slides) |
| `reference-code/ncase-trust/words.html` | `webapp/words.en.html` | COPY | англ. контент |
| `docs/reference/words-ru.html` | `webapp/words.ru.html` | COPY | рус. контент (notdotteam) |
| `webapp/index.html` | — | ADAPT | SDK в `<head>`, `js/telegram/*` после `main.js` |
| `webapp/js/core/Words.js` | — | ADAPT | two-dict + `switchLang` + `rerender` (Stage 2) |
| `webapp/js/lib/sharing.js` | — | ADAPT | `window.open` → Telegram share (Stage 5) |
| `webapp/css/slides.css` | — | ADAPT | CSS-переменные темы + safe-area (Stage 2) |
| `webapp/main.js` | — | ADAPT | boot грузит оба `words.<lang>.html` (Stage 2) |
| — | `webapp/js/telegram/{init,save,haptics,share,lang,leaderboard}.js` | CREATE | наш слой |
| — | `backend/app/{bot,api,services,db,core}` | CREATE | бот + API + БД |
| — | `tools/i18n-parity.mjs`, `docker-compose.yml` | CREATE | parity-чек, postgres |
| оригинальный `js/lib/sharing.js` соцсети | — | SKIP→ADAPT | FB/Twitter не нужны в Telegram |

---

# ЧАСТЬ II — Технический Blueprint

## §11. Структура каталогов
```
webapp/
  index.html · words.en.html · words.ru.html · favicon.png
  css/ · assets/
  js/{lib,core,sims,slides}/        ← оригинал (не трогаем, кроме ADAPT Words.js/sharing.js)
  js/telegram/{init,save,haptics,share,lang,leaderboard}.js   ← наш слой (TG)
backend/
  app/
    bot/        handlers (cb_/handle_), keyboards, main.py (Dispatcher)
    api/        main.py (FastAPI), routes/, deps/ (initData-auth)
    services/   бизнес-логика (async with session_scope())
    db/         models/, repositories/, migrations/ (alembic)
    core/       config (pydantic-settings), logging (structlog)
  pyproject.toml
docker-compose.yml   tools/i18n-parity.mjs
docs/   reference-code/(временно)
```

## §12. Фронт-слой `js/telegram/` (TG)
Порядок в `index.html`: `telegram-web-app.js` в `<head>` (до игры — чтобы `window.Telegram.WebApp` существовал к `window.onload`); наши `js/telegram/*.js` — ПОСЛЕ `main.js` (чтобы `slideshow`/`publish`/`subscribe` уже определены). Точные seams (verified `docs/CODE-MAP.md` §10):
- `init.js` — `TG.wa = Telegram.WebApp; ready(); expand();` + viewport/theme.
- `save.js` — `subscribe("slideshow/slideChange", id => CloudStorage.setItem("slide", id))`; boot `getItem("slide") → publish("slideshow/goto",[id])`.
- `haptics.js` — делегированный `click` на `#slideshow` → `HapticFeedback.impactOccurred("light")`; `subscribe("iterated/round/end", payoffs => notificationOccurred(...))`.
- `share.js` — заменяет `<sharing>`-тег / `window.open` на `openTelegramLink(...)`.
- `lang.js` — тумблер RU/EN в `#footer` (скрыт до `start/game`), дефолт из `initDataUnsafe.user.language_code`.
- `leaderboard.js` — `POST /score` (с `Authorization: tma <initData>`), экран топа (DOM-overlay).

## §13. Бэкенд-устройство
- **Бот** (`app/bot`): aiogram 3, long polling; `/start` → inline-кнопка `InlineKeyboardButton(web_app=WebAppInfo(url=WEBAPP_URL))`; опц. `set_chat_menu_button(MenuButtonWebApp)`. `[НЕ ВЕРИФИЦИРОВАНО — сверить точные имена с docs.aiogram.dev]`.
- **API** (`app/api`): FastAPI; dependency `verified_user = Depends(auth_initdata)`; `POST /score {mode, score}` (user_id из verified, rate-limit, валидация диапазона); `GET /leaderboard?mode=` (top-N); CORS origin=WEBAPP_URL.
- **Services / Repos / Models:** конвенции CLAUDE.md. `LeaderboardRepository` (`get_top`, `upsert_score`); `LeaderboardEntry(Base, TimestampMixin)`.
- **DI:** `get_settings()` (lru_cache, pydantic-settings из `.env`), `get_logger(__name__)` (structlog), `session_scope()`.

## §14. Words / i18n (механизм)
`Words.convert(file, lang)` парсит `<p id=...>` → `Words.texts[lang]`. `Words.get(id)` → по `currentLang` (fallback en). `switchLang(lang)` → set currentLang + CloudStorage + `rerender()` (перебор DOM с `data-word-id`). boot: `Q.all([..., convert("words.en.html","en"), convert("words.ru.html","ru")])`. **Parity EN/RU обязателен** — `tools/i18n-parity.mjs` диффит множества `id`.

## §15. Валидация initData (integrity cornerstone) `[verified-docs core.telegram.org 2026-06-22; тест-вектор — на Stage 4]`
Серверный алгоритм (Python/FastAPI dependency):
1. Распарсить `initData` (query string) в пары; вынуть `hash`.
2. `data_check_string` = отсортированные по ключу `key=value`, склеенные через `\n` (без `hash`).
3. **`secret_key = HMAC_SHA256(key=b"WebAppData", msg=bot_token)`** — ⚠️ классический подвох, ПОДТВЕРЖДЁНО офиц. docs: ключ HMAC = строка `"WebAppData"`, сообщение = bot_token («the bot token is the message, not the key»).
4. `calc = HMAC_SHA256(key=secret_key, msg=data_check_string).hexdigest()`; сравнить с `hash` через `hmac.compare_digest` (constant-time).
5. Проверить `auth_date` свежесть (напр. ≤ 24ч) — анти-replay.
6. user_id/username — из verified-поля `user` (JSON).
Тест на реальном векторе из Telegram docs (Stage 4.10).

---

# ЧАСТЬ III — Implementation Playbook

## §16. Рабочая процедура этапа
`/discover` (research, completeness-чеклист) → `/plan` (planner, 6 шагов, triple self-review, батч вопросов, ExitPlanMode → **GATE #1 approve**) → `/branch` (feat/<slug>, secret-scan, baseline) → `/implement` (atomic steps, per-step проверка, checkpoint-commits, bounded self-heal) → `/review` (multi-agent severity-таблица → **GATE #2**) → `/verify` (гейты + cleanliness + final-audit → **STOP**, ручной тест в Telegram) → `/commit-pr` (только по явной команде). integrity-path → STOP сразу, не «фиксим молча».

## §17. Конвенции
Фронт: движок не трогаем (кроме ADAPT-точек §10); наш код в `js/telegram/`, namespace `TG`; глобалы оригинала уважаем (`c_`, `createjs`, `Ticker`, `publish`/`subscribe`); parity EN/RU. Бэк: handlers `cb_/handle_`; routes тонкие → services; repos `{Entity}Repository` (`create` flush не commit); models `{Entity}(Base, TimestampMixin)`; initData в dependency; score из verified user_id.

## §18. Dev-команды
```bash
# фронт
cd webapp && python3 -m http.server 8080
cloudflared tunnel --url http://localhost:8080   # → HTTPS-URL в .env WEBAPP_URL + BotFather
# бэк
docker compose up -d postgres
cd backend && pip install -e ".[dev]"
PYTHONPATH=. alembic upgrade head && python -m app.bot.main
# гейты
ruff check . && ruff format --check . && pyright && PYTHONPATH=. pytest -q
node tools/i18n-parity.mjs   # ключи words.en == words.ru
```

## §19. Per-stage «куда смотреть»
| Stage | docs | reference-code / webapp |
|---|---|---|
| 1 Каркас | CODE-MAP §1,§9 · TMA-INT §1,§3 | весь `reference-code/ncase-trust/`, `index.html`, `main.js` |
| 2 RU/EN+тема+хаптика | CODE-MAP §5,§10 · TMA-INT §1 | `js/core/Words.js`, `css/slides.css`, `words.*.html` |
| 3 Save | CODE-MAP §10 #1 · TMA-INT §4 | `js/core/Slideshow.js` |
| 4 Бэк+лидерборд | TMA-INT §2,§3 · CLAUDE.md | `backend/` (новый) |
| 5 Share+полиш | CODE-MAP §6,§9 | `js/lib/sharing.js`, `css/slides.css` |

---

# ЧАСТЬ IV — Per-Stage Implementation Runbook

## R0. Как пользоваться блоком этапа
Каждый `Stage N` — фиксированные секции: **N.0 Цель/Outcome** (+ «готово когда») · **N.1 Предусловия** · **N.2 Референсы** · **N.3 Карта работ** (COPY/ADAPT/CREATE/SKIP) · **N.4 БД** · **N.5 API** · **N.6 Сервисы** · **N.7 UI/слой** · **N.8 Config/env** · **N.9 Edge cases** · **N.10 Тесты** · **N.11 Manual-test** → `docs/manual-tests/stage-N.md` · **N.12 DoD** · **N.13 Открытые вопросы**. Неприменимо → «—».

## Stage 1 — Каркас (Telegram WebApp + скелет бота)

**1.0 Цель / Outcome.** `webapp/` = копия игры + `telegram-web-app.js` + `js/telegram/init.js` (`ready()`/`expand()` + базовые viewport CSS-переменные); локальный статик-сервер; тонкий aiogram-бот `/start` → inline-кнопка `WebAppInfo`. *Готово когда:* открыл бота в Telegram (desktop + mobile через HTTPS-туннель) → кнопка «Играть» → Mini App грузится, PixiJS рендерит, звук стартует по тапу PLAY, слайды листаются; `ruff`+`pyright` по `backend/` чисто; бот стартует и отвечает.

**1.1 Предусловия.** git-репо (есть), `BOT_TOKEN` в `.env` (есть), HTTPS-туннель (cloudflared — установлен; DNS-фикс `1.1.1.1`/VPN на стороне юзера) ИЛИ хостинг с доменом.

**1.2 Референсы.** `reference-code/ncase-trust/*` (вся игра) · `docs/CODE-MAP.md` §1 (порядок script-тегов), §9 (webview-риски: `window.onload`, viewport, audio) · `docs/TMA-INTEGRATION.md` §1 (SDK), §3 (бот) · frontend-дизайн (init.js, раскладка).

**1.3 Карта работ.**
| Источник | → Назначение | Действие | Дельта |
|---|---|---|---|
| `reference-code/ncase-trust/*` | `webapp/` | COPY | вся игра as-is |
| `webapp/index.html` | — | ADAPT | `<script src=".../telegram-web-app.js">` в `<head>`; `<script src="js/telegram/init.js">` после `main.js`; viewport meta |
| — | `webapp/js/telegram/init.js` | CREATE | `TG.wa=Telegram.WebApp; ready(); expand();` |
| — | `backend/app/bot/{main.py,handlers/start.py,keyboards.py}` | CREATE | минимальный бот |
| — | `backend/app/core/config.py` | CREATE | pydantic-settings (`BOT_TOKEN`, `WEBAPP_URL`) |
| — | `backend/pyproject.toml` | CREATE | aiogram 3, pydantic-settings, ruff, pyright, pytest |

**1.4 БД.** —

**1.5 API.** — (бот ходит в Telegram Bot API через aiogram; своего HTTP API нет до Stage 4).

**1.6 Сервисы/воркеры.** Бот — long polling в `app/bot/main.py` (Bot, Dispatcher, include start-router, graceful shutdown).

**1.7 UI/слой.** Бот: `cmd_start` → приветствие + `InlineKeyboardButton(text="Играть", web_app=WebAppInfo(url=settings.WEBAPP_URL))`. Фронт: `init.js` — `ready()`, `expand()`.

**1.8 Config/env.** `BOT_TOKEN` (есть), `WEBAPP_URL` (HTTPS-туннель; меняется при перезапуске quick-tunnel → обновлять `.env`). `WEBAPP_URL` обязан быть `https://`.

**1.9 Edge cases.** SDK в `<head>` ДО игрового кода (иначе `Telegram.WebApp` undefined к `window.onload`, CODE-MAP §9). Наши script-теги — после `main.js` (нужны `slideshow`/`publish`). Quick-tunnel URL эфемерный. `expand()` сразу, иначе игра в half-screen.

**1.10 Тесты.** *unit (backend):* smoke — импорт `app.bot.main`; `cmd_start` строит клавиатуру с `WebAppInfo(url=...)` (проверка типа кнопки). *Фронт:* ручной.

**1.11 Manual-test** (`docs/manual-tests/stage-1.md`): (1) `cd webapp && python3 -m http.server 8080`; (2) `cloudflared tunnel --url http://localhost:8080` → скопировать HTTPS-URL в `.env` `WEBAPP_URL`; (3) `cd backend && python -m app.bot.main`; (4) в Telegram `/start` → нажать «Играть»; (5) Mini App грузится, PixiJS рендерит splash, тап PLAY → звук + первый слайд; (6) пролистать 2–3 слайда, проверить тап-кнопки; (7) повторить на мобильном Telegram.

**1.12 Definition of Done.** Игра открывается и проходится в Telegram (desktop + mobile); бот `/start` даёт рабочую web_app-кнопку; `ruff`+`pyright` по `backend/` чисто; smoke-тест зелёный; `docs/manual-tests/stage-1.md` пройден руками; ветка/PR.

**1.13 Открытые вопросы.** Хостинг прод-статики (туннель — только dev) → отложить до Stage 5/деплоя. Текст приветствия/кнопки бота — дефолт «Играть»/короткое описание, подтвердить на approve.

---

## Stage 2 — RU/EN + тема Telegram + хаптика

**2.0 Цель / Outcome.** Рантайм-переключатель языка EN/RU (без перезагрузки); цвета из `themeParams` (светлая/тёмная); хаптика на тапах. *Готово когда:* тумблер меняет весь текст на любом слайде; тёмная тема Telegram → читаемо; тап по кнопке даёт haptic; `tools/i18n-parity.mjs` зелёный.

**2.1 Предусловия.** Stage 1.

**2.2 Референсы.** `docs/CODE-MAP.md` §5 (Words-механизм), §10 (seams) · `docs/TMA-INTEGRATION.md` §1 (theme/haptics) · frontend-дизайн §3 (Words two-dict), §4 (тема/safe-area) · `reference-code/ncase-trust/words.html`, `docs/reference/words-ru.html`.

**2.3 Карта работ.**
| Источник | → Назначение | Действие | Дельта |
|---|---|---|---|
| `js/core/Words.js` | — | ADAPT | `Words.texts={en,ru}`, `currentLang`, `get` по языку, `switchLang`, `rerender` (DOM `data-word-id`) |
| `main.js` | — | ADAPT | boot `Q.all([…, convert("words.en.html","en"), convert("words.ru.html","ru")])` |
| `words.html` | `webapp/words.en.html` | COPY | англ. |
| `docs/reference/words-ru.html` | `webapp/words.ru.html` | COPY | рус. |
| `css/slides.css` | — | ADAPT | `:root` CSS-переменные (`--tg-theme-*`, safe-area), font fallback |
| — | `js/telegram/lang.js` | CREATE | тумблер в `#footer` (скрыт до `start/game`), дефолт из `initDataUnsafe.language_code` |
| — | `js/telegram/haptics.js` | CREATE | делегированный click + `iterated/round/end` |
| — | `tools/i18n-parity.mjs` | CREATE | дифф ключей en/ru |

**2.4 БД.** — **2.5 API.** — **2.6 Сервисы.** —

**2.7 UI/слой.** `lang.js`: кнопка RU/EN рядом с `#sound`; `Words.switchLang` + ре-рендер. `init.js`: маппинг `themeParams` → CSS-переменные + подписка на `themeChanged`. `haptics.js`: `impactOccurred("light")` на тапах.

**2.8 Config/env.** —

**2.9 Edge cases.** Parity: отсутствующий ключ → fallback `en` (не падать). RU длиннее EN — проверить вёрстку (мобила). Хаптика не на каждый чих. `rerender` требует пометки DOM-узлов `data-word-id` (хранить `text_id` при создании TextBox/Button).

**2.10 Тесты.** *unit (node):* `tools/i18n-parity.mjs` — множества `<p id>` в en==ru. *Manual:* переключить язык на слайдах 0/3/7; тёмная+светлая тема; хаптика на кнопках.

**2.11 Manual-test** (`docs/manual-tests/stage-2.md`): переключение языка на 3+ слайдах без перезагрузки; смена темы Telegram → цвета/читаемость; хаптика; RU-текст не обрезается на узком экране.

**2.12 DoD.** parity зелёный; переключатель работает на всех слайдах; тема подхватывается; хаптика; manual пройден; PR.

**2.13 Открытые вопросы.** Сохранять язык сейчас (CloudStorage) или в Stage 3 — рекоменд. в Stage 3 вместе с прогрессом.

---

## Stage 3 — Сохранение прогресса (CloudStorage)

**3.0 Цель / Outcome.** При повторном открытии Mini App — предложить продолжить с сохранённого слайда; язык тоже сохраняется. *Готово когда:* дошёл до слайда N, закрыл, открыл → «Продолжить с N?» → `goto N`; язык восстановлен.

**3.1 Предусловия.** Stage 1, 2.

**3.2 Референсы.** `docs/CODE-MAP.md` §10 #1 (`slideshow/slideChange`, `slideshow/goto`) · `docs/TMA-INTEGRATION.md` §4 · frontend save.js.

**3.3 Карта работ.**
| — | `js/telegram/save.js` | CREATE | subscribe `slideshow/slideChange` → `CloudStorage.setItem("slide",id)`; boot `getItem` → prompt → `publish("slideshow/goto",[id])`; `setItem("lang",…)` |
| `js/telegram/lang.js` | — | ADAPT | читать сохранённый язык на boot |

**3.4 БД.** — **3.5 API.** — **3.6 Сервисы.** —

**3.7 UI/слой.** DOM-overlay «Продолжить с того места? [Да/Сначала]» при наличии сохранённого слайда (до `nextSlide`).

**3.8 Config/env.** —

**3.9 Edge cases.** CloudStorage async + callback; недоступен (старый клиент/ошибка) → тихий fallback на старт, не падать. Лимиты ключей/размера (TMA-INT §1). Невалидный сохранённый id → игнор. **integrity-path:** сохранение/чтение прогресса — расхождение → STOP, не «чиним молча».

**3.10 Тесты.** Ручной (CloudStorage только в реальном Telegram). Опц. unit на чистую функцию «решить, что восстанавливать».

**3.11 Manual-test** (`docs/manual-tests/stage-3.md`): пройти до слайда N → закрыть Mini App → открыть → появился prompt → «Да» → на слайде N; «Сначала» → слайд 0; язык сохранён.

**3.12 DoD.** Прогресс+язык сохраняются и восстанавливаются; fallback при недоступном CloudStorage; manual; PR.

**3.13 Открытые вопросы.** Сохранять ли состояние песочницы (payoff'ы/популяция) — рекоменд. нет в MVP (только слайд+язык).

---

## Stage 4 — Бэкенд + лидерборд + initData-auth (integrity-критичный)

**4.0 Цель / Outcome.** FastAPI: валидация initData (HMAC) → POST /score (привязка к verified user_id) → GET /leaderboard; Postgres + Alembic; фронт `leaderboard.js` (submit + экран топа). *Готово когда:* подделанный initData → reject; валидный → score пишется на verified user_id; топ читается; попытка чужого user_id / завышенного score → reject.

**4.1 Предусловия.** Stage 1 (бот, webapp). Docker (postgres). `BOT_TOKEN` (проверка initData).

**4.2 Референсы.** `docs/TMA-INTEGRATION.md` §2 (initData — **[НЕ ВЕРИФИЦИРОВАНО]**, §15 этого ТЗ — СВЕРИТЬ с офиц. docs + тест-вектор!), §3 (бэк) · `CLAUDE.md` (Конвенции бэка, Безопасность) · `docs/CODE-MAP.md` §10 #7,#8 (источники score: `tournament/*`, `iterated/round/end`).

**4.3 Карта работ.**
| — | `backend/app/api/{main.py,deps/auth.py,routes/score.py,routes/leaderboard.py}` | CREATE | FastAPI + initData-dep |
| — | `backend/app/db/{models/leaderboard.py,repositories/leaderboard_repo.py,migrations/n00_leaderboard.py}` | CREATE | модель+repo+миграция |
| — | `backend/app/services/leaderboard_service.py` | CREATE | submit/get top |
| — | `webapp/js/telegram/leaderboard.js` | CREATE | POST /score, GET /leaderboard экран |
| — | `docker-compose.yml` | CREATE | postgres:16 |
| `backend/app/bot` | — | ADAPT (опц.) | кнопка/команда «Лидерборд» |

**4.4 БД — `n00_leaderboard`.** Таблица `leaderboard`: `id PK`; `user_id BIGINT NOT NULL`; `username String(64)`; `mode String(32) NOT NULL`; `score Integer NOT NULL`; `created_at/updated_at`. UNIQUE `(user_id, mode)`; index `(mode, score DESC)` под топ. *best vs last* — **открытый вопрос** (рекоменд. *best*: UPSERT `score = GREATEST(existing, new)`). *Verify:* `alembic upgrade head` на чистую БД → integration-тест.

**4.5 API.** `auth_initdata` dependency: заголовок `Authorization: tma <initData>` → валидация (§15) → verified `user_id`/`username`. `POST /score {mode, score}` → user_id из dep (НЕ из тела), валидация диапазона score, rate-limit → upsert → 200. `GET /leaderboard?mode=&limit=` → top-N. CORS `allow_origins=[WEBAPP_URL]`.

**4.6 Сервисы.** `LeaderboardService.submit(user_id, username, mode, score)` / `.top(mode, limit)` — `async with session_scope()`. `LeaderboardRepository.upsert_score` (flush), `get_top`.

**4.7 UI/слой.** `leaderboard.js`: на конце игры / `tournament/step/completed` → `POST /score`; экран топа — DOM-overlay (username экранировать!).

**4.8 Config/env.** `DATABASE_URL`, `BOT_TOKEN` (для HMAC), `WEBAPP_URL` (CORS).

**4.9 Edge cases / грабли.** **initData secret_key = `HMAC_SHA256(key="WebAppData", msg=bot_token)`** — классический подвох, ОБЯЗАТЕЛЬНО сверить + тест-вектор. `compare_digest` (constant-time). `auth_date` freshness (anti-replay). user_id/username ТОЛЬКО из verified. score-range валидация (анти-накрутка). username → экранировать (XSS). Rate-limit на `POST /score`. **integrity-path всюду → STOP при расхождении.**

**4.10 Тесты.** *unit:* валидатор initData на **реальном тест-векторе Telegram** (валид → ok; подменённый hash → reject; протухший auth_date → reject; нет полей → reject); score-range. *integration (testcontainers PG):* submit → get_top; повторный submit того же (user_id,mode) → UPSERT best; миграция с нуля. *Manual:* реальный initData из webview + попытка подделки.

**4.11 Manual-test** (`docs/manual-tests/stage-4.md`): `docker compose up -d postgres`; `alembic upgrade head`; запустить API; из Mini App завершить игру → score в топе под своим именем; попытка отправить чужой user_id/огромный score (через curl с поддельным initData) → reject.

**4.12 DoD.** initData-валидатор на реальном векторе зелёный; миграция ок; unit+integration зелёные; подделка отвергается; `ruff`+`pyright`; manual (вкл. negative); PR.

**4.13 Открытые вопросы / spike.** Что есть «score» и какие `mode` (песочница? дошёл-до-конца? очки турнира?) — решить на /plan этого этапа. best vs last. Алгоритм initData — **сверить с офиц. docs + тест-вектор (spike перед кодом).**

---

## Stage 5 — Share + webview-полиш + готовность к релизу

**5.0 Цель / Outcome.** Share результата через Telegram; полировка viewport/safe-area/шрифт/звук на iOS+Android; полный manual-чеклист; готовность к деплою. *Готово когда:* кнопка share открывает Telegram-шаринг с текстом; игра корректно вписывается в экран на iOS+Android (вырезы/таб-бар); шрифт и звук работают; чеклист пройден на обеих ОС, обоих языках, обеих темах.

**5.1 Предусловия.** Stage 1–4 (share результата — после лидерборда/концовки).

**5.2 Референсы.** `docs/CODE-MAP.md` §6 (`sharing.js`, `<sharing>`-тег), §9 (webview-риски) · `docs/TMA-INTEGRATION.md` §1,§5 · frontend §4,§5.

**5.3 Карта работ.**
| `js/lib/sharing.js` | — | ADAPT | `window.open(FB/Twitter)` → `TG.wa.openTelegramLink(...)` / share |
| `css/slides.css` | — | ADAPT | финальная safe-area/100vh/`position:fixed` футер |
| — | (опц.) деплой статики + named tunnel/прод-URL + @BotFather | CREATE | прод-хостинг |

**5.4–5.8** БД/API/сервисы — нет; config — прод `WEBAPP_URL`.

**5.9 Edge cases.** Autoplay звука разблокируется жестом PLAY (проверить в обоих webview). Шрифт `.ttf` → fallback системный. `resolution:2` PixiJS на 3x-девайсах — известный issue (CODE-MAP §9), при необходимости clamp (правка sim — только если измеримо). Scratch-анимация на слабом Android.

**5.10 Тесты.** Ручной (кроссплатформенный). Опц. lint `js/telegram/`.

**5.11 Manual-test** (`docs/manual-tests/stage-5.md`): share открывает Telegram-диалог с текстом+ссылкой; полный прогон игры на iOS Telegram и Android Telegram; обе темы; оба языка; вырезы/таб-бар не перекрывают контент; звук; производительность scratch.

**5.12 DoD.** Share работает; кроссплатформенный чеклист пройден (iOS+Android, RU+EN, dark+light); нет блокирующих webview-проблем; PR; (опц.) деплой.

**5.13 Открытые вопросы.** Прод-хостинг статики (Cloudflare Pages / Netlify / свой сервер) + named cloudflare tunnel или домен — решить к деплою.
