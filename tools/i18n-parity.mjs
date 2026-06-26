// Проверка parity ключей <p id> между words.en.html и words.ru.html.
// Запуск из корня проекта: node tools/i18n-parity.mjs
import { readFileSync } from "node:fs";

function ids(file) {
  const html = readFileSync(file, "utf8");
  const set = new Set();
  const re = /<p\s+id=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) set.add(m[1]);
  return set;
}

const en = ids("webapp/words.en.html");
const ru = ids("webapp/words.ru.html");
const missingRu = [...en].filter((x) => !ru.has(x));
const extraRu = [...ru].filter((x) => !en.has(x));

console.log(`EN ids: ${en.size}, RU ids: ${ru.size}`);
if (missingRu.length) console.log(`Missing in RU (${missingRu.length}): ${missingRu.slice(0, 40).join(", ")}`);
if (extraRu.length) console.log(`Extra in RU (${extraRu.length}): ${extraRu.slice(0, 40).join(", ")}`);

if (!missingRu.length && !extraRu.length) {
  console.log("OK — parity");
} else {
  console.log("MISMATCH — missing-in-RU покрыт EN-фолбэком в Words.get; extra-in-RU не используется");
  process.exitCode = 1;
}
