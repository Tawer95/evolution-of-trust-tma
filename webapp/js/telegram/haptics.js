// Хаптика Telegram — наш слой. Цепляется к тапам и к концу раунда; вне Telegram — no-op.
(function () {
  function canHaptic() {
    var w = window.TG && TG.wa;
    return w && w.HapticFeedback && w.isVersionAtLeast && w.isVersionAtLeast("6.1");
  }

  // light impact на тапах по игре (делегированно, без правки движка)
  var stage = document.getElementById("slideshow");
  if (stage) {
    stage.addEventListener("click", function (e) {
      // только по реальным игровым кнопкам (.button), не по фону слайда
      if (canHaptic() && e.target && e.target.closest && e.target.closest(".button")) {
        TG.wa.HapticFeedback.impactOccurred("light");
      }
    }, true);
  }

  // notification на результате раунда (seam: iterated/round/end [payoffs])
  if (window.subscribe) {
    subscribe("iterated/round/end", function (payoffs) {
      if (!canHaptic()) return;
      var mine = (payoffs && payoffs[0] != null) ? payoffs[0] : 0;
      TG.wa.HapticFeedback.notificationOccurred(mine >= 0 ? "success" : "warning");
    });
  }
})();
