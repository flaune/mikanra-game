// Original procedural sound: synthesized rail texture and a short two-chord chime.
// No recordings, samples, branded station melody, or speech service are used.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const rate = 24000, seconds = 12.5;
const samples = Buffer.alloc(Math.floor(rate * seconds) * 2);
let seed = 1729, filtered = 0;
for (let i = 0; i < samples.length / 2; i++) {
  const t = i / rate;
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  filtered = .96 * filtered + .04 * (seed / 0xffffffff * 2 - 1);
  const fade = Math.min(1, t / .2, Math.max(0, (seconds - t) / 1.5));
  let value = .08 * filtered + .02 * Math.sin(2 * Math.PI * (48 * t - .9 * t * t));
  for (const [start, notes] of [[.45, [523.25, 659.25]], [1.25, [587.33, 783.99]]]) {
    const age = t - start;
    if (age >= 0 && age < 2.8) for (const frequency of notes) value += .11 * Math.min(1, age / .025) * Math.exp(-2.6 * age) * Math.sin(2 * Math.PI * frequency * age);
  }
  samples.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value * fade)) * 32767), i * 2);
}
const header = Buffer.alloc(44);
header.write('RIFF'); header.writeUInt32LE(36 + samples.length, 4); header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(samples.length, 40);
const directory = path.join(root, '.review'); fs.mkdirSync(directory, { recursive: true });
const wav = path.join(directory, 'arrival-original.wav'); fs.writeFileSync(wav, Buffer.concat([header, samples]));
const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '64k', path.join(root, 'public/audio/arrival.mp3')], { stdio: 'inherit' });
if (result.error) console.error('FFmpeg is needed only when regenerating audio:', result.error.message);
process.exitCode = result.status ?? 1;
