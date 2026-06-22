Phase 3 pipeline. Создаёт ветку для реализации плана.

Slug или название ветки: $ARGUMENTS

## Что делать

1. `git status --short` — если working tree dirty:
   - Unstaged изменения → попроси уточнить (stash / commit на текущей ветке / abort).
   - Untracked logs/docs/.md → ОК, переедут.

2. **Secret-scan** `git diff` (и untracked) на:
   - **Telegram bot token:** `[0-9]{8,10}:[A-Za-z0-9_-]{35}`
   - прокси: `HTTPS_PROXY`, `HTTP_PROXY`, `proxy=`
   - generic: `password\s*=`, `secret\s*=`, `api[_-]?key\s*=`, `BOT_TOKEN\s*=\s*[0-9]`
   Найдено → abort с explanation (секрет в git запрещён даже в приватном репо).

3. Определи префикс по slug: `feat/`, `fix/`, `refactor/`, `perf/`, `docs/`, `chore/`. Не очевидно — спроси.

4. `git fetch origin && git checkout -b <prefix>/<slug> origin/main` (или указанной базы — спроси, если не `main`). Если remote/origin ещё нет (репо только создан) — `git checkout -b <prefix>/<slug>` от текущего HEAD, отметь это.

5. Verify: `git log --oneline -3 && git branch --show-current`.

6. **Baseline-якорь** в plan-файле (секция `## Baseline`):
   - `BASE_SHA: $(git rev-parse HEAD)` — точка отсчёта diff'а;
   - `BASE_TESTS: <N passed>` — итог `cd backend && PYTHONPATH=. pytest -q | tail -1` (если бэкенд есть; красный baseline → STOP: на сломанной базе не строим).

7. Сообщи «готов к /implement».

## Принципы
- Никогда не создавай ветку поверх dirty tree без approval.
- Базируйся от `origin/main` (не от локального main, если он отстал), кроме первого раза до push.
- Ветка с таким именем существует → спроси «checkout существующую или новое имя?».
