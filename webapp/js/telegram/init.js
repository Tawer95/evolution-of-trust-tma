// Telegram WebApp init + viewport-fit — наш слой (namespace TG). Движок игры не трогает.
// Fit: дизайн-кадр #game_frame 960×600 (игра 540 + футер 60) масштабируем под вьюпорт,
// scale = min(W/960, H/600, 1) — cap=1: вниз фитим (mobile/узкое окно), вверх НЕ зумим (широкий desktop-webview).
// Работает и вне Telegram (обычный браузер) — fit() считает от window.innerWidth/innerHeight.
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  window.TG = window.TG || {};
  if (tg) {
    window.TG.wa = tg;
    tg.ready();   // скрыть loader Telegram, Mini App готов
    tg.expand();  // развернуть на максимальную высоту
  }

  var FRAME_W = 960, FRAME_H = 600;
  function fit() {
    var availW = window.innerWidth;
    // viewportStableHeight (Telegram) стабильнее innerHeight при появлении его UI; вне TG — innerHeight.
    var availH = (tg && tg.viewportStableHeight) ? tg.viewportStableHeight : window.innerHeight;
    if (!availW || !availH) return;
    var scale = Math.min(availW / FRAME_W, availH / FRAME_H, 1);
    document.documentElement.style.setProperty("--game-scale", String(scale));
  }

  fit();
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  if (tg && tg.onEvent) tg.onEvent("viewportChanged", fit);
})();
