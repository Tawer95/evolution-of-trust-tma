// RU/EN переключатель — наш слой. Дефолт из Telegram language_code (untrusted, только для UI).
(function () {
  var lang = "en";
  try {
    var tg = window.Telegram && window.Telegram.WebApp;
    var lc = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
    if (lc && /^ru/i.test(lc)) lang = "ru";
  } catch (e) { /* нет Telegram — остаёмся на en */ }

  // main.js (window.onload .then) вызовет Words.setLang(Words.currentLang) до первого рендера.
  if (window.Words) window.Words.currentLang = lang;

  function wire() {
    var btn = document.getElementById("lang_toggle");
    if (!btn || !window.Words) return;
    var label = function () { btn.textContent = (window.Words.currentLang === "ru") ? "EN" : "RU"; };
    label();
    btn.onclick = function () {
      var next = (window.Words.currentLang === "ru") ? "en" : "ru";
      window.Words.setLang(next);
      window.Words.rerender();
      label();
      if (window.TG && TG.wa && TG.wa.HapticFeedback && TG.wa.isVersionAtLeast && TG.wa.isVersionAtLeast("6.1")) {
        TG.wa.HapticFeedback.selectionChanged();
      }
    };
  }
  // #lang_toggle объявлен в index.html выше этого скрипта — доступен сразу.
  wire();
})();
