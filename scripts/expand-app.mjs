import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const part1 = path.join(root, 'scripts', 'app.part1.b64');
const part2 = path.join(root, 'scripts', 'app.part2.b64');
const single = path.join(root, 'scripts', 'app.tsx.gz.b64');
const outPath = path.join(root, 'src', 'App.tsx');

let b64;
if (fs.existsSync(part1) && fs.existsSync(part2)) {
  b64 = fs.readFileSync(part1, 'utf8').trim() + fs.readFileSync(part2, 'utf8').trim();
} else if (fs.existsSync(single)) {
  b64 = fs.readFileSync(single, 'utf8').trim();
} else {
  console.error('Missing App.tsx restore data in scripts/');
  process.exit(1);
}
const buf = zlib.gunzipSync(Buffer.from(b64, 'base64'));
fs.writeFileSync(outPath, buf);
console.log('Restored src/App.tsx (' + buf.length + ' bytes)');
