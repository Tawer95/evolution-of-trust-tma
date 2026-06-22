// Telegram WebApp init — наш слой (namespace TG). Движок игры не трогает.
// Вне Telegram (обычный браузер) — no-op, чтобы игра игралась как оригинал.
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (!tg) return;
  window.TG = window.TG || {};
  window.TG.wa = tg;
  tg.ready();   // скрыть loader Telegram, сообщить что Mini App готов
  tg.expand();  // развернуть на максимальную высоту
})();
