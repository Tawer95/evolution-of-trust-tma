Phase 7 pipeline. Финальный commit + push + PR. ВЫЗЫВАЕТСЯ ТОЛЬКО ПО ЯВНОМУ ЗАПРОСУ ЮЗЕРА после его ручной локальной верификации (включая открытие Mini App в Telegram).

PR title: $ARGUMENTS

## Pre-flight (ОБЯЗАТЕЛЬНО)

1. **Manual-чеклист по пунктам.** Найди чеклист прогона (verify Phase 6 / `docs/manual-tests/<slug>.md`) и спроси через AskUserQuestion, ПЕРЕЧИСЛИВ ключевые пункты: «Прошёл ли ты: <пункт 1…N>, включая открытие Mini App в Telegram?». Ответ «нет/частично» → abort (без ручного теста не коммитим).

2. **Sanity:**
   - `git status --short` — что закоммитим.
   - `git diff --cached` (или `git diff`) | `grep -inE '[0-9]{8,10}:[A-Za-z0-9_-]{35}|HTTPS?_PROXY|proxy=|password\s*=|secret\s*=|api[_-]?key\s*=|BOT_TOKEN\s*=\s*[0-9]'` — bot token / прокси / секреты. Найдено → abort.
   - `git log -3 --oneline` — стиль prev commits.

## Что делать

3. **Append-запись в `docs/LOG.md`** (ДО стейджинга — едет в тот же PR):
   ```
   ## <YYYY-MM-DD> — <задача/этап> (PR #<N — проставить после создания>)
   - <3-7 буллетов: что сделано, ключевые решения, важные фиксы review>
   - Тесты: <N passed>; Manual: <чеклист пройден / Telegram desktop+mobile>
   ```

4. **Stage selectively** — НЕ `git add .` (git-guard заблокирует). Перечисли файлы по логике плана; untracked вне scope → спроси. `.claude/*`-tooling в stage-PR не подмешивать без явного ок.

5. **Commit message** — `-F` файл, structured:
   ```
   <type>(<scope>): <one line summary>

   <2-4 строки контекста: зачем, что меняется, какие риски>

   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
   ```
   `<type>` ∈ feat/fix/refactor/perf/docs/test/chore. `<scope>` = модуль (telegram-layer, leaderboard, bot, slides…). pre-commit auto-fix (end-of-file/trailing) может прервать 1-й commit → `git add <те же файлы>` + повтор.

6. **Push:** `git push -u origin <branch>` (git-guard не пустит main/force). Первый push новой ветки — добавь `-u`.

7. **PR:** `gh pr create` (если `gh` установлен и авторизован) ИЛИ GitHub REST API `POST /repos/<owner>/<repo>/pulls` (токен из `git credential fill` — **в вывод не печатать**). Body — формат «<Этап>: … — Complete» из CLAUDE.md (Summary / Key Deliverables / Testing / How to Verify / Out of Scope; на русском). Атрибуция: порт CC0-игры Nicky Case, где уместно. **Тело заканчивается строкой:** `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Готовь тело в `/tmp/pr_<slug>.md`. После создания — проставь PR # в свежей записи LOG.md.

8. Верни юзеру PR URL.

9. **Предложи нетехнический отчёт о прогрессе** одной строкой (`/progress-report <этап>`). НЕ генерировать без согласия.

## Принципы
- Никогда `git add .` / `-A`; никогда `--no-verify`; никогда force-push (git-guard дублирует механически).
- pre-commit hook упал → фикси причину, **не** обходи.
- Не уверен в manual-тесте — шаг 1 решает; «наверное тестировал» не считается.
