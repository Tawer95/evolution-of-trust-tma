# ARCHITECTURE — «Эволюция доверия» (TMA), карта текущего состояния

Текущая карта проекта: слои, инварианты, ключевые решения, долги. История — `docs/LOG.md`. Правила — `CLAUDE.md`. Полное ТЗ — `docs/TZ-trust-tma-v1.0.md`.

## Статус по этапам
- **Stage 0 — scaffold** (в `main`): pipeline `.claude`, доки, ТЗ. (Влит в PR #1.)
- **Stage 1 — каркас** (в `main`, PR #1 merged): игра скопирована в `webapp/` as-is; Telegram WebApp SDK + `js/telegram/init.js` (`ready`/`expand`); aiogram-бот `/start` → web_app-кнопка.
- **Stage 2 — RU/EN + тема + хаптика + viewport-fit** (ветка `feat/stage-2-i18n-theme-fit`, **в работе**: реализован, viewport переработан после manual-теста, **ожидает ручного теста в Telegram + PR**).
- Stage 3 (save/CloudStorage), 4 (лидерборд+initData), 5 (share+полиш+деплой) — впереди (ТЗ Часть IV).

## Слои
```
Telegram client
 ├─ Mini App (webview) ──HTTPS──> webapp/ (статика)
 │    js/lib|core|sims|slides   = движок игры (порт as-is, НЕ трогаем без причины)
 │    js/telegram/{init,lang,haptics}.js = наш слой (namespace TG), цепляется к pub/sub
 │    css/slides.css            = вёрстка движка + наш override-блок (Stage 2)
 │    words.en.html / words.ru.html = i18n-контент
 └─ Bot (long polling) <── aiogram ── backend/app/bot
backend/app: bot (aiogram) · core (config) · [api/db/services — Stage 4]
```

## Фронтенд — ключевое
- **Граница:** движок ↔ наш слой только через pub/sub (`publish`/`subscribe`) + минимальные точечные ADAPT (ниже). Глобалы оригинала (`c_`, `createjs`, `Ticker`, `Words`) уважаем.
- **Наш слой `js/telegram/`:** `init.js` (ready/expand + viewport-fit), `lang.js` (RU/EN тумблер), `haptics.js` (тапы/раунды). Подключены в `index.html` ПОСЛЕ `main.js`.
- **Загрузка:** `index.html` грузит `telegram-web-app.js` в `<head>` (до `window.onload`), затем оригинальные script-теги, затем наш слой.

### Engine ADAPT-точки (минимальные правки движка — watch при обновлении оригинала)
| Файл | Правка | Зачем |
|---|---|---|
| `index.html` | SDK в `<head>`; `js/telegram/*` после `main.js`; `#lang_toggle` в `#footer` | подключение слоя/SDK |
| `js/main.js:5-13` | Q.all грузит `words.en/ru.html`; `Words.setLang(currentLang)` до рендера | i18n two-dict |
| `js/core/Words.js` | `Words.texts={en,ru}`, `Words.text=texts[lang]`, `get` +EN-фолбэк (возвращает `""`, не undefined), `setLang`, `rerender` | i18n + ре-рендер |
| `js/core/TextBox.js`, `Button.js` | маркер `data-word-id` (+`data-uppercase`) на текстовых DOM | ре-рендер при смене языка |
| `css/slides.css` | override-блок: viewport-fit + тема + `#translations:none` + `#lang_toggle` | фит/тема/UI |

## Бэкенд — ключевое
- `app/bot/main.py` (Dispatcher, polling), `handlers/start.py` (`cmd_start` → `WebAppInfo` кнопка), `keyboards.py`, `core/config.py` (pydantic-settings; `BOT_TOKEN`, `WEBAPP_URL` обязателен → fail-fast). Гейты: ruff/pyright/pytest (изолированный `backend/.venv`).
- API/БД/лидерборд — Stage 4 (ещё нет).

## Ключевые инварианты / решения
1. **As-is порт:** игровой движок не переписываем; только ADAPT-точки выше, всё прочее — в `js/telegram/`.
2. **Integrity-path** (Stage 4+, STOP при расхождении): валидация initData (HMAC), целостность лидерборда, save прогресса. Алгоритм initData — `docs/TZ-…-v1.0.md` §15 (verified-docs). Пока не реализовано.
3. **Decision A (тема):** игровой кадр (`#main`) **всегда белый** — слайды прозрачны, рисованная эстетика сохраняется; тема Telegram (`--tg-theme-*`, авто-инжект) красит только chrome: `body` (letterbox), `#footer`, `#lang_toggle`, метки звука, `#preloader`.
4. **Viewport-fit:** игра спроектирована под фикс 960×540 без resize-логики. Решение: **`#main` = дизайн-кадр 960×540** (`position:absolute`, центр над футером, `overflow:hidden`), масштабируем сам `#main` через `--game-scale` = `min(1, innerW/960, (stableH−60)/540)` (init.js, на load/resize/`viewportChanged`). Критично: `Splash/Background/Scratcher` меряют размер по `$("#main").clientWidth` → он обязан быть 960 (`transform` не меняет `clientWidth`), иначе симуляции рассинхронятся. `#footer` — `position:fixed` снизу (не масштабируется).
5. **i18n:** `Words.texts={en,ru}` (оба грузятся на boot), `Words.text` = текущий, `get` с EN-фолбэком; ре-рендер по `[data-word-id]`; дефолт языка из `initDataUnsafe.user.language_code`. **Parity EN/RU обязателен** (`tools/i18n-parity.mjs`; сейчас 232=232).
6. **Хаптика:** `impactOccurred('light')` только по `.button`-тапам + `notificationOccurred` на `iterated/round/end`; guard `isVersionAtLeast('6.1')`.

## Известные риски / долги (watch)
- **Тап-точность после CSS-scale** (PixiJS/Slider) — проверять вручную на mobile (pre-mortem). Симуляции используют HTML-кнопки + `getBoundingClientRect` → теоретически ок.
- **Анимации иногда отваливаются** — наблюдалось при старом подходе (scale на контейнере); ожидается улучшение после фикса (#main=design) — подтвердить ручным тестом.
- **Тултипы (`data-balloon`)** не ре-рендерятся при смене языка (косметика).
- **Десктоп:** игра показывается 960×540 центрированно с letterbox (не full-bleed как оригинал) — следствие фикс-кадра.
- **Хостинг:** dev — Netlify Drop (эфемерный URL) под VPN; cloudflared блокируется системным VPN (DNS). Постоянный хостинг (GitHub Pages / Pages) — к Stage 5/деплою. `reference-code/` — временный эталон, удалить в конце проекта.
