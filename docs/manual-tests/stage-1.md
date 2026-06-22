# Stage 1 — Ручная проверка: Каркас (Telegram WebApp + бот)

## Предусловия
- `.env` заполнен: `BOT_TOKEN`, `WEBAPP_URL` (HTTPS-туннель).
- Бот создан в @BotFather.

## Сценарии
1. **Статика локально:** `cd webapp && python3 -m http.server 8080` → открыть `http://localhost:8080` в браузере → игра грузится (splash, PLAY), JS-ошибок в консоли нет (`init.js` — no-op вне Telegram).
2. **HTTPS-туннель:** `cloudflared tunnel --url http://localhost:8080` → скопировать `https://…trycloudflare.com` в `.env` → `WEBAPP_URL`.
3. **Бот:** `cd backend && pip install -e ".[dev]" && python -m app.bot.main`.
4. **Mini App:** в Telegram `/start` → приветствие + кнопка «Играть» → нажать → Mini App открывается на всю высоту (`expand`).
5. **Игра в Telegram:** splash рендерится (PixiJS), тап PLAY → звук + первый слайд; пролистать 2–3 слайда, потыкать кнопки.
6. **Mobile:** повторить п.4–5 в мобильном Telegram.

## Регресс (не сломалось)
- Игра вне Telegram (обычный браузер) грузится и играется как оригинал — `init.js` не мешает.

## Чек-лист
- [ ] `python3 -m http.server` отдаёт игру, JS-ошибок нет
- [ ] cloudflared даёт HTTPS-URL, вписан в `.env`
- [ ] бот стартует без ошибок
- [ ] `/start` → кнопка «Играть»
- [ ] Mini App открывается, `expand` на всю высоту
- [ ] PixiJS рендер + звук по PLAY + слайды листаются
- [ ] проверено на desktop + mobile Telegram
