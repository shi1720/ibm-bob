#!/usr/bin/env python3
"""Assemble real capture + genuine Bob summary + recorded narration. Requires ffmpeg."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--voiceover', required=True, type=Path, help='Narration aligned to VIDEO-SCRIPT.md, approximately 176 seconds')
parser.add_argument('--bob-summary', required=True, type=Path, help='Genuine Bob IDE task-summary PNG; inspect it before use')
parser.add_argument('--output', type=Path, default=ROOT / 'submission/final-demo.mp4')
args = parser.parse_args()
for tool in ('ffmpeg', 'ffprobe'):
    if not shutil.which(tool):
        parser.error(f'{tool} must be installed')
for file in (args.voiceover, args.bob_summary, ROOT / 'submission/cover.png', ROOT / 'submission/media/screen-demo.mp4'):
    if not file.is_file():
        parser.error(f'Missing input: {file}')
if args.bob_summary.suffix.lower() != '.png':
    parser.error('Use an authentic PNG Bob session summary')
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(args.voiceover)]))
if not any(stream.get('codec_type') == 'audio' for stream in probe['streams']):
    parser.error('Voiceover input has no audio stream')
duration = float(probe['format']['duration'])
if not 170 <= duration <= 176.1:
    parser.error(f'Voiceover is {duration:.2f}s; align it to the 176-second script (170–176s including pauses)')
args.output.parent.mkdir(parents=True, exist_ok=True)
scale = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf8f6f0,setsar=1,fps=30,format=yuv420p'
with tempfile.TemporaryDirectory(prefix='undoproof-video-') as temp:
    paths = []
    scenes = [(ROOT / 'submission/cover.png',16,True), (ROOT / 'submission/media/screen-demo.mp4',126,False), (args.bob_summary,20,True), (ROOT / 'submission/cover.png',14,True)]
    for i, (source, length, still) in enumerate(scenes):
        dest = Path(temp) / f'{i}.mp4'
        command = ['ffmpeg','-hide_banner','-loglevel','error','-y']
        if still:
            command += ['-loop','1']
        command += ['-i',str(source),'-t',str(length),'-an','-vf',scale,'-c:v','libx264','-preset','fast','-crf','20',str(dest)]
        subprocess.run(command, check=True)
        paths.append(dest)
    manifest = Path(temp) / 'scenes.txt'
    manifest.write_text(''.join(f"file '{path.as_posix()}'\n" for path in paths))
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(manifest),'-i',str(args.voiceover),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','apad','-c:a','aac','-b:a','192k','-t','176','-movflags','+faststart',str(args.output)], check=True)
print(f'Created {args.output}. Watch all 176 seconds, verify Bob narration against actual work, and run npm run submission:check.')
print('Captions remain in submission/NARRATION.srt; edit the Bob section to match verified contribution before uploading.')
