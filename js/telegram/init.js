// Telegram WebApp init + viewport-fit — наш слой (namespace TG). Движок игры не трогает.
// Вне Telegram (обычный браузер) — TG-часть no-op, масштабирование работает (для теста).
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    window.TG = window.TG || {};
    window.TG.wa = tg;
    tg.ready();   // скрыть loader Telegram, Mini App готов
    tg.expand();  // развернуть на максимальную высоту
  }

  // Игра спроектирована под дизайн-кадр 960×540 без resize-логики (CODE-MAP §9).
  // #main сделан 960×540 (см. css), поэтому Splash/Background/Scratcher меряются по нему корректно;
  // здесь только подбираем общий масштаб #main под реальный вьюпорт. Размеры окна доступны всегда
  // (не зависим от рендера слайда) — надёжный триггер.
  function fit() {
    var vh = (tg && tg.viewportStableHeight) ? tg.viewportStableHeight : window.innerHeight;
    var avail = vh - 60; // минус высота футера
    var scale = Math.min(1, window.innerWidth / 960, avail / 540);
    if (scale > 0) document.documentElement.style.setProperty("--game-scale", scale);
  }
  fit();
  window.addEventListener("resize", fit);
  if (tg && tg.onEvent) tg.onEvent("viewportChanged", fit);
})();
