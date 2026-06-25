# План — Stage 2: RU/EN + тема + хаптика + viewport-fit

**Дата:** 2026-06-22 · **Slug:** stage-2-i18n-theme-fit · **Ветка:** `feat/stage-2-i18n-theme-fit`

## Понимание задачи (intent-check)
Добавить: (1) рантайм-переключатель EN/RU без перезагрузки; (2) тему Telegram **только на chrome/рамку** (игра остаётся белой — решение юзера); (3) хаптику; (4) **починить обрезку** игры по краям (uniform scale-to-fit). Движок не переписываем — минимальный ADAPT + слой `js/telegram/`. **Критерий приёмки:** в Telegram игра вписывается в экран без обрезки (desktop+mobile); тумблер RU/EN меняет весь текст на любом слайде; тёмная/светлая тема красит рамку/футер/UI, игра белая; тап даёт хаптику.

## Дефолты (approve плана = approve дефолтов)
- **D1 (тема):** игра всегда белая; `--tg-theme-*` применяем к `#main`-фону (letterbox-поля), `#footer`, `#preloader`, нашему `#lang_toggle`. Игровой `Background`/контент не трогаем.
- **D2 (язык):** дефолт из `initDataUnsafe.user.language_code` (`ru*`→RU, иначе EN); **без персиста** в Stage 2 (персист языка+прогресса → Stage 3).
- **D3 (хаптика):** `impactOccurred('light')` на тапах кнопок (делегированный click на `#slideshow`) + `notificationOccurred` на `iterated/round/end`. Не на каждый системный клик.
- **D4 (scale):** `scale = Math.min(1, innerW/960, (stableH-60)/540)` — не апскейлим (desktop как в оригинале), на мобиле даунскейл до полной видимости (letterbox).
- **D5 (parity):** при расхождении ключей RU/EN — `Words.get` фолбэк на EN (не «undefined»); parity-tool репортит расхождения (warn, не блок).

## Baseline (на /branch)
- `BASE_SHA: <rev-parse HEAD после ветки от origin/main>`; `BASE_TESTS: 2 (backend Stage 1)`.

## Pre-flight
APIs уже сверены в discovery (theme `--tg-theme-*` 6.0, haptics 6.1, viewport vars 6.0, safe-area 8.0 + `env()` fallback, `language_code`). Доп. сверки не требуется.

## Шаги (atomic; per-step проверка)

**[1] COPY words.en/ru.html.** `cp webapp/words.html webapp/words.en.html`; `cp docs/reference/words-ru.html webapp/words.ru.html`. Проверка: `grep -c '<p id' webapp/words.en.html webapp/words.ru.html` (оба > 0).

**[2] tools/i18n-parity.mjs CREATE.** Node-скрипт: парсит `<p id>` из обоих, печатает symmetric difference. Проверка: `node tools/i18n-parity.mjs` → "OK" либо список расхождений (учитываем в [3] фолбэком).

**[3] Words.js ADAPT.** `Words.texts={}`; `convert(file,lang)` → `Words.texts[lang]`; `Words.text` = текущий словарь; `Words.get(id)` → `Words.text[id] || (Words.texts.en||{})[id] || ""` (EN-фолбэк); `Words.setLang(lang)`. Проверка: открыть в браузере — без JS-ошибок, текст рендерится.

**[4] main.js ADAPT (5-8).** `Q.all([loadAssets, convert("words.en.html","en"), convert("words.ru.html","ru")])`; затем `Words.setLang(default)`. Проверка: `grep -n 'words.en.html\|words.ru.html' webapp/js/main.js`; страница грузится.

**[5] TextBox.js / Button.js ADAPT (data-word-id).** TextBox: `self.dom.setAttribute('data-word-id', id)` в `setTextID` (после :19); CharacterTextBox: `desc.setAttribute('data-word-id','character_'+config.character)` (:55). Button: `self.dom.setAttribute('data-word-id', config.text_id)` в конструкторе (:55). Проверка: `grep -rn data-word-id webapp/js/core`; в браузере у текстовых DOM есть атрибут.

**[6] index.html + lang.js CREATE.** index.html: `<div id="lang_toggle">RU/EN</div>` в `#footer` между `#sound` (79) и `#select` (80); подключить `js/telegram/lang.js` после `init.js`. lang.js: дефолт-язык из `language_code` → `Words.setLang` (после загрузки words); клик по тумблеру → `setLang` + ре-рендер: `document.querySelectorAll('[data-word-id]').forEach(el => el.innerHTML = Words.get(el.dataset.wordId))`. Проверка (manual): тумблер меняет язык на слайдах.

