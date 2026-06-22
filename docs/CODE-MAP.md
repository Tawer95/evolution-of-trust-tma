# CODE-MAP — архитектура оригинала «The Evolution of Trust»

Карта кода оригинальной игры (`reference-code/ncase-trust`) — чтобы портировать в Telegram Mini App и переоткрыть всё после удаления `reference-code/`. Vanilla JS, **без build-системы**: всё грузится `<script>`-тегами в порядке из `index.html`. Русский форк (`notdotteam-trust`) отличается ТОЛЬКО `words.html` + заголовком `index.html`.

> **Статус верификации:** основано на чтении исходников (Explore-агент, 48 файловых обращений) + ручная сверка ключевых фактов. События pub/sub, payoff'ы, стратегии, состав ассетов — verified из кода. Версии минифицированных либ и точные номера строк — `[inferred]`, перепроверить в `webapp/` после копирования (для порта as-is версии не критичны — везём вендоренные файлы как есть).

## 1. Bootstrap и глобалы
- **Порядок загрузки** (`index.html`): libs → core → sims → slides → `js/main.js`.
- **Boot** (`js/main.js`): `window.onload` → `Q.all([ Loader.loadAssets(Loader.manifestPreload), Words.convert("words.html") ])` → убрать `#preloader`, показать `#main`/`#footer` → `new Slideshow({dom, slides: SLIDES})` → `new SlideSelect(...)` → `subscribe("start/game", …)` → `Loader.loadAssets(Loader.manifest, onDone, onProgress)` → `slideshow.nextSlide()`.
- **Глобалы:** `slideshow`, `slideSelect` (main.js); `c_ = {}` (кэш minpubsub, объявлен в index.html ДО minpubsub); `createjs = window` (алиас для Tween/Ticker); `Ticker.framerate=60; Ticker.paused=true`; `_` и `$` (helpers.js: транзиентный стейт слайда + селектор); `Math.TAU`.
- **Pub/Sub** (minpubsub: `publish(channel, [args])` / `subscribe(channel, fn)` / `unsubscribe`). Каналы (verified grep'ом):

| Канал | Аргументы | Смысл |
|---|---|---|
| `preloader/progress` | `[ratio]` | прогресс загрузки ассетов 0–1 |
| `preloader/done` | — | ленивые ассеты загружены |
| `start/game` | — | нажата PLAY → показать навигатор слайдов |
| `slideshow/next` | — | следующий слайд |
| `slideshow/goto` / `slideshow/scratch` | `[slideID]` | переход на слайд (с анимацией scratch) |
| `slideshow/slideChange` | `[slideID]` | **слайд сменился** (главный seam для save) |
| `iterated/cooperate` / `iterated/cheat` / `iterated/TRIP` | — | ход игрока в Iterated |
| `iterated/round/end` | `[payoffs]` | раунд завершён, payoff'ы `[A,B]` |
| `iterated/newOpponent` | `[strategyID]` | сменить стратегию соперника |
| `tournament/reset` / `step/completed` / `autoplay/start` / `autoplay/stop` / `play` / `eliminate` / `reproduce` | — | управление турниром/эволюцией |
| `pd/editPayoffs/[R\|T\|S\|P]` | `[value]` | правка ячейки payoff-матрицы |
| `pd/defaultPayoffs` / `payoffs/onchange` | — | сброс/уведомление об изменении |
| `rules/turns` / `rules/noise` / `rules/evolution` | `[value]` | параметры песочницы |
| `sandbox/pop/<strategyID>` | `[count]` | численность популяции стратегии |

## 2. Движок (`js/core/*`)
- **Loader.js** — манифесты ассетов. `Loader.manifest` (ленивая загрузка с прогрессом) vs `Loader.manifestPreload` (до первого слайда). `Loader.loadAssets(manifest, onComplete, onProgress)` → Q. Картинки/спрайты — через `PIXI.loader`; звуки — Howler (`Loader.sounds`).
- **Slideshow.js** — конечный автомат слайдов. `nextSlide()`, `gotoSlide(id)`, `add(objConfig)`, `remove(id)`, `clear()`, `reset()`. Лайфцикл слайда: `onend` прошлого → `onstart` нового → `publish("slideshow/slideChange",[id])`. Слушает `slideshow/next`, `slideshow/goto`.
- **SlideSelect.js** — точки-навигация внизу; клик → `publish("slideshow/scratch",[id])`; обновляются по `slideshow/slideChange`.
- **Button.js** — кнопка (DOM). Конфиг `{id,x,y,text_id,size,tooltip,active,onclick,message,sound,uppercase}`. Клик → SFX (`button1..3.mp3`) + `onclick()` + `publish(message)`. Слушает `[id]/activate`, `[id]/deactivate`. **Главный seam для хаптики.**
- **TextBox.js** — текстовый div; `setTextID(wordID)` тянет из Words. `CharacterTextBox` — портрет персонажа + описание.
- **Words.js** — i18n-движок (см. §5).
- **IncDecNumber.js** — числовой спиннер (правка payoff'ов).
- **Slider.js** — драг-слайдер (turns/noise/evolution); touch-события маппятся на mouse.
- **Scratcher.js** — полноэкранная scratch-анимация перехода между слайдами; `Scratcher.scratch(gotoID)` → Q; звуки `scratch_in/out.mp3`; слушает `slideshow/scratch`.
- **Background.js** — фон-прямоугольник на весь `#main` (считает размеры под вьюпорт).
- **ImageBox.js** — `<img>` с CSS-позиционированием.
- **PayoffsUI.js** — интерактивная 2×2 матрица (фон `assets/ui/payoffs_ui.png` + спиннеры R/T/S/P → `pd/editPayoffs/*`).

## 3. Симуляции (`js/sims/*`)
- **Splash.js** — декоративный граф «пипов» с отталкиванием от курсора (PIXI.Application, `resolution:2`).
- **PD.js** — ядро механики. `PD.COOPERATE`/`PD.CHEAT`; `PD.PAYOFFS_DEFAULT={P:0,S:-1,R:2,T:3}`; `PD.PAYOFFS` (мутабельная); `PD.NOISE`. 8 стратегий `Logic_*` (см. GAME-OVERVIEW). `PD.getPayoffs(m1,m2)`, `PD.playOneGame`, `PD.playRepeatedGame(a,b,turns)`, `PD.playOneTournament(agents,turns)`. `PEEP_METADATA` — frame+color на стратегию.
- **Iterated.js** — визуализация авто-матча: два `IteratedPeep`, автомат, монеты, анимации Tween. `chooseOpponent(id)`, `playOneRound(move)` → `publish("iterated/round/end",[payoffs])`, `highlightPayoff`. `IteratedScoreboard` — счёт.
- **Tournament.js** — round-robin + эволюция. `Tournament.SELECTION=5`, `NUM_TURNS=10`, `INITIAL_AGENTS`. `playOneTournament()`, `eliminateBottom(X)`, `reproduceTop(X)`, `reset()`. Агенты — кольцо PIXI-контейнеров.
- **SandboxUI.js** — панель с вкладками POPULATION / PAYOFFS / RULES + кнопки START/STEP/RESET (→ `tournament/*`).

## 4. Слайды (`js/slides/*`)
Каждый слайд — объект в глобальном массиве `SLIDES`:
```js
SLIDES.push({
  id: "oneoff",
  onstart: function(self){ self.add({id, type:"Iterated", x, y}); self.add({id, type:"Button", text_id, onclick}); },
  onend: function(self){ /* cleanup */ },
  onjump: function(self){ /* re-init при прямом переходе */ }
});
```
`self.add({type, id, ...})` инстанцирует объект соответствующего core/sims-класса. Файлы `0_Slides_Intro.js` … `9_Slides_Credits.js` + `X_Slides_Feetnotes.js`.

## 5. Words / i18n (`js/core/Words.js` + `words.html`)
- `Words.convert("words.html")` (вызов на boot) → pegasus GET HTML → парс всех `<p id="wordID">` → `Words.text[wordID] = innerHTML` (с тегами/ссылками) → Q.
- `Words.get(wordID)` → HTML-строка; TextBox/Button инжектят через innerHTML.
- **Перевод оригинала:** переводится содержимое `<p id=...>` в `words.html` + заголовки `index.html`. Русский — `docs/reference/words-ru.html`.
- **Для рантайм-переключателя EN/RU (наш план):** грузить оба файла → `Words.texts = {en:{…}, ru:{…}}` + `Words.currentLang`; `Words.get` возвращает по текущему языку; при переключении — ре-рендер видимых TextBox/Button. Картинки/звук перегружать не нужно. **Parity ключей EN/RU обязателен.**

## 6. Библиотеки (`js/lib/*`)
helpers.js (`$`, `Math.TAU`, Tween-обёртки, listen/unlisten) · pegasus.js (XHR) · minpubsub.src.js (`publish`/`subscribe`, кэш `c_`) · q.js (промисы) · pixi.min.js (рендер; `[inferred]` v4–5) · howler.js (звук; `[inferred]` v2) · tweenjs-0.6.2.min.js (CreateJS Tween+Ticker) · sharing.js (заменяет `<sharing>`-тег на FB/Twitter/email-ссылки — **наш seam для Telegram share**). Сайд-эффекты в index.html: `var c_={}`, `var createjs=window`, `Ticker.framerate=60;Ticker.paused=true`.

## 7. Ассеты (`assets/`)
Каталоги: `ui/`, `iterated/`, `tournament/`, `splash/`, `conclusion/`, `evolution/`, `sounds/` (16 mp3, вкл. `bg_music.mp3` ~2.3MB). Спрайты — `.json`+`.png` (sprite sheets для PIXI). Репо ~16MB (с .git); ассеты `[inferred]` ~9MB. Пути относительные (`assets/...`). Кэш-бастинг `?v11` на всех тегах. **manifestPreload** `[inferred]`: splash-спрайты + sound-иконка; всё прочее — ленивое с прогрессом.

## 8. Persistence / network / analytics
- **localStorage/sessionStorage — НЕ используются. Сохранения нет.** (verified grep'ом — пусто.)
- Сеть: только `pegasus("words.html")` на boot + загрузка локальных ассетов. Внешних CDN нет.
- Аналитики нет.
- Шаринг (`sharing.js`) — хардкод-ссылки FB/Twitter/mailto, `window.open(_blank)`.

## 9. Риски Telegram-webview (что адаптировать)
| Риск | Где | Имплликация для порта |
|---|---|---|
| `window.onload` | main.js | webview может инжектиться иначе; проверить таймингом, при необходимости fallback на `DOMContentLoaded` + `Telegram.WebApp.ready()`. |
| Фикс-размер canvas + `resolution:2` | Splash/Iterated/Tournament | DPI мобильных 1–3x; учитывать `window.devicePixelRatio`, масштаб под `viewportStableHeight`. |
| `100vh` / `position:fixed` футер | css/slides.css | визуальный вьюпорт мобилы ≠ 100vh; safe-area; футер может уезжать. |
| Autoplay звука | main.js (bg_music на PLAY) | webview блокирует автоплей — разблокировка по жесту (PLAY — это жест, ок), но проверить. |
| Внешние ссылки `window.open` | sharing.js | заменить на `Telegram.WebApp` share / `openTelegramLink`. |
| Шрифт `@font-face` (.ttf) | css/slides.css | может не подхватиться — fallback на системный. |
| scratch-анимация 60fps | Scratcher.js | на слабом Android может лагать. |
| `?v11` кэш | index.html | Telegram агрессивно кэширует — версионировать ассеты при апдейте. |

## 10. Integration seams (куда цепляться нашему `js/telegram/`-слою БЕЗ правки движка)
| # | Где (file / channel) | Telegram-фича |
|---|---|---|
| 1 | `subscribe("slideshow/slideChange",[id])` | **CloudStorage**: сохранить текущий слайд (+ восстановить на boot через `slideshow/goto`). |
| 2 | `Button.js` клик / `publish(message)` | **Haptics** на тапах. |
| 3 | `subscribe("preloader/progress")` / `preloader/done` | UX загрузки (прогресс-бар поверх; `MainButton`/спиннер). |
| 4 | `subscribe("iterated/round/end",[payoffs])` | Haptics на результате раунда; данные для share/score. |
| 5 | `subscribe("start/game")` | `expand()`, скрыть `#translations`, инициализация слоя. |
| 6 | `<sharing>`-тег / `sharing.js` | **Share** через Telegram. |
| 7 | `pd/editPayoffs/*`, `rules/*`, `sandbox/pop/*` | (опц.) CloudStorage-пресеты песочницы; данные для лидерборда. |
| 8 | `tournament/step/completed` / `reproduce` / `eliminate` | результат эволюции → возможный score лидерборда. |
| 9 | CSS-переменные в `css/slides.css` | **Theme**: маппинг `--tg-theme-*`. |

**Принцип:** наш код подписывается на эти каналы и вызывает `Telegram.WebApp.*`; движок (`js/core|sims|slides|lib`) не правим (кроме точечной замены `sharing.js` и добавления theme-переменных в CSS — отмечено как ADAPT).
