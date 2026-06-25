# Discovery — Stage 2: RU/EN + тема + хаптика + viewport-fit

**Дата:** 2026-06-22 · **Slug:** stage-2-i18n-theme-fit

## Задача
Добавить рантайм-переключатель EN/RU, тему Telegram, хаптику и **починить обрезку игры по краям** в webview. Всё — без переписывания движка (минимальный ADAPT + наш `js/telegram/`-слой). Verified чтением кода (grep).

## Фронт (webapp) — что и где
**i18n (Words):** `webapp/js/core/Words.js` — `Words.get(id)` → `Words.text[id]` (стр.10-11); `convert(file)` парсит `<p id>` → `Words.text[id]=innerHTML` (14-37).
- **План:** грузим `words.en.html` + `words.ru.html` → `Words.texts={en,ru}`; `Words.text = Words.texts[lang]`. `Words.get` НЕ меняем (читает `Words.text`). Boot: `main.js:5-8` Q.all (ADAPT, единственное место).
- **Re-render при смене языка:** TextBox хранит `self.text_id` (TextBox.js:19), Button — `self.config.text_id` (Button.js:14,55). CharacterTextBox `#desc` — прямая инъекция без ключа (TextBox.js:53-56). Подход: добавить `data-word-id` на `.dom` в TextBox/Button (+ на `#desc`) при конструировании — 2-3 строки ADAPT; наш слой по событию смены языка делает `querySelectorAll('[data-word-id]')` → ре-инъекция. `data-balloon` тултипы (Button.js:29) — статичны, ре-рендер опционален.

**Viewport / cropping (root cause, verified):** resize/scale-логики в игре НЕТ. `#slideshow` = 960×540 @ left:-480/top:-270 (slides.css:136-145); `#slideshow_container` = 0×0, centered (130-135); `#main` = 100% × calc(100%-60px), `overflow:hidden` (37-41). На мобиле `#slideshow` overflow'ит влево и клипается. Доп: `#translations` width:960px (slides.css:59) — тоже не адаптивен (виден на splash до старта).
- **Фикс (CSS only):** `#slideshow_container { transform-origin:center; transform:scale(var(--game-scale,1)); }` + в `init.js` на load/resize/`viewportChanged`: `scale = Math.min(innerW/960, (stableH-60)/540)` → `--game-scale`. Иерархия `#main > #slideshow_container > #slideshow > .object` — scale пропагируется на всё, включая PIXI-холсты. `#translations` — отдельно сделать responsive (max-width).

**Toggle:** `index.html` `#footer` (74-132), `#sound` (75-79), `#select` (80). Новый `<div id="lang_toggle">` между 79 и 80 (виден до и после старта).

## Telegram-платформа (verified-docs + версии)
- **Тема:** Telegram авто-инжектит `--tg-theme-<key>` CSS-vars (6.0) — цвета берём прямо в CSS, JS-маппинг не нужен. `colorScheme` (light/dark), событие `themeChanged`. Расширенные ключи (header/section) — 7.0 (guard).
- **Viewport:** `viewportStableHeight`, событие `viewportChanged {isStateStable}`, авто-vars `--tg-viewport-stable-height` (6.0). Safe-area — 8.0 (`safeAreaInset`/`contentSafeAreaInset` + CSS-vars), fallback на CSS `env(safe-area-inset-*)` (работает с `viewport-fit=cover`, уже в meta стр.59).
- **Haptics (6.1):** `impactOccurred(light|medium|heavy|rigid|soft)`, `notificationOccurred(error|success|warning)`, `selectionChanged()`. Guard `isVersionAtLeast('6.1')`.
- **Язык:** `initDataUnsafe.user.language_code` (untrusted, но для UI-дефолта ок). Strip региона; `ru*`→RU, иначе EN.

## БД / Бэк / API / Integrity
— Не затрагиваются (чистый фронт). initData/лидерборд — Stage 4; save прогресса — Stage 3.

## i18n
words.en.html (= копия `webapp/words.html`), words.ru.html (= `docs/reference/words-ru.html`). **Parity ключей EN/RU обязателен** → `tools/i18n-parity.mjs` (сверка множеств `<p id>`).

## Референс (COPY / ADAPT / CREATE / SKIP)
| Источник | Действие |
|---|---|
| `webapp/words.html` → `webapp/words.en.html` | COPY |
| `docs/reference/words-ru.html` → `webapp/words.ru.html` | COPY |
| `js/core/Words.js` (texts dict) | ADAPT |
| `js/main.js:5-8` (Q.all грузит оба) | ADAPT |
| `js/core/TextBox.js`, `Button.js` (data-word-id маркер) | ADAPT (минимум) |
| `css/slides.css` (scale-var, theme `--tg-theme-*`, safe-area, #translations responsive) | ADAPT |
| `js/telegram/init.js` (scale-fit + theme/viewport hooks) | ADAPT |
| `js/telegram/lang.js`, `haptics.js`, `tools/i18n-parity.mjs` | CREATE |

## Runtime-окружение
Без новых env/служб. Тест — в реальном Telegram (HTTPS-хостинг Netlij), desktop + mobile, светлая/тёмная тема, оба языка. Передеплой статики после правок.

## Открытые вопросы для plan-фазы
1. **Тема vs рисованная эстетика (T3 — в батч):** игра нарисована чёрным по белому; тёмная тема Telegram сломает рисунки, если красить фон игры. Варианты: (A) игра всегда на белом, тема только на «рамку»/chrome [рекоменд]; (B) полная адаптация (риск исчезновения арта); (C) без темы.
2. **Дефолты (в план):** язык по `language_code` (ru→RU, иначе EN), **без персиста** в Stage 2 (персист языка + прогресса → Stage 3); хаптика — light на тапах кнопок + notification на `iterated/round/end` (не на каждый клик); letterbox-поля красятся под тему (зависит от вопроса 1).

**Следующий шаг:** ответ на вопрос 1 → `/plan stage-2-i18n-theme-fit`.
