// Copies the 3D Fluent Emoji used by the vocabulary into public/emoji.
// Usage: node scripts/copy-emoji.js <path to unpacked @lobehub/fluent-emoji-3d>/assets
const fs = require('fs');
const path = require('path');
const src = process.argv[2];
if (!src) throw new Error('pass the assets folder of @lobehub/fluent-emoji-3d');
const root = path.join(__dirname, '..');
const files = [path.join(root, 'src/data/concepts.ts'), ...fs.readdirSync(path.join(root, 'src/data/words')).filter((f) => /\.ts$/.test(f)).map((f) => path.join(root, 'src/data/words', f))];
const emojis = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\['[a-z0-9-]+', '[a-z]+', '([^'a-z\/][^']{0,12})'/g)) emojis.add(m[1]);
  for (const m of s.matchAll(/[a-z]+: \['[a-z]+', '([^']+)'\]/g)) emojis.add(m[1]);
}
const out = path.join(root, 'public/emoji');
fs.mkdirSync(out, { recursive: true });
const code = (e) => [...e].map((ch) => ch.codePointAt(0).toString(16));
let ok = 0; const missing = [];
for (const e of emojis) {
  const full = code(e);
  const stripped = full.filter((c) => c !== 'fe0f');
  const cands = [full.join('-'), stripped.join('-'), [...stripped, 'fe0f'].join('-')];
  const hit = cands.map((c) => path.join(src, `${c}.webp`)).find((p) => fs.existsSync(p));
  if (hit) { fs.copyFileSync(hit, path.join(out, `${stripped.join('-')}.webp`)); ok++; } else missing.push(e);
}
console.log(`copied ${ok} emoji, missing: ${missing.join(' ') || 'none'}`);
