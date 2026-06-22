# TMA-INTEGRATION — план и детали портирования в Telegram Mini App

Как из статичной игры (`docs/CODE-MAP.md`) сделать Telegram Mini App. Архитектура: статика `webapp/` + `telegram-web-app.js` + наш слой `webapp/js/telegram/` (namespace `TG`); бэкенд `backend/` (aiogram бот + FastAPI API + Postgres). Фичи MVP: сохранение прогресса (CloudStorage), share, лидерборд (бэкенд), хаптика+тема, переключатель RU/EN.

> **Статус:** конспект для планирования. Алгоритмы Telegram (особенно валидация initData) и сигнатуры WebApp-методов — **перед кодированием verify по офиц. docs `core.telegram.org/bots/webapps` + реальный тест-вектор** (см. CLAUDE.md → Anti-invention). Минимальную `WebApp.version` каждого метода проверять через `isVersionAtLeast`.

## 1. Telegram WebApp SDK (клиент)
Подключить `<script src="https://telegram.org/js/telegram-web-app.js"></script>` в `<head>` `index.html` ДО игрового кода. Доступ — `window.Telegram.WebApp`.
- **Lifecycle:** `WebApp.ready()` (сообщить, что приложение готово), `WebApp.expand()` (на всю высоту).
- **Viewport:** `viewportHeight`, `viewportStableHeight`, событие `viewportChanged`; safe-area.
- **Theme:** `colorScheme` (light/dark), `themeParams` (`bg_color`, `text_color`, `button_color`, …), событие `themeChanged`. Маппить в CSS `:root { --bg: var(--tg-theme-bg-color,#fff); … }`.
- **Haptics:** `HapticFeedback.impactOccurred('light'|'medium'|'heavy')`, `notificationOccurred('success'|'error'|'warning')`, `selectionChanged()`.
- **Кнопки:** `MainButton` (показать/текст/onClick), `BackButton` (show/hide/onClick) — **BackButton маппить на «назад по слайду»**, иначе закроет приложение.
- **CloudStorage:** `CloudStorage.setItem(key,val,cb)`, `getItem(key,cb)`, `getItems`, `removeItem` — async, callback-стиль; лимиты на число ключей/размер; НЕ для секретов.
- **initData:** `WebApp.initData` (raw query string — для СЕРВЕРА), `WebApp.initDataUnsafe` (объект — НЕ доверять для авторизации).
- **Share / ссылки:** `WebApp.openTelegramLink(url)`, `WebApp.switchInlineQuery(q, types)`; deeplink запуска `t.me/<bot>/<app>?startapp=<param>`.

## 2. initData — серверная валидация (integrity-cornerstone)
Identity берётся ТОЛЬКО из проверенного initData. Алгоритм (verify по офиц. docs + тест-вектор перед реализацией):
1. Распарсить `initData` (query string) в пары `key=value`.
2. Вынуть `hash`; из остальных собрать **data-check-string**: отсортировать ключи по алфавиту, склеить `key=value` через `\n`.
3. `secret_key = HMAC_SHA256(key="WebAppData", msg=<BOT_TOKEN>)`.
4. `calc = HMAC_SHA256(key=secret_key, msg=data_check_string)`; сравнить с `hash` через **constant-time** (`hmac.compare_digest`).
5. Проверить `auth_date` на свежесть (напр. ≤ 24ч) — анти-replay.
6. user_id и пр. — из проверенного `user`-поля.

На FastAPI — это **dependency** на каждом защищённом эндпойнте; initData передаётся клиентом в заголовке (напр. `Authorization: tma <initData>`).

## 3. Бэкенд (Python / aiogram / FastAPI / Postgres)
- **Бот (`app/bot`):** `/start` → сообщение с inline-кнопкой `WebAppInfo(url=<webapp HTTPS url>)`; опц. `MenuButtonWebApp`. Обработка `?startapp=` deeplink.
- **API (`app/api`):** `POST /score` (submit, защищён initData-dependency; user_id из verified initData; rate-limit) · `GET /leaderboard?mode=...` (топ-N). CORS — origin Mini App, не `*` с credentials.
- **Сервисы/репо/модели (`app/services`, `app/db`):** см. CLAUDE.md → Конвенции. Лидерборд-модель: `(user_id BIGINT, username, mode, score, updated_at)`; индекс `ORDER BY score DESC`; уникальность по `(user_id, mode)` — **best vs last score — решить в плане**.
- **Миграции:** Alembic; см. agent `migration-engineer`.

