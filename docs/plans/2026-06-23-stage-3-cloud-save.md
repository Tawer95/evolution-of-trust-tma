# План — Stage 3: Сохранение прогресса (CloudStorage)

**Дата:** 2026-06-23 · **Slug:** stage-3-cloud-save · **Ветка:** `feat/stage-3-cloud-save` (стек на feat/stage-2 пока тот не влит)

## Понимание задачи
Сохранять текущий слайд (+ язык) в Telegram CloudStorage; при повторном открытии — оверлей «Продолжить с того места / Сначала». Вне Telegram или старее Bot API 6.9 — no-op (игра как оригинал). Save = integrity-path (STOP при расхождении).

## Findings (verified чтением кода)
- `Slideshow.js:58` (`nextSlide`) и `:132` (`gotoSlide`) публикуют `publish("slideshow/slideChange", [self.currentSlide.id])` — надёжный сигнал смены слайда с id. [verified]
- `Slideshow.js:137` `subscribe("slideshow/goto", id => gotoSlide(id))` — восстановление через `publish("slideshow/goto",[id])`. [verified]
- `SLIDES[0].id` — первый/splash-слайд (его НЕ сохраняем, иначе затрём прогресс). [verified Slideshow.js:1, main.js:57]
- CloudStorage: `CloudStorage.setItem/getItem/removeItem(key, val?, cb)` — Bot API **6.9** (guard `isVersionAtLeast('6.9')`). [verified-docs]

## Дефолты
- Сохраняем `slide` (кроме splash) + `lang`. Restore-оверлей на первом рендере, если есть сохранённый не-splash слайд. «Сначала» чистит `slide`. Текст оверлея — по `Words.currentLang`.
- Порядок скриптов: `init → save → lang → haptics` (lang.js использует `TG.cloud`/`TG.saveLang` из save.js).

## Шаги
**[1]** `webapp/js/telegram/save.js` (CREATE): `TG.cloud()` (guarded CloudStorage|null), `TG.saveLang`; save слайда на `slideshow/slideChange` (skip `SLIDES[0].id`); restore — один раз на первом slideChange: `getItem("slide")` → если не-splash → оверлей «Продолжить»(`goto`)/«Сначала»(`removeItem`). Проверка: `node --check`.
**[2]** `webapp/js/telegram/lang.js` (ADAPT): на toggle → `TG.saveLang(next)`; на boot → `TG.cloud().getItem("lang")` → если `ru`/`en` → `setLang`+`rerender` (если уже отрендерено). Проверка: `node --check`.
**[3]** `webapp/index.html` (ADAPT): подключить `save.js` между `init.js` и `lang.js`. Проверка: grep порядок.
**[4]** `webapp/css/slides.css` (ADAPT): `#resume_overlay` + `.resume_box/.resume_btn` под тему (`--tg-theme-*`). Проверка: grep.

## Verification / DoD
- `node --check` save.js/lang.js OK; serve OK; parity не затронут.
- **Manual в Telegram:** дошёл до слайда N → закрыл Mini App → открыл → оверлей → «Продолжить» → слайд N; «Сначала» → splash (сохранение очищено); язык сохраняется между сессиями. Вне Telegram (браузер) — оверлея нет, игра как обычно (регресс).

## Pre-mortem
1. **Save затирает прогресс splash'ем** (первый slideChange) → skip `id===SLIDES[0].id`. Детект: ручной — после splash сохранён всё ещё глубокий слайд.
2. **Async getItem timing** (язык применяется поздно) → в колбэке `setLang`+`rerender` если `Words.text` уже готов; иначе только `currentLang`. Детект: язык на первом кадре.
3. **CloudStorage недоступен** (<6.9 / не Telegram) → `TG.cloud()` = null → весь слой no-op. Детект: браузер — без ошибок.

## Triple self-review
- **Фронт/TMA:** движок не трогаем (только наш `js/telegram/` + wire + css; seams `slideChange`/`goto` verified). CloudStorage guard 6.9.
- **Бэк:** не затронут (CloudStorage клиентский, без БД).
- **Domain:** integrity-path (save) — не затираем прогресс (skip splash), restore явный (оверлей), «Сначала» чистит. Эстетика/тема — оверлей под decision A (themed chrome).
