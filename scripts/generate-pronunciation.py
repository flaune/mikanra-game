"""Development-only: bundle fixed Japanese speech; never overwrite good clips on failure.

Uses local OpenJTalk synthesis with the attributed CC BY 3.0 Mei voice.
No live service or API key is used. Existing clips remain unless --force is set.
See public/audio/README.md for development dependencies and voice attribution.
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.review' / 'japanese-tts'))


def synthesize_openjtalk(reading, output):
    try:
        import numpy
        import pyopenjtalk
    except ImportError as error:
        raise RuntimeError('Install pyopenjtalk-plus to use --engine openjtalk.') from error
    if not shutil.which('ffmpeg'):
        raise RuntimeError('ffmpeg is required to encode OpenJTalk output as MP3.')
    samples, sample_rate = pyopenjtalk.tts(reading, speed=0.9)
    pcm = numpy.clip(samples, -32768, 32767).astype('<i2').tobytes()
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 's16le', '-ar', str(sample_rate), '-ac', '1', '-i', 'pipe:0',
        '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '48k', str(output),
    ], input=pcm, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine', choices=['openjtalk'], default='openjtalk')
    parser.add_argument('--force', action='store_true', help='Regenerate existing clips, too.')
    options = parser.parse_args()
    entries = json.loads((ROOT / 'scripts' / 'pronunciation-phrases.json').read_text(encoding='utf-8'))
    destination = ROOT / 'public' / 'audio' / 'ja'
    destination.mkdir(parents=True, exist_ok=True)
    for index, entry in enumerate(entries):
        output = destination / entry['file']
        if output.exists() and output.stat().st_size > 1000 and not options.force:
            continue
        # Stable filenames allow incremental audio generation.
        temporary = output.with_suffix('.pending.mp3')
        try:
            synthesize_openjtalk(entry['reading'], temporary)
            if temporary.stat().st_size <= 1000:
                raise RuntimeError(f'No usable audio generated for {entry["text"]}.')
            temporary.replace(output)
        finally:
            temporary.unlink(missing_ok=True)
        print(f"Generated {index + 1}/{len(entries)}: {entry['file']}", flush=True)

if __name__ == '__main__':
    main()
