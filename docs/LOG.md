# LOG — «Эволюция доверия» (TMA)

Append-only история. На каждый PR — запись (в `/commit-pr`). Целиком не читать — grep по дате/этапу.

## 2026-06-22 — Stage 1: Каркас (Telegram WebApp + бот) (PR #1)
- Проект инициализирован: pipeline в `.claude` (10 агентов + 10 команд + git-guard), `CLAUDE.md`, полное ТЗ (`docs/TZ-trust-tma-v1.0.md`, Часть I–IV), справка (`CODE-MAP`/`GAME-OVERVIEW`/`TMA-INTEGRATION`), сырые копии оригинала в `docs/reference/`.
- Игра «The Evolution of Trust» (Nicky Case, CC0) скопирована в `webapp/` as-is — движок (`js/lib|core|sims|slides`) не тронут.
- Telegram-слой `webapp/js/telegram/init.js` (`ready()`/`expand()` + guard вне Telegram); `index.html` ADAPT (SDK в `<head>`, `init.js` после `main.js`, viewport meta).
- aiogram-бот `/start` → inline web_app-кнопка «Играть» (`backend/app`); config через pydantic-settings (`WEBAPP_URL` обязателен — fail-fast); smoke-тест.
- Pre-flight verify: алгоритм initData (`secret_key = HMAC_SHA256("WebAppData", token)`) + aiogram web_app API сверены с офиц. docs (core.telegram.org, docs.aiogram.dev).
- Гейты: ruff/format чисто, pyright 0 errors, pytest 2 passed. Review (architect): блокеров нет; P1 (webapp_url обязателен) пофикшен; P2 принят для этапа.
- Тесты: 2 passed; Manual: подтверждён юзером — игра открывается и играется в реальном Telegram (desktop + mobile, через HTTPS-хостинг Netlify).
- Known issue → Stage 2: viewport-обрезка по краям в webview (fix вместе с RU/EN + темой).
