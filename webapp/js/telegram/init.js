// Telegram WebApp init — наш слой (namespace TG). Движок игры не трогает.
// Viewport-fit делается через <meta name="viewport" content="width=960"> (фикс-ширина, браузер масштабирует) — JS не нужен.
// Вне Telegram (обычный браузер) — no-op.
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (!tg) return;
  window.TG = window.TG || {};
  window.TG.wa = tg;
  tg.ready();   // скрыть loader Telegram, Mini App готов
  tg.expand();  // развернуть на максимальную высоту
})();