## 4. Фичи → seams (из CODE-MAP §10)
| Фича | Как | Seam |
|---|---|---|
| **Save прогресса** | `subscribe("slideshow/slideChange", id => CloudStorage.setItem("slide", id))`; на boot `getItem("slide")` → `publish("slideshow/goto",[id])` (предложить «продолжить?»). | `slideshow/slideChange`, `slideshow/goto` |
| **Haptics** | Обёртка над кликом `Button.js` / подписка на их `message` → `HapticFeedback.*`. Не на каждый чих. | `Button.js`, `iterated/round/end` |
| **Theme** | `themeParams` → CSS-переменные; `themeChanged` → пересчёт. ADAPT: добавить переменные в `css/slides.css`. | CSS `:root` |
| **Share** | Заменить `sharing.js`/`<sharing>` на `openTelegramLink` / `switchInlineQuery` с текстом результата. ADAPT `sharing.js`. | `<sharing>` |
| **Лидерборд** | Определить, что есть «score» (напр. итог песочницы/турнира или дошёл-до-конца) → `POST /score` с initData → `GET /leaderboard` экран. | `tournament/*`, `iterated/round/end` |
| **RU/EN toggle** | Два словаря в `Words` + кнопка-переключатель + ре-рендер; язык в CloudStorage; дефолт по `WebApp.initDataUnsafe.user.language_code`. | `Words.js`, `words.en/ru.html` |
| **BackButton** | `BackButton.onClick(() => publish("slideshow/...prev"))`; show/hide по слайду. | Slideshow |
| **Loader UX** | `subscribe("preloader/progress", r => …)` → прогресс-бар; на слабой сети — спиннер. | `preloader/progress|done` |

## 5. Адаптация webview (из CODE-MAP §9)
- `ready()` + `expand()` сразу; ресайз canvas под `viewportStableHeight`, `devicePixelRatio`.
- Звук: разблокировать на первом жесте (PLAY); проверить Howler в webview.
- Шрифт `.ttf`: fallback на системный, если не подхватился.
- `100vh`/`position:fixed`: учесть safe-area и таб-бар Telegram.

## 6. Хостинг / запуск
- `webapp/` — **HTTPS обязателен** (иначе Telegram не откроет Mini App). Локально для теста — HTTPS-туннель (`cloudflared`/`ngrok`) поверх `python3 -m http.server`.
- Bot token / DB creds — в `.env` (gitignored), не в клиентском бандле.
- В @BotFather: создать бота, привязать Mini App (`/newapp`), задать URL.

## 7. Открытые вопросы для plan-фазы (этапов)
- Что именно считается «score» для лидерборда и какие режимы (`mode`)? Best vs last?
- Сохранять ли в прогрессе ещё и состояние песочницы (payoff'ы/популяция), или только номер слайда?
- Дефолт языка: по `language_code` юзера или всегда спрашивать?
- Нужен ли отдельный экран лидерборда внутри Mini App или ссылка/сообщение от бота?

## 8. Рекомендуемая нарезка на этапы (MVP)
1. **Каркас:** `git init`, скопировать игру в `webapp/`, подключить SDK, `ready()/expand()`, прогон в Telegram (туннель). Тонкий бот `/start` → web_app кнопка.
2. **RU/EN + тема + хаптика** (чистый фронт, наш слой).
3. **Save прогресса** (CloudStorage).
4. **Бэкенд + initData-auth + лидерборд** (Postgres, миграции, API, экран).
5. **Share** + полиш webview (viewport/звук/шрифт) + manual-чеклист.

Каждый этап — отдельный прогон pipeline (`/discover → /plan → … → /commit-pr`).
