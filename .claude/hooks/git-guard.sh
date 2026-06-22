#!/bin/bash
# PreToolUse-гард git-инвариантов проекта (чистая история, PR-only флоу).
# Блокирует: push в main/master, любой force-push, --no-verify, git add -A/.
# Exit 2 = deny (stderr уходит модели как объяснение). Exit 0 = allow.

INPUT=$(cat)

CMD=$(printf '%s' "$INPUT" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
")

[ -z "$CMD" ] && exit 0

deny() {
    echo "git-guard: $1" >&2
    exit 2
}

# `git` обязан стоять в начале команды или сразу после разделителя (;|&|()) —
# иначе ловили бы упоминания git внутри echo/строк.
GIT_AT="(^|[;&|(]|&&|\|\|)[[:space:]]*(command[[:space:]]+)?git[[:space:]]"

if printf '%s' "$CMD" | grep -qE "${GIT_AT}[^|;&]*\bpush\b"; then
    printf '%s' "$CMD" | grep -qE '\bpush\b[^|;&]*(--force\b|--force-with-lease|\s-f\b)' \
        && deny "force-push запрещён всегда (история не переписывается)"
    printf '%s' "$CMD" | grep -qE '\bpush\b[^|;&]*\b(origin|upstream)\s+(main|master)\b' \
        && deny "push в main запрещён — только через PR (feature-ветка + /commit-pr)"
    printf '%s' "$CMD" | grep -qE '\bpush\b[^|;&]*HEAD:(main|master)\b' \
        && deny "push HEAD:main запрещён — только через PR"
fi

printf '%s' "$CMD" | grep -qE "${GIT_AT}[^|;&]*\b(commit|push)\b[^|;&]*--no-verify" \
    && deny "--no-verify запрещён — pre-commit hooks (gitleaks) не обходим, фиксим причину"

printf '%s' "$CMD" | grep -qE "${GIT_AT}add[[:space:]]+(-A\b|--all\b|\.[[:space:]]*($|;|&|\|))" \
    && deny "git add -A/. запрещён — стейджим файлы селективно по списку плана"

exit 0
