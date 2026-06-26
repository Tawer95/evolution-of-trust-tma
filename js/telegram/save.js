// Сохранение прогресса (слайд + язык) в Telegram CloudStorage — наш слой.
// Restore при повторном открытии: оверлей «Продолжить / Сначала». Вне Telegram / <6.9 — no-op.
(function () {
  function cs() {
    var w = window.TG && TG.wa;
    if (w && w.CloudStorage && w.isVersionAtLeast && w.isVersionAtLeast("6.9")) return w.CloudStorage;
    return null;
  }
  function firstId() { return (window.SLIDES && SLIDES[0]) ? SLIDES[0].id : null; }
  function validSlide(id) { return !!(window.SLIDES && SLIDES.some(function (s) { return s.id === id; })); }

  window.TG = window.TG || {};
  TG.cloud = cs;                                   // общий доступ (lang.js использует для языка)
  TG.saveLang = function (lang) {
    var c = cs();
    if (c && lang) c.setItem("lang", String(lang), function () {});
  };

  // SAVE: на смене слайда (кроме первого/splash — иначе затрём прогресс)
  if (window.subscribe) {
    subscribe("slideshow/slideChange", function (id) {
      var c = cs();
      if (!c || !id || !window.SLIDES || !SLIDES.length || id === SLIDES[0].id) return; // не сохраняем splash / до готовности SLIDES
      c.setItem("slide", String(id), function () {});
    });
  }

  // RESTORE: один раз после первого рендера
  var done = false;
  if (window.subscribe) {
    subscribe("slideshow/slideChange", function () {
      if (done) return;
      done = true;
      var c = cs();
      if (!c) return;
      c.getItem("slide", function (err, val) {
        if (err || !val || val === firstId() || !validSlide(val)) return; // нет / splash / невалидный id
        _resumePrompt(val);
      });
    });
  }

  function _t(ru, en) { return (window.Words && Words.currentLang === "en") ? en : ru; }

  function _resumePrompt(savedSlide) {
    if (document.getElementById("resume_overlay")) return;
    var o = document.createElement("div");
    o.id = "resume_overlay";
    var box = document.createElement("div"); box.className = "resume_box";
    var txt = document.createElement("div"); txt.className = "resume_text";
    txt.textContent = _t("Продолжить с того места, где ты остановился?", "Continue where you left off?");
    var cont = document.createElement("div"); cont.className = "resume_btn";
    cont.textContent = _t("Продолжить", "Continue");
    cont.onclick = function () {
      if (o.parentNode) o.parentNode.removeChild(o);
      publish("slideshow/goto", [savedSlide]);
    };
    var restart = document.createElement("div"); restart.className = "resume_btn resume_btn--ghost";
    restart.textContent = _t("Сначала", "Restart");
    restart.onclick = function () {
      if (o.parentNode) o.parentNode.removeChild(o);
      var c = cs(); if (c) c.removeItem("slide", function () {});
    };
    box.appendChild(txt); box.appendChild(cont); box.appendChild(restart);
    o.appendChild(box);
    document.body.appendChild(o);
  }
})();
