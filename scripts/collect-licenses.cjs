const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'public/licenses');
fs.mkdirSync(destination, { recursive: true });
const manifest = require('../package.json');
const seen = new Set(), entries = [];
function collect(name) {
  if (seen.has(name)) return;
  seen.add(name);
  const directory = path.join(root, 'node_modules', name);
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const filename = name.replace(/^@/, '').replaceAll('/', '-') + '.txt';
  const license = fs.readdirSync(directory).find(file => /^licen[cs]e(\.(md|txt))?$/i.test(file));
  const target = path.join(destination, filename);
  if (license) fs.copyFileSync(path.join(directory, license), target);
  else if (!fs.existsSync(target)) throw Error(`Missing license for ${name}; obtain it from the official source before shipping.`);
  const notice = fs.readdirSync(directory).find(file => /^notice(\.(md|txt))?$/i.test(file));
  if (notice) fs.appendFileSync(target, '\n\nUpstream NOTICE\n' + fs.readFileSync(path.join(directory, notice), 'utf8'));
  entries.push({ name, version: pkg.version, license: pkg.license, file: filename });
  for (const child of Object.keys(pkg.dependencies || {})) collect(child);
}
for (const name of Object.keys(manifest.dependencies)) collect(name);
// Tailwind is a build dependency whose framework styles are included in shipped CSS.
collect('tailwindcss');
fs.copyFileSync(path.join(root, 'public/audio/ja/LICENSE_mei_normal.htsvoice.txt'), path.join(destination, 'mei-voice.txt'));
entries.push({ name: 'HTS Voice Mei (all 50 Japanese clips)', version: '2009–2013', license: 'CC BY 3.0', file: 'mei-voice.txt' });
for (const font of ['barlowcondensed', 'notosansjp']) entries.push({ name: `Google Fonts: ${font}`, version: 'hosted by Google Fonts', license: 'SIL OFL 1.1', file: `${font}-OFL.txt` });
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
fs.writeFileSync(path.join(destination, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mikanra — Third-party notices</title><style>body{max-width:760px;margin:3rem auto;padding:0 1.5rem;font:17px/1.7 system-ui;color:#183b33;background:#fff6e5}a{color:#245f59}li{margin:1rem 0}</style><h1>Third-party notices</h1><p>Mikanra's original code and artwork are © 2026 Bryan. All rights reserved. Listed materials retain their own licenses. No third-party endorsement is implied.</p><ul>${entries.map(entry => `<li><a href="${entry.file}">${escape(entry.name)}</a> — ${escape(entry.version)} · ${escape(entry.license)}</li>`).join('')}</ul><p>The Mei voice was used for local synthesis at a slower teaching pace; output was converted to 24 kHz mono MP3. <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>. No original train recording is distributed.</p><p>Fonts are requested from Google Fonts at runtime. License copies are provided for reference.</p></html>\n`);
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(entries, null, 2) + '\n');
console.log(`Collected ${entries.length} runtime, font and voice notices.`);
