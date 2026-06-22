Phase 2 pipeline. Запускает planner subagent для implementation plan с 3 self-review passes.

Задача / slug discovery: $ARGUMENTS

## Что делать

1. Если аргумент — slug, прочитай `docs/discoveries/<slug>.md`. Нет файла → спроси «нет discovery, делать без него или сначала /discover?».

2. **Батч вопросов (единственное штатное окно).** Собери ВСЕ «Открытые вопросы» discovery + свои развилки → ОДИН AskUserQuestion (до 4, multiSelect где уместно), с рекомендацией первым option'ом. Ответы → в план. После approve плана вопросов до Review-гейта быть не должно.

3. Запусти `Agent(subagent_type=planner, prompt="...")` с полным контекстом:
   - Полная задача (из discovery или $ARGUMENTS) + ответы батча шага 2.
   - Discovery findings (если был /discover).
   - Напоминание: «обязательно 6-шаговая процедура с triple self-review по Фронт/TMA · Бэк/API+БД · Domain. См. свой system prompt + CLAUDE.md».

4. **Обязательные секции плана** (planner не дал — дописать/перезапустить):
   - **Понимание задачи** (intent-check): 2–4 строки «как понял + критерии приёмки своими словами».
   - **Дефолты:** предсказуемые мелкие развилки «если X → делаю Y, отмечу в отчёте».
   - **Per-step проверка:** у КАЖДОГО шага — машинная проверка (команда/тест/grep + ожидаемый результат). Шаг без проверки — не шаг.
   - **Pre-mortem:** топ-3 риска + как детектируем каждый.
   - **Verification/DoD** — для final-audit Phase 6 (+ manual-чеклист для рук юзера, включая сценарии в Telegram).

5. **Обязательный фактчек плана** (анти-галлюцинации): выбери 5–10 фактических утверждений (события pub/sub / поля / endpoints / WebApp-методы / версии пакетов) и проверь сам через Grep/Read/docs. Integrity-константы (HMAC initData) — двойное заземление (orchestrate.md → Verification ladder). Расхождение → перезапуск planner. Итог строкой: «Фактчек: N/N verified».

6. Покажи summary плана + путь к файлу + вызови ExitPlanMode для approval. После approve допиши в plan-файл решения гейта и ответы батча.

## Принципы
- Не пиши план сам — это работа planner agent.
- Перепроверь планер, не доверяй слепо (правило 10).
- **Decision Gates** (orchestrate.md): T3-развилки → батч шага 2, не зашивай выбор в план молча.
- **Verification ladder:** утверждения несут маркер `[verified file:line]` / `[verified docs]`; `inferred` обязан стать verified до Implement; `assumption` → батч.
