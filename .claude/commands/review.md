Phase 5 pipeline. Параллельный multi-agent code review текущей ветки.

## Что делать

1. Verify: `git diff <BASE_SHA из baseline plan-файла>...HEAD --stat` (+ untracked) показывает изменения. 0 файлов → abort «нечего ревьюить».

2. **Состав по масштабу диффа** (review не скипается НИКОГДА — меняется только глубина):
   - обычный/большой дифф ИЛИ затронут integrity-path (initData / лидерборд / save-прогресс) / миграции → `Agent(subagent_type=code-reviewer, …)` — полный multi-agent (5 reviewer'ов параллельно, severity-таблица);
   - тривиальный дифф (доки, конфиг-строки, ≤ ~30 строк кода БЕЗ integrity-path) → один `architect`-агент с тем же форматом severity-таблицы.

3. После возврата:
   - Покажи юзеру таблицу.
   - P0 issues → предложи «фиксить через /implement или принять risk explicit».
   - Только P2 → «можно continue к /verify, P2 в backlog».

## Принципы
- Не сглаживай выводы reviewer'ов.
- Не делай свой review поверх — это уже сделали агенты.
- Не запускай review на main или пустой ветке.
- **Conflicting reviewers T3** (orchestrate.md → Decision Gates): security советует X, optimizer ¬X (или architect vs ux-reviewer) → не разрешай сам, AskUserQuestion с обеими позициями + рекомендация.
- **Scope drift T1:** проблема явно вне scope ветки → отдельной строкой в таблице + вопрос (`fix in this PR / defer / separate PR`). Не расширяй PR молча.