**[7] css/slides.css ADAPT.** `#slideshow_container{transform-origin:center center;transform:scale(var(--game-scale,1));}`; `#main{background-color:var(--tg-theme-bg-color,#fff);}`; `#footer{background:var(--tg-theme-secondary-bg-color,#222);}`; `#preloader`/`#lang_toggle` — theme-цвета; `#translations{width:auto;max-width:100%;}`. Игровой контент (#slideshow, Background) — НЕ трогаем (белый). Проверка: узкое окно браузера → игра по центру, не обрезана; футер/фон themed.

**[8] init.js ADAPT (scale-fit).** Функция `fit()`: `var vh = (TG.wa&&TG.wa.viewportStableHeight)||window.innerHeight; var s=Math.min(1, window.innerWidth/960,(vh-60)/540); document.documentElement.style.setProperty('--game-scale',s);`. Вызвать на load, `window.addEventListener('resize',fit)`, и `TG.wa.onEvent('viewportChanged',fit)` (если TG). Работает и вне Telegram. Проверка: `node --check webapp/js/telegram/init.js`; узкое окно браузера → масштаб меняется.

**[9] haptics.js CREATE + wire.** Делегированный `#slideshow` click → `if(TG.wa&&TG.wa.isVersionAtLeast&&TG.wa.isVersionAtLeast('6.1')) TG.wa.HapticFeedback.impactOccurred('light')`; `subscribe('iterated/round/end',function(p){...notificationOccurred...})`. Подключить в index.html после lang.js. Проверка: `node --check`; manual — хаптика на устройстве.

## Verification / DoD
- `node tools/i18n-parity.mjs` — OK или известные расхождения (покрыты EN-фолбэком).
- `node --check` для init.js/lang.js/haptics.js — без ошибок.
- Браузер (узкое окно): игра вписана, не обрезана; RU/EN переключается; фон/футер themed.
- Backend gates не затронуты (`pytest` 2 passed остаётся).
- **Manual в Telegram** (`docs/manual-tests/stage-2.md`): нет обрезки (desktop+mobile), игра по центру; RU/EN на слайдах 0/3/7; тёмная+светлая тема (рамка themed, игра белая); хаптика; **тап-точность после масштабирования** (PLAY, кнопки, слайдеры).

## Pre-mortem (топ-3)
1. **RU-ключи ≠ EN** (fan-перевод notdotteam) → пропуски. Митигация: EN-фолбэк в `Words.get` + parity-tool. Детект: parity-tool + ручной RU-проход.
2. **CSS-scale ломает тап-координаты PixiJS** (canvas масштабирован transform'ом). PIXI обычно берёт `getBoundingClientRect` (учитывает transform) → должно работать, но **обязательно проверить тап-точность вручную** (mobile). Детект: manual — нажать PLAY/кнопки/слайдеры на мобиле.
3. **Ре-рендер пропускает элементы без data-word-id** (CharacterTextBox/динамика). Митигация: маркер на всех текстовых DOM. Детект: переключить язык на слайде с персонажами (credits).

## Фактчек (verification ladder)
- `[verified file:line]` Words.js (get/convert), main.js:5-8, slides.css #slideshow 960×540/#slideshow_container/#main, Button.js:14/55, TextBox.js:19/55, index.html #footer:74/#sound:75/#select:80.
- `[verified-docs]` `--tg-theme-*` auto-инжект (6.0), haptics 6.1, viewport vars 6.0, safe-area 8.0+`env()`, `language_code`.
- **Итог: все факты verified.**

## Triple self-review
- **Фронт/TMA:** engine-правки минимальны и оправданы (i18n: Words.texts/фолбэк, main.js boot, data-word-id; viewport: CSS-scale, движок не трогаем). Наша логика — в `js/telegram/`. Тема = только chrome (решение D1). Version guards (6.1/8.0).
- **Бэк/API+БД:** не затронуто.
- **Domain:** integrity-path не тронут (initData/лидерборд/save — позже). Эстетика игры (белый фон) сохранена; parity EN/RU c фолбэком; scale uniform (без искажений).
