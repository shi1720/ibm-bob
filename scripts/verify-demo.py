#!/usr/bin/env python3
"""Verify rendered footage and caption frames against the single source timeline."""
import importlib.util
import json
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('render_demo',ROOT/'scripts/render-demo.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
work=r.WORK
video=ROOT/'submission/final-demo.mp4'
timeline=json.loads((work/'narration-timing.json').read_text())

def frame(path,sec,name):
    out=work/f'verify-{name}.png'
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(sec),'-i',str(path),'-frames:v','1',str(out)],check=True)
    return np.asarray(Image.open(out).convert('RGB'),dtype=np.float32)

checks=[]
# Include every scene and both sides of the three principal edit boundaries.
times=sorted(set([round((a+b)/2,2) for a,b,_,_ in r.SCENES]+[15.96,16,141.96,142,161.96,162]))
for i,t in enumerate(times):
    actual=frame(video,t,f'actual-{i}')
    index,offset=(0,0) if t<16 else (1,16) if t<142 else (2,142) if t<162 else (3,162)
    expected=frame(work/f'base-{index}.mp4',round(t-offset,2),f'base-{i}')
    body=float(np.abs(actual[60:960]-expected[60:960]).mean())
    scene=next(label for a,b,label,_ in r.SCENES if a<=t<b)
    caption=next((x['text'] for x in timeline if x['start']<=t<x['end']),'')
    overlay=work/f'verify-overlay-{i}.png'
    r.render_overlay(overlay,scene,caption)
    expected_cap=np.asarray(Image.open(overlay).convert('RGB'),dtype=np.float32)
    cap=float(np.abs(actual[960:]-expected_cap[960:]).mean())
    assert body<4,(t,'footage mismatch',body)
    assert cap<4,(t,'caption mismatch',cap)
    checks.append({'second':t,'sourceClip':index,'sourceSecond':round(t-offset,2),'footageMeanPixelError':round(body,3),'captionMeanPixelError':round(cap,3)})
# Full decode detects corrupt frames or audio packets.
subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True)
report=ROOT/'submission/media/final-video-verification.json'
data=json.loads(report.read_text());data['sceneFrameChecks']=checks;data['fullDecode']='passed'
report.write_text(json.dumps(data,indent=2)+'\n')
print(f'PASS: {len(checks)} source and caption frame comparisons; full A/V decode.')
