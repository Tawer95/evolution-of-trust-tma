Phase 6 pipeline. Quality gates → cleanliness-gate → final-audit. Финал = STOP перед ручной проверкой юзера.

## A. Quality gates (параллельно, один message)

**Backend** (если diff трогает `backend/`):
1. `cd backend && python -m ruff check . 2>&1 | tail -20` (F401 покрывает dead imports).
2. `cd backend && python -m ruff format --check . 2>&1 | tail -20`
3. Изменённые `.py` → `cd backend && python -m pyright $(git diff main...HEAD --name-only -- 'backend/**/*.py') 2>&1 | tail -30`.
4. Тесты/код затронуты → `cd backend && PYTHONPATH=. python -m pytest -q -x --tb=short -k "<feature_keyword>" 2>&1 | tail -30` (быстрый scoped). Keyword спроси, если не очевиден.

**Frontend** (если diff трогает `webapp/`):
5. **i18n parity EN/RU:** если есть `tools/i18n-parity.*` — запусти; иначе сравни множества `id` из `webapp/words.en.html` и `webapp/words.ru.html` (symmetric difference пуст). MISMATCH → перечисли разницу.
6. Опц. lint нашего слоя: `npx eslint webapp/js/telegram 2>&1 | tail -20` (если eslint настроен).

## B. Cleanliness-gate
Механический скан изменений (committed + untracked). База: `git merge-base origin/main HEAD` (fallback `main` или `BASE_SHA`).
```bash
FILES=$( { git diff $(git merge-base origin/main HEAD)...HEAD --name-only; git ls-files --others --exclude-standard; } | sort -u )
[ -n "$FILES" ] && grep -nE 'console\.log|debugger|breakpoint\(|pdb\.set_trace|print\(' $FILES   # debug-вывод
[ -n "$FILES" ] && grep -nE '@pytest\.mark\.(skip|xfail)|\.skip\(|xit\(|fit\(' $FILES            # забытые skip
git diff $(git merge-base origin/main HEAD)...HEAD -U0 | grep '^+' | grep -nE 'TODO|FIXME|XXX|HACK' # session-TODO (added lines)
```
Каждый ненулевой результат — в таблицу. **Не авто-блок:** вывожу находки юзеру (`оставить осознанно / убрать`), не чищу молча.

## C. Final-audit
Один чистый полный прогон (не scoped):
1. `cd backend && PYTHONPATH=. python -m pytest -q 2>&1 | tail -5` — ВЕСЬ suite. Сравни с `BASE_TESTS`: ≥ baseline, ноль падений. (Нет бэкенда в этом этапе → отметь «backend не затронут».)
2. Спот-чек **Verification/DoD из плана** — пройтись по пунктам, отметить ✅/❌ фактом (не «по памяти»).
3. Scope-чек diff: `git diff <BASE_SHA>...HEAD --stat` (+ untracked) — нет файлов вне плана (артефакт, секрет, лишний `.claude/*`).
4. Diff трогает `backend/app/db/migrations/` → `alembic downgrade <prev> && upgrade head` (идемпотентность) + `alembic check` (модель↔миграция).

Один проход. Final-audit красный → STOP + report, **не** авто-раунды (integrity-critical).

## Итоговая таблица
| Check | Status | Fail summary |
|---|---|---|
| ruff check / format | ✅/❌/n-a | … |
| pyright | ✅/❌/n-a | … |
| pytest (scoped) | ✅/❌/n-a | … |
| i18n parity EN/RU | ✅/❌/n-a | … |
| cleanliness (debug/skip/TODO) | ✅/⚠️ | counts + файлы |
| final-audit (full pytest + DoD + scope) | ✅/❌ | … |

## D. Manual-чеклист (обязателен для ЛЮБОГО прогона)
STOP-доклад невалиден без явного списка «что проверить руками»:
- **Открыть Mini App в реальном Telegram** (desktop + mobile webview через HTTPS-туннель), пройти затронутый флоу.
- Фича/фикс → секция «Manual» (3–7 конкретных шагов) в `docs/manual-tests/` ИЛИ в STOP-докладе.
- **Integrity-path** (initData / лидерборд / save) → сценарий с реальным initData + попытка подделки (подменённый hash/score → должно reject).

Все ✅ (cleanliness ⚠️ допустим при явном «оставить осознанно») — **STOP, доложи:** «Изменения готовы, gates + final-audit зелёные. Manual-чеклист: <список/файл>. Жду твоей ручной проверки (включая Telegram). После — `/commit-pr <title>`.»

Любой ❌ — «зафиксь и перезапусти /verify».

## Принципы
- Gates (A) параллельно; cleanliness (B) и final-audit (C) после.
- Не фиксить fail сам (кроме bounded self-heal в /implement). Cleanliness репортит, не чистит молча.
- **Никогда не вызывай /commit-pr автоматически.** Юзер всегда тестирует руками (в Telegram) перед commit.
