Master-команда. Запускает полный pipeline: Discover → Plan → Branch → Implement → Review → Verify. Финал = STOP перед commit/PR (юзер тестирует локально руками, **обязательно в реальном Telegram-клиенте**).

Задача: $ARGUMENTS

## Что делать (выполняй последовательно, без skip фаз)

### Phase 1 — Discover
1. Сгенерируй slug из задачи (kebab-case, ≤ 5 слов): например «leaderboard-api», «telegram-init-layer».
2. Выполни инструкции `.claude/commands/discover.md` для этой задачи.
3. После завершения — НЕ останавливайся, переходи к Phase 2.

### Phase 2 — Plan
1. Выполни `.claude/commands/plan.md` со slug из Phase 1.
2. **APPROVAL GATE #1.** Войди в plan mode через ExitPlanMode для approve плана пользователем.
3. **Дождись approve.** Правки юзера → передай planner для перезапуска с фидбеком.

### Phase 3 — Branch
1. Выполни `.claude/commands/branch.md` со slug.
2. Verify: `git branch --show-current` ≠ main.

### Phase 4 — Implement
1. Выполни `.claude/commands/implement.md`.
2. TaskCreate для tracking каждого step плана.
3. Hooks автоматически: PreToolUse git-guard (push main / force / --no-verify / add -A.).
4. Bounded self-heal: механический gate-fail → 1 авто-попытка, потом STOP (integrity-path / логику не чиним молча). См. `implement.md`.

### Phase 5 — Review
1. Выполни `.claude/commands/review.md`.
2. **APPROVAL GATE #2.** Покажи severity-таблицу.
3. **Дождись решения:** «фиксить P0/P1» (→ Phase 4) или «принять и продолжить» (→ Phase 6).

### Phase 6 — Verify (ФИНАЛЬНАЯ ФАЗА)
1. Выполни `.claude/commands/verify.md` (gates → cleanliness → final-audit).
2. ❌ → STOP, попроси юзера разобраться. НЕ фикси сам без approval (integrity-critical).
3. ✅ → **STOP, доложи:** «Pipeline завершён. Gates + cleanliness + final-audit зелёные. Ветка: <name>. Жду твоей ручной проверки (включая открытие Mini App в Telegram). После тестирования — введи `/commit-pr <title>`.»

### Phase 7 — Commit + PR (НЕ ВЫЗЫВАЕТСЯ ИЗ /orchestrate)
**КРИТИЧНО:** `/orchestrate` НИКОГДА не запускает Phase 7. Юзер всегда тестирует локально руками (в Telegram) перед commit. Phase 7 — **только** по явному `/commit-pr <title>`.

## Принципы
- Один прогон = одна задача = один PR.
- Approval gates строгие: не «продолжать пока не возразят», а **дождись явного approve**.
- Не пропускай Verify даже на trivial-фиче.
- Hooks работают автоматически — не отключай.
- **Никогда не commit/push/PR автоматически.**

---

## Decision Gates & Source Discipline

> Применяется на всех фазах. Sub-commands (`plan.md`/`implement.md`/`review.md`/`discover.md`) ссылаются сюда.
> **Цель:** ловить материальные развилки до того как принять решение молча. Не «вопросы ради вопросов» — только при реальном trade-off или scope-риске.

### Батчинг вопросов (юзер не дежурит у компа)
- **Plan-фаза — единственное штатное окно вопросов.** Discover выгружает ВСЕ развилки в «Открытые вопросы»; перед написанием плана они задаются ОДНИМ AskUserQuestion-батчем (до 4, multiSelect где уместно). Ответы → в план → Implement/Review/Verify без вопросов.
- **Дефолты в плане:** предсказуемые мелкие развилки план описывает секцией «Дефолты» («если X → делаю Y, отмечу в отчёте»). Approve плана = approve дефолтов.
- **Deferred queue в Implement:** незапланированная развилка, НЕ блокирующая остальные шаги → шаг откладывается, независимые продолжаются, вопросы копятся в батч в конце фазы. Блокирует всё → STOP сразу.
- **Integrity-path исключение:** валидация initData / целостность лидерборда / сохранение прогресса / миграции данных — всегда немедленный STOP, в очередь не откладывается.
- **Триггер «гадание vs дефолт»:** пришлось предположить факт о **намерении юзера** (не о коде — код проверяется grep'ом) → вопрос в батч, не молчаливый выбор.
- На GATE #1/#2 и финальном STOP — push-уведомление (`PushNotification`, если доступен): «нужно решение: <тема>».

### Когда задавать вопрос (а не выбирать самому)
Любой из трёх триггеров → **AskUserQuestion с рекомендацией первым option'ом** (с учётом батчинга).

**T1. Scope drift.** Обнаружили проблему вне scope задачи → не фикси молча, не расширяй PR. Спроси «fix here / defer to backlog / separate PR?» + рекомендация.

**T2. Breaking change в публичном контракте.** Может сломать уже подписанных потребителей:
- API endpoint URL/payload; формат `startapp`-deeplink
- имя pub/sub-события, на которое завязан наш `js/telegram/`-слой
- БД-колонка/таблица с reading callsites вне scope
- env-переменная / config-ключ (если в проде)
Спроси: «backward-compat shim / hard break + migration / version both?» + trade-offs + рекомендация.

**T3. Архитектурное решение с trade-offs.** 2+ материально разных подхода, у каждого минусы → AskUserQuestion, первый option = рекомендация с конкретной причиной. Примеры: «лучший vs последний score в лидерборде», «CloudStorage vs БД для прогресса», «feature flag vs hard cutover», «правим движок vs цепляемся к событию».

### Что НЕ требует вопроса (just do it)
Косметический рефактор внутри scope; bug-fix с одним очевидным решением; regression-тест; format/lint cleanup; применение явных инструкций юзера.

### Source discipline для recommendations
Когда советую конкретное действие на чужой файл/функцию/API («вызвать X()», «обновить поле в file:line», «метод WebApp.Y», «событие Z») — **обязан подтвердить grep/Read/docs ДО рекомендации.** Подтверждено → `file:line` / ссылка на docs. Не подтверждено → `[НЕ ВЕРИФИЦИРОВАНО]` + сначала verify.

### Verification ladder (анти-галлюцинации)
Каждое фактическое утверждение несёт статус: `[verified file:line]` → `[verified docs]` → `[inferred из X]` → `[assumption → вопрос в батч]`.
- В **код** попадает только verified; `inferred` обязан стать verified до Implement.
- **Версии Telegram WebApp методов и API-контракты — никогда из памяти:** офиц. docs / реальный объект initData / `WebApp.version`.
- **Integrity-константы** (алгоритм HMAC initData, формат data-check-string) — двойное заземление: офиц. Telegram docs + рабочий тест-вектор. Расхождение источников = вопрос, не выбор.
- Пустой grep ≠ «не существует» — проверь вторым способом (другое имя/регистр/каталог).
