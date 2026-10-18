// Fails when any language misses a key that English has, or has a key English does not (spec §2.4, §13).
//   pnpm i18n:check
import { allMessages, keyPaths, LOCALES } from '@hub/i18n';

const en = new Set(keyPaths(allMessages.en));
let problems = 0;
for (const locale of LOCALES.filter((l) => l !== 'en')) {
  const keys = new Set(keyPaths(allMessages[locale]));
  const missing = [...en].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !en.has(k));
  if (missing.length || extra.length) {
    problems += missing.length + extra.length;
    if (missing.length) console.error(`${locale}: missing ${missing.length}: ${missing.join(', ')}`);
    if (extra.length) console.error(`${locale}: not in English ${extra.length}: ${extra.join(', ')}`);
  }
}
if (problems) process.exit(1);
console.log(`i18n: ${en.size} keys, complete in ${LOCALES.join(', ')}.`);
