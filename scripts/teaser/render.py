"""Encode deterministic GSAP/Three.js frames with original quiet sound design."""
import array
import json
import math
from pathlib import Path
import random
import shutil
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output' / 'teaser-cinematic'
FFMPEG, FFPROBE = shutil.which('ffmpeg'), shutil.which('ffprobe')
if not FFMPEG or not FFPROBE:
    raise SystemExit('FFmpeg and ffprobe must be on PATH.')
if len(list((OUT / 'frames').glob('*.png'))) != 900:
    raise SystemExit('Capture all 900 frames first: node scripts/capture-teaser.cjs')


def run(args):
    subprocess.run(args, cwd=ROOT, check=True)


rate = 48000
samples = array.array('f', [0.0]) * (30 * rate)


def note(start, midi, gain, length=2.4):
    frequency = 440 * 2 ** ((midi-69)/12)
    for index in range(min(int(length*rate), len(samples)-int(start*rate))):
        age = index/rate
        env = min(1, age/.015) * math.exp(-1.7*age)
        tone = math.sin(2*math.pi*frequency*age) + .13*math.sin(4*math.pi*frequency*age)
        samples[int(start*rate)+index] += gain*env*tone


chords = [(53,57,60,64), (48,52,55,59), (50,53,57,60), (55,59,62,64)]
for bar in range(6):
    chord = chords[bar % len(chords)]
    for beat in (0, 2.5):
        note(bar*5+beat, chord[0]-12, .030)
        for index, midi in enumerate(chord):
            note(bar*5+beat+index*.18, midi, .022)

# Original pour texture and a soft ceramic contact. No stock recordings or samples.
rng = random.Random(73)
for start, length in [(0, 2.85), (12.05, 4.8)]:
    filtered = 0
    for index in range(int(length*rate)):
        age = index/rate
        filtered += .08 * (rng.uniform(-1, 1)-filtered)
        envelope = min(1, age/.12, max(0, (length-age)/.2))
        samples[int(start*rate)+index] += .12*filtered*envelope
for index in range(int(.35*rate)):
    age = index/rate
    tone = math.sin(2*math.pi*850*age)+.3*math.sin(2*math.pi*1620*age)
    samples[int(17.05*rate)+index] += .065*tone*math.exp(-22*age)

pcm = array.array('h')
for index, value in enumerate(samples):
    seconds = index/rate
    fade = min(1, seconds/.12, max(0, (30-seconds)/.5))
    duck = .42 if 3.45 < seconds < 7.3 else 1
    pcm.append(round(max(-1, min(1, value*fade*duck))*32767))
with wave.open(str(OUT / 'original-soundtrack.wav'), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(rate)
    wav.writeframes(pcm.tobytes())

final = OUT / 'mikanra-teaser-30s.mp4'
audio = '[1:a]volume=1[m];[2:a]adelay=3600:all=1,volume=.9[v];[m][v]amix=inputs=2:normalize=0,loudnorm=I=-18:TP=-1.5:LRA=7[a]'
credits = 'Edited gameplay. Original footage/music/sound design copyright 2026 Bryan. Japanese voice: HTS Mei, copyright 2009-2013 Nagoya Institute of Technology / MMDAgent Project Team, CC BY 3.0, https://creativecommons.org/licenses/by/3.0/; synthesized with OpenJTalk and mixed. Font: Outfit, SIL OFL 1.1.'
run([FFMPEG, '-hide_banner', '-loglevel', 'warning', '-y', '-framerate', '30', '-i', str(OUT / 'frames/%04d.png'), '-i', str(OUT / 'original-soundtrack.wav'), '-i', str(ROOT / 'public/audio/ja/ja-27.mp3'), '-filter_complex', audio, '-map', '0:v', '-map', '[a]', '-frames:v', '900', '-t', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-metadata', 'title=Mikanra - A little tea', '-metadata', 'comment='+credits, str(final)])
for seconds, name in [(1.4, 'poster.jpg'), (26.5, 'closing-poster.jpg')]:
    run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(seconds), '-i', str(final), '-frames:v', '1', str(OUT / name)])
selection = '+'.join(f'eq(n,{frame})' for frame in [18,150,300,420,630,820])
run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(final), '-vf', f"select='{selection}',scale=270:480,tile=3x2", '-frames:v', '1', str(OUT / 'contact-sheet.jpg')])
run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(final), '-vf', 'scale=360:640', '-c:v', 'libx264', '-crf', '23', '-c:a', 'copy', str(OUT / 'phone-preview.mp4')])
report = json.loads(subprocess.check_output([FFPROBE, '-v', 'error', '-count_frames', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels,nb_read_frames,start_time,duration', '-of', 'json', str(final)], text=True))
assert report['format']['duration'] == '30.000000'
video = next(s for s in report['streams'] if s['codec_name'] == 'h264')
assert (video['width'], video['height'], video['r_frame_rate']) == (1080, 1920, '30/1')
assert video['nb_read_frames'] == '900' and video['pix_fmt'] == 'yuv420p'
encoded_audio = next(s for s in report['streams'] if s['codec_name'] == 'aac')
assert encoded_audio['sample_rate'] == '48000' and encoded_audio['channels'] == 2
assert float(video['start_time']) == float(encoded_audio['start_time']) == 0
assert abs(float(encoded_audio['duration'])-30) < .05
# Fast-start must place the MP4 index before the media payload.
data = final.read_bytes()
offset, boxes = 0, []
while offset+8 <= len(data):
    size = int.from_bytes(data[offset:offset+4], 'big')
    kind = data[offset+4:offset+8].decode('ascii')
    if size == 1:
        size = int.from_bytes(data[offset+8:offset+16], 'big')
    boxes.append(kind)
    if not size:
        break
    offset += size
assert boxes.index('moov') < boxes.index('mdat')
report['fastStart'] = True
run([FFMPEG, '-v', 'error', '-i', str(final), '-f', 'null', '-'])
raw = subprocess.check_output([FFMPEG, '-v', 'error', '-i', str(final), '-map', '0:a', '-f', 'f32le', '-ac', '1', '-'])
decoded = array.array('f')
decoded.frombytes(raw)
peak = max(abs(x) for x in decoded)
assert 0.01 < peak < .999, 'Sound must be audible and unclipped.'
report['audioPeak'] = peak
report['decodedWithoutErrors'] = True
report['titleMoments'] = 2
(OUT / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(final, flush=True)
