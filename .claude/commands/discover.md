Phase 1 pipeline. Research-фаза для новой задачи.

Задача: $ARGUMENTS

## Что делать

1. Создай папку `docs/discoveries/` если нет.

2. Сгенерируй slug из задачи (kebab-case, ≤ 5 слов). Пример: «нужен лидерборд» → `leaderboard-api`.

3. Определи характер задачи и запусти субагентов параллельно (один message):
   - Трогает **Telegram-платформу** (initData / CloudStorage / theme / haptics / share / web_app кнопки) → `Agent(Explore, ...)` (inventory кода) + `Agent(tma-expert, ...)` (релевантные WebApp/aiogram docs).
   - Трогает **движок игры / механику / контент** (слайды, симуляции, words) → `Agent(Explore, ...)` + `Agent(game-engine-expert, ...)`.
   - Чисто **бэк / UI нашего слоя** → только `Explore`.
   - **Схема БД** меняется → + `Agent(migration-engineer, ...)` (текущий HEAD / грабли).
   - **Оптимизация** → `Explore` + опц. `optimizer`.

4. Каждому агенту — **узкое задание**: «найти X в файлах Y, вернуть file:line + 1-3 строки выводов, лимит ≤ 600 слов».

5. **Перепроверь** — если агент сослался на функцию/файл/событие/метод, прогрепай 1-2 ключевых утверждения сам.

6. Собери findings в `docs/discoveries/<YYYY-MM-DD>-<slug>.md`. **Completeness-чеклист — все секции обязательны; пустая = явное «не затронуто»** (no silent gaps):
   - **Задача** (1 параграф).
   - **Фронт (webapp):** затронут движок (`js/core|sims|slides`) или только наш `js/telegram/`-слой; нужна ли правка `index.html`; новые ассеты.
   - **Бэк (backend):** endpoints, services, repos, фоновые задачи.
   - **БД:** таблицы / нужна ли миграция / индексы / уникальности.
   - **Telegram-платформа:** какие WebApp-методы (+ минимальная `WebApp.version`), нужен ли initData-auth, CloudStorage, share; **факты — из офиц. docs, не из памяти**.
   - **i18n:** затронуты ли `words.en/ru` или UI-строки; parity EN/RU.
   - **Integrity-path:** что затрагивает валидацию initData / целостность лидерборда / сохранение прогресса.
   - **Референс:** таблица COPY/ADAPT/CREATE/SKIP **с причиной** для каждого ADAPT/SKIP (из `reference-code/...:line` или `docs/CODE-MAP.md`) — против намерения задачи, не «так было в оригинале».
   - **Runtime-окружение:** env (`BOT_TOKEN`, DB creds), HTTPS-туннель для теста в Telegram, что нужно для manual-теста.
   - **Затронутые файлы** (file:line + 1-2 строки) и **релевантные docs** (`docs/CODE-MAP.md` / `docs/TMA-INTEGRATION.md`).
   - **Открытые вопросы для plan-фазы** — уходят ОДНИМ батчем в /plan (см. orchestrate.md → Батчинг вопросов).

7. Выведи юзеру: краткое summary (≤ 150 слов) + путь к discovery + «следующий шаг — `/plan <slug>`».

## Принципы
- Опирайся на факты, не догадки. Никакого кода — только research.
- **Source discipline** (orchestrate.md → Decision Gates): каждое утверждение о коде = `file:line` + доказательство; не верифицировано → `[НЕ ВЕРИФИЦИРОВАНО]` или сначала verify.
- Несколько архитектурных подходов с trade-offs (T3) — **не выбирай в discovery**, опиши все в «Открытые вопросы». Выбор делает юзер на Plan.
- Discovery с тем же slug уже есть → подтверди overwrite.
