// RU/EN переключатель + текст подсказки о повороте — наш слой.
// Дефолт языка из Telegram language_code (untrusted, только UI); персист в CloudStorage.
(function () {
  var lang = "en";
  try {
    var tg = window.Telegram && window.Telegram.WebApp;
    var lc = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
    if (lc && /^ru/i.test(lc)) lang = "ru";
  } catch (e) { /* нет Telegram — остаёмся на en */ }
  if (window.Words) window.Words.currentLang = lang;

  // Обновить наш UI (тумблер + подсказка о повороте) под текущий язык.
  function refreshUi() {
    if (!window.Words) return;
    var ru = window.Words.currentLang === "ru";
    var btn = document.getElementById("lang_toggle");
    if (btn) btn.textContent = ru ? "EN" : "RU";
    var hint = document.getElementById("rotate_hint");
    if (hint) hint.textContent = ru
      ? "↻ Поверни телефон — игра будет на весь экран"
      : "↻ Rotate your phone for fullscreen";
  }

  // Восстановить сохранённый язык из CloudStorage (async, приоритетнее language_code).
  (function () {
    var c = window.TG && TG.cloud && TG.cloud();
    if (!c) return;
    c.getItem("lang", function (err, val) {
      if (err || (val !== "ru" && val !== "en") || !window.Words) return;
      window.Words.currentLang = val;
      if (window.Words.text) { window.Words.setLang(val); window.Words.rerender(); } // если уже отрендерено
      refreshUi();
    });
  })();

  function wire() {
    var btn = document.getElementById("lang_toggle");
    if (!btn || !window.Words) return;
    refreshUi();
    btn.onclick = function () {
      var next = (window.Words.currentLang === "ru") ? "en" : "ru";
      window.Words.setLang(next);
      window.Words.rerender();
      refreshUi();
      if (window.TG && TG.saveLang) TG.saveLang(next);
      if (window.TG && TG.wa && TG.wa.HapticFeedback && TG.wa.isVersionAtLeast && TG.wa.isVersionAtLeast("6.1")) {
        TG.wa.HapticFeedback.selectionChanged();
      }
    };
  }
  // #lang_toggle и #rotate_hint объявлены в index.html выше — доступны сразу.
  wire();
})();
