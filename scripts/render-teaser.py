"""Compose a 30-second portrait teaser from real captured gameplay and original music."""
import array
import json
import math
from pathlib import Path
import shutil
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'teaser'
FFMPEG = shutil.which('ffmpeg')
FFPROBE = shutil.which('ffprobe')
if not FFMPEG or not FFPROBE:
    raise SystemExit('FFmpeg and ffprobe must be on PATH.')
OUT.mkdir(parents=True, exist_ok=True)


def run(args):
    subprocess.run(args, cwd=ROOT, check=True, stdout=subprocess.DEVNULL)


def duration(path):
    return float(subprocess.check_output([FFPROBE, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], text=True))


# Fonts remain local development inputs; only their rasterized appearance is exported.
title_fonts = [Path('C:/Windows/Fonts/georgiab.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf')]
body_fonts = [Path('C:/Windows/Fonts/arial.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
for candidates, name in [(title_fonts, '_title.ttf'), (body_fonts, '_body.ttf')]:
    source = next((p for p in candidates if p.exists()), None)
    if source is None:
        raise SystemExit('A local serif and sans-serif font are required.')
    shutil.copyfile(source, OUT / name)

captures = json.loads((OUT / 'capture.json').read_text(encoding='utf-8'))['clips']
beats = [
    (4, 'Run a little café.\nLearn Japanese.', 'A cozy game for Japanese beginners.'),
    (5, 'Understand\nthe order.', 'Every phrase has a purpose.'),
    (7, 'Make their\nmorning.', 'Grind. Brew. Serve.'),
    (6, 'One cup.\nA little confidence.', 'Listen. Ask for help. Try again.'),
    (4, 'Come back\nfor the people.', 'Get to know the regulars.'),
    (4, 'Mikanra', 'Learn a little. Belong a little more.'),
]
for index, (capture, (seconds, title, caption)) in enumerate(zip(captures, beats)):
    text_files = {}
    for key, value in [('title', title), ('caption', caption)]:
        dest = OUT / f'{index}-{key}.txt'
        dest.write_text(value, encoding='utf-8')
        text_files[key] = dest.relative_to(ROOT).as_posix()
    title_filters = ''
    for line_index, line in enumerate(title.splitlines()):
        line_file = OUT / f'{index}-title-{line_index}.txt'
        line_file.write_text(line, encoding='utf-8')
        size = 104 if index == 5 else 78
        title_filters += f"drawtext=fontfile=output/teaser/_title.ttf:textfile='{line_file.relative_to(ROOT).as_posix()}':x=64:y={177+line_index*100}:fontsize={size}:fontcolor=0xf6ecd6,"
    source = OUT / (capture['name'] + '.webm')
    take = min(capture['seconds'], duration(source))
    start = max(0, duration(source) - take)
    graph = (
        f'[0:v]trim=start={start:.4f},setpts=(PTS-STARTPTS)*{seconds/take:.6f},fps=30,scale=984:1082,setsar=1[v];'
        f'color=c=0x19372e:s=1080x1920:r=30:d={seconds}[bg];'
        '[bg][v]overlay=x=48:y=402:shortest=1,'
        'drawbox=x=48:y=402:w=984:h=1082:color=0xd9c6a0:t=2,'
        "drawtext=fontfile=output/teaser/_body.ttf:text='M I K A N R A':x=64:y=66:fontsize=29:fontcolor=0xf6ecd6,"
        "drawtext=fontfile=output/teaser/_body.ttf:text='GAMEPLAY TEASER':x=780:y=76:fontsize=18:fontcolor=0xc6cfae,"
        'drawbox=x=64:y=121:w=70:h=4:color=0xd4b374:t=fill,'
        f'{title_filters}'
        f"drawtext=fontfile=output/teaser/_body.ttf:textfile='{text_files['caption']}':x=64:y=1565:fontsize=38:fontcolor=0xf6ecd6,"
        "drawtext=fontfile=output/teaser/_body.ttf:text='FREE DESKTOP BROWSER DEMO':x=64:y=1660:fontsize=24:fontcolor=0xd4b374,"
        f"drawtext=fontfile=output/teaser/_body.ttf:text='{index+1:02d} / 06':x=64:y=1760:fontsize=20:fontcolor=0xc6cfae,"
        "drawtext=fontfile=output/teaser/_body.ttf:text='Edited gameplay. Voice - OpenJTalk / Mei (CC BY 3.0).':x=64:y=1825:fontsize=19:fontcolor=0xc6cfae,"
        f'fade=t=in:st=0:d=0.12,fade=t=out:st={seconds-.12}:d=0.12,format=yuv420p[out]'
    )
    run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-filter_complex', graph, '-map', '[out]', '-t', str(seconds), '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', str(OUT / f'part-{index}.mp4')])
    print(f'Rendered teaser beat {index+1}/6', flush=True)

# An original, quiet keyboard/bass bed. Oscillators only: no recordings or samples.
rate = 48000
samples = array.array('f', [0.0]) * (30 * rate)


def note(start, midi, gain, length=1.6, bass=False):
    freq = 440 * 2 ** ((midi-69)/12)
    for n in range(min(int(length*rate), len(samples)-int(start*rate))):
        age = n/rate
        env = min(1, age/.012) * math.exp(-(2.5 if not bass else 3.4)*age)
        tone = math.sin(2*math.pi*freq*age) + .18*math.sin(4*math.pi*freq*age)
        samples[int(start*rate)+n] += gain*env*tone


chords = [(53,57,60,64), (57,60,64,67), (50,53,57,60), (55,59,62,64)]
for bar in range(12):
    chord = chords[bar % len(chords)]
    for pulse in (0, 1.25):
        for index, midi in enumerate(chord):
            note(bar*2.5+pulse+index*.028, midi, .028)
    for beat in range(4):
        note(bar*2.5+beat*.625, chord[0]-12, .045, 1, True)
    note(bar*2.5+.625, chord[(bar+1)%4]+12, .035, 1.2)
    note(bar*2.5+1.875, chord[(bar+2)%4]+12, .027, 1.2)
pcm = array.array('h')
for index, value in enumerate(samples):
    t = index/rate
    fade = min(1, t/.6, max(0, (30-t)/1.1))
    duck = .45 if 4.2 < t < 7.5 or 16.7 < t < 18.6 else 1
    pcm.append(round(max(-1, min(1, value*fade*duck))*32767))
with wave.open(str(OUT / 'original-music.wav'), 'wb') as wav:
    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(pcm.tobytes())

concat = OUT / 'concat.txt'
concat.write_text(''.join(f"file 'part-{i}.mp4'\n" for i in range(6)), encoding='utf-8')
run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-c', 'copy', str(OUT / 'silent.mp4')])
audio = '[1:a]volume=.9[m];[2:a]adelay=4400:all=1,volume=.85[j1];[3:a]adelay=17100:all=1,volume=.85[j2];[m][j1][j2]amix=inputs=3:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]'
final = OUT / 'mikanra-teaser-30s.mp4'
run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(OUT / 'silent.mp4'), '-i', str(OUT / 'original-music.wav'), '-i', str(ROOT / 'public/audio/ja/ja-02.mp3'), '-i', str(ROOT / 'public/audio/ja/ja-05.mp3'), '-filter_complex', audio, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', '30', '-movflags', '+faststart', str(final)])
run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-ss', '2', '-i', str(final), '-frames:v', '1', str(OUT / 'poster.jpg')])
run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(final), '-vf', 'fps=1/5,scale=270:480,tile=3x2', '-frames:v', '1', str(OUT / 'contact-sheet.jpg')])
report = subprocess.check_output([FFPROBE, '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt', '-of', 'json', str(final)], text=True)
(OUT / 'verification.json').write_text(report, encoding='utf-8')
print(final, flush=True)
