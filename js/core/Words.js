/**********************

Convert a word.html to a JSON containing innerHTMLs

**********************/

window.Words = {};
Words.texts = {};        // { en:{...}, ru:{...} } — Telegram-слой грузит оба (Stage 2)
Words.text = null;       // текущий словарь = Words.texts[currentLang]
Words.currentLang = "en";

Words.get = function(id){
	var w = Words.text && Words.text[id];
	if(w == null && Words.texts.en) w = Words.texts.en[id]; // EN-фолбэк при пропуске перевода
	return w == null ? "" : w;
};

Words.setLang = function(lang){
	if(Words.texts[lang]) Words.currentLang = lang;
	Words.text = Words.texts[Words.currentLang] || Words.texts.en || {};
};

// Ре-рендер видимых текстов при смене языка (маркер data-word-id ставят TextBox/Button).
Words.rerender = function(){
	var els = document.querySelectorAll("[data-word-id]");
	for(var i=0;i<els.length;i++){
		var el = els[i];
		var w = Words.get(el.getAttribute("data-word-id"));
		if(el.getAttribute("data-uppercase")) w = (w || "").toUpperCase();
		el.innerHTML = w;
	}
};

Words.convert = function(filepath, lang){

	// Promise
	var deferred = Q.defer();

	// Get dat stuff
	var request = pegasus(filepath);
	request.then(

		// success handler
		function(data, xhr) {

			// Convert HTML...
			var words = document.createElement("div");
			words.innerHTML = xhr.response;
			var paragraphs = words.querySelectorAll("p");

			// ...to a JSON (в словарь языка)
			var dict = {};
			for(var i=0;i<paragraphs.length;i++){
				var p = paragraphs[i];
				dict[p.id] = p.innerHTML;
			}
			Words.texts[lang] = dict;

			// Fulfil promise!
			deferred.resolve(dict);

		},

		// error handler (optional)
		function(data, xhr) {
			alert("AHHHHHHHHHHHH, PROBLEM LOADING WORDS");
			console.error(data, xhr.status)
		}

	);

	// Return Promise
	return deferred.promise;

};
