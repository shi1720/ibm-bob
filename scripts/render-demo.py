#!/usr/bin/env python3
"""Render a 176s narrated demo from actual screen capture and genuine Bob work evidence.

Uses macOS say for synthetic narration, Pillow for type, and ffmpeg for assembly.
No API key is used. --prepare creates narration/captions except unverified Bob work.
Final rendering requires --bob-evidence and --bob-confirmed after human/agent review.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import subprocess
import wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.artifacts/video'
OUT = ROOT / 'submission'
WORK.mkdir(parents=True, exist_ok=True)
FONT = ROOT / 'src/assets/fonts/font-0.ttf'
BOLD = ROOT / 'src/assets/fonts/font-3.ttf'
INK = '#142a2e'
PAPER = '#f8f6f0'
ORANGE = '#f06537'
VOICE = 'Samantha (English (US))'
SCENES = [
(0,16,'Your release passed. Will your rollback?', [
'Your deployment is green. Then you roll back, and a new customer order disappears.',
'Built by Shivam Gupta, UndoProof rehearses the recovery plan before a database migration ships.']),
(16,24,'01  Meet the disappearing order',[
'This is our checkout example. The release works, but its rollback quietly loses a new order.']),
(24,30,'02  Make the release contract explicit',[
'A release contract makes the migration, application queries, and important data explicit.']),
(30,39,'03  Inspect the unsafe rollback',[
'Here is the problem. The rollback drops the current orders table and restores a snapshot taken before deployment.']),
(39,47,'04  Write after deployment',[
'This write creates order one hundred and four after deployment. Our recovery plan must preserve that order.']),
(47,55,'05  Execute real PostgreSQL',[
'Let us rehearse. UndoProof runs real PostgreSQL through PGlite. The result blocks this release plan.']),
(55,64,'06  Successful SQL can still lose data',[
'The forward path works. The rollback SQL also succeeds. But data preservation fails. Those are deliberately separate checks.']),
(64,80,'07  Inspect the missing order',[
'Here is the evidence. Four rows before rollback, three afterward. The highlighted new order has disappeared.',
'We compare exact values in the supplied invariant projection. A successful SQL command cannot hide this failure.']),
(80,89,'08  Give Bob the actual evidence',[
'This export gives Bob the exact contract and failure evidence. It is a manual IDE handoff for a focused repair task.']),
(89,102,'09  Review the candidate repair',[
'For this example, we include a repair to review. It keeps the compatible expanded schema when the application rolls back.',
'Removing the destructive snapshot restore preserves the new data.']),
(102,112,'10  Apply and rehearse again',[
'Apply the reviewed SQL and run the same engine again. This time every supplied check passes.']),
(112,124,'11  Verify what survived',[
'All four orders survive, including the write after deployment. The earlier application queries still work.',
'Rolling back application code does not require deleting the expanded schema.']),
(124,132,'12  Export reproducible evidence',[
'Export the tested contract, executed SQL, row comparisons and measured runtime as evidence.']),
(132,142,'13  Keep both outcomes',[
'History keeps both outcomes. Developers can import their own contracts, and the command-line runner uses the same engine as a release gate.']),
(142,162,'14  IBM Bob IDE contribution',[]),
(162,176,'Prove the way back. Before you ship.',[
'UndoProof is open source. Our proposed team product adds shared policies and retained evidence.',
'These results cover the tested SQL and fixtures. The way back belongs in the release review.']),
]


def run(args):
    subprocess.run([str(x) for x in args],check=True,stdout=subprocess.DEVNULL)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))


def duration(path):
    return float(probe(path)['format']['duration'])


def font(size,bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT),size)


def text(draw,xy,value,size=30,fill=INK,bold=False):
    draw.text(xy,value,font=font(size,bold),fill=fill)


def wrapped(draw,value,face,width):
    lines=[]
    line=''
    for word in value.split():
        candidate=(line+' '+word).strip()
        if draw.textlength(candidate,font=face)>width and line:
            lines.append(line);line=word
        else:line=candidate
    if line:lines.append(line)
    return lines


def title_card(path,closing=False):
    im=Image.new('RGB',(1920,1080),PAPER);d=ImageDraw.Draw(im)
    d.rounded_rectangle((115,115,175,175),radius=15,fill=ORANGE)
    text(d,(130,120),'U',40,'white',True)
    text(d,(197,117),'UndoProof',46,INK,True)
    text(d,(115,228),'PROVE THE WAY BACK',24,ORANGE,True)
    if closing:
        text(d,(108,295),'The way back belongs',92,INK,True)
        text(d,(108,404),'in the release review.',92,INK,True)
        text(d,(115,568),'undoproof.web.app',52,ORANGE,True)
        text(d,(115,653),'github.com/shi1720/ibm-bob',30,INK)
        text(d,(115,778),'Open source runner  /  Real PostgreSQL  /  Inspectable evidence',27,INK)
        text(d,(115,857),'Created by Shivam Gupta for the IBM Bob 2.0 Hackathon',24,INK)
    else:
        text(d,(108,286),'The rollback passed.',98,INK,True)
        text(d,(108,404),'An order disappeared.',98,INK,True)
        cards=[('FORWARD TESTS','PASS','#d9e9dc'),('ROLLBACK SQL','PASS','#d9e9dc'),('NEW ORDER','LOST','#f7d3c8')]
        for i,(label,value,color) in enumerate(cards):
            x=115+i*555
            d.rounded_rectangle((x,620,x+515,795),radius=16,fill=color)
            text(d,(x+28,648),label,23,INK,True)
            text(d,(x+28,696),value,54,INK,True)
        text(d,(115,851),'Built by Shivam Gupta  |  IBM Bob 2.0 Hackathon',27,INK)
    im.save(path)


def bob_card(source, target):
    original=Image.open(source).convert('RGB')
    canvas=Image.new('RGB',(1920,1080),PAPER)
    d=ImageDraw.Draw(canvas)
    text(d,(70,100),'IBM Bob, inside the repository',44,INK,True)
    context=original.copy();context.thumbnail((860,510))
    canvas.paste(context,(70,195))
    text(d,(70,755),'41 real PostgreSQL regression tests',36,INK,True)
    text(d,(70,811),'tests/bob-workflow.test.ts',28,ORANGE,True)
    text(d,(70,864),'Verified tests and review. Actual task context above.',23,INK)
    if original.size != (3024,1746):
        raise ValueError('Bob panel crop belongs to the inspected 3024x1746 work capture')
    # Enlarge only an actual region of the original screenshot. No UI is rebuilt.
    detail=original.crop((2424,900,3005,1360))
    detail=detail.resize((790,625),Image.Resampling.LANCZOS)
    text(d,(1040,169),'ENLARGED TASK DETAIL',22,ORANGE,True)
    canvas.paste(detail,(1040,218))
    text(d,(1040,871),'Detail from the same unaltered work capture',21,INK)
    canvas.save(target)


def say(sentence):
    spoken=sentence.replace('UndoProof','Undo Proof').replace('PGlite','P G lite').replace('PostgreSQL','Postgres Q L').replace('SQL','S Q L').replace('IDE','I D E').replace('IBM','I B M')
    key=hashlib.sha256((VOICE+'145'+spoken).encode()).hexdigest()[:16]
    path=WORK/f'speech-{key}.aiff'
    if not path.exists():
        run(['say','-v',VOICE,'-r','145','-o',path,spoken])
    return path


def wav_samples(path,speed=1):
    out=WORK/(path.stem+f'-{speed:.4f}.wav')
    if not out.exists():
        run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',path,'-af',f'atempo={speed:.6f}', '-ar','24000','-ac','1','-c:a','pcm_s16le',out])
    with wave.open(str(out),'rb') as w:return w.readframes(w.getnframes())


def stamp(sec):
    ms=round(sec*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'


def caption_chunks(sentence):
    # Phrase-length cues remain aligned within their actual audio chunk.
    words=sentence.split();chunks=[];current=[]
    for word in words:
        current.append(word)
        if len(' '.join(current))>=77 or (len(current)>=7 and word.endswith(('.', '?', '!'))):
            chunks.append(' '.join(current));current=[]
    if current:chunks.append(' '.join(current))
    return chunks


def render_overlay(path,label,caption):
    im=Image.new('RGBA',(1920,1080),(0,0,0,0));d=ImageDraw.Draw(im)
    d.rectangle((0,0,1920,60),fill=INK)
    text(d,(40,15),'UndoProof',23,'#ffffff',True)
    text(d,(245,16),label,22,'#ffffff')
    text(d,(1660,20),'SYNTHETIC VOICEOVER',16,'#c7d9d7')
    d.rectangle((0,960,1920,1080),fill=INK)
    if caption:
        face=font(34)
        lines=wrapped(d,caption,face,1760)
        assert len(lines)<=2,(caption,lines)
        y=971+(100-len(lines)*43)/2
        for line in lines:
            width=d.textlength(line,font=face)
            d.text(((1920-width)/2,y),line,font=face,fill='#ffffff');y+=43
    im.save(path)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--prepare',action='store_true')
    p.add_argument('--bob-evidence','--bob-summary',dest='bob_summary',type=Path,help='Genuine Bob work screenshot or task summary; inspect before use')
    p.add_argument('--bob-confirmed',action='store_true')
    p.add_argument('--bob-narration',type=Path,help='Reviewed exact Bob narration, one paragraph per audio chunk')
    args=p.parse_args()
    if not args.prepare:
        if not args.bob_confirmed or not args.bob_summary or not args.bob_summary.is_file() or not args.bob_narration or not args.bob_narration.is_file():
            p.error('Final rendering requires verified Bob evidence and reviewed narration')
        SCENES[14][3].extend(x.strip() for x in args.bob_narration.read_text().split('\n\n') if x.strip())
    timeline=[]
    audio=bytearray(176*24000*2)
    captions=[]
    for start,end,label,sentences in SCENES:
        if not sentences:continue
        sources=[say(s) for s in sentences]
        raw=sum(duration(x) for x in sources)
        available=end-start-0.6-0.2*(len(sources)-1)
        speed=max(1,raw/available)
        if speed>1.24:raise RuntimeError(f'Narration too long for {label}: speed {speed:.2f}')
        chunks=[wav_samples(x,speed) for x in sources]
        total=sum(len(x)/48000 for x in chunks)
        gap=min(0.65,max(0.12,(end-start-total-.6)/max(1,len(chunks)-1)))
        assert total + 0.3 + gap * (len(chunks)-1) <= end-start, label
        t=start+0.3
        for sentence,pcm in zip(sentences,chunks):
            length=len(pcm)/48000
            offset=round(t*24000)*2
            audio[offset:offset+len(pcm)]=pcm
            words=caption_chunks(sentence)
            # Keep trailing one-word fragments readable instead of flashing them.
            while len(words) > 1 and length * len(words[-1]) / sum(map(len, words)) < 1.2:
                tail=words.pop()
                words[-1] += ' ' + tail
            weight=sum(len(x) for x in words)
            at=t
            for cap in words:
                span=length*len(cap)/weight
                captions.append({'start':at,'end':at+span,'text':cap,'label':label})
                at+=span
            timeline.append({'start':t,'end':t+length,'text':sentence,'scene':label,'speed':speed})
            t+=length+gap
        print(f'{start:3}-{end:3}s | narration {total:.1f}s | {label}',flush=True)
    (WORK/'narration-timing.json').write_text(json.dumps(timeline,indent=2))
    with wave.open(str(WORK/'narration.wav'),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(audio)
    if args.prepare:
        print('Narration prepared. Bob evidence still required.');return
    (OUT/'NARRATION.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for i,c in enumerate(captions))+'\n')
    script='# Final demo narration\n\nDuration: 176 seconds. Actual application recording: 126 seconds. Narration is a disclosed synthetic English voice generated locally with macOS Samantha. Captions are burned into a separate band and provided in NARRATION.srt.\n\n'
    for start,end,label,sentences in SCENES:
        script+=f'## {stamp(start)[:8]} to {stamp(end)[:8]}: {label}\n\n'+ '\n\n'.join(sentences)+'\n\n'
    script+='## Provenance\n\nThe main workflow is the unsped original screen recording. The Bob segment displays a full-window inset and an enlarged region of the same genuine IBM Bob work capture. The original evidence PNG is unmodified. It is not a task consumption summary. The video does not claim an automatic Bob API integration. The built-in repair is a reviewed sample. No production data or invented speedup is used.\n'
    script += '\n## Reproduce the final edit\n\nRequires macOS `say`, ffmpeg, ffprobe and Python with Pillow.\n\n```sh\npython3 scripts/render-demo.py --bob-evidence submission/media/bob-verification-work.png --bob-confirmed --bob-narration submission/BOB-NARRATION.txt\n```\n\nThe supplied work capture and reviewed narration establish the segment\'s content. They do not replace the required task consumption summary.\n'
    (OUT/'VIDEO-SCRIPT.md').write_text(script)
    title_card(WORK/'intro.png');title_card(WORK/'close.png',True)
    bob_card(args.bob_summary,WORK/'bob.png')
    assert abs(duration(OUT/'media/screen-demo.mp4') - 126) < 0.05
    sources=[(WORK/'intro.png',16,True),(OUT/'media/screen-demo.mp4',126,False),(WORK/'bob.png',20,True),(WORK/'close.png',14,True)]
    base=[]
    for i,(source,length,still) in enumerate(sources):
        target=WORK/f'base-{i}.mp4'
        command=['ffmpeg','-hide_banner','-loglevel','error','-y']
        if still:command+=['-loop','1']
        command+=['-i',source,'-t',str(length),'-an']
        vf='fps=25,format=yuv420p,setsar=1'
        if not still:vf='pad=1920:1080:240:60:color=0xf8f6f0,'+vf
        command+=['-vf',vf,'-c:v','libx264','-preset','fast','-crf','18',target]
        run(command);base.append(target)
    manifest=WORK/'base.txt';manifest.write_text(''.join(f"file '{x.as_posix()}'\n" for x in base))
    # Fill subtitle gaps explicitly so no cue remains on screen after speech ends.
    cuts={0.,176.}
    for a,b,_,_ in SCENES:cuts.update((float(a),float(b)))
    for c in captions:cuts.update((c['start'],c['end']))
    cuts=sorted(cuts);overlays=[]
    for i,(a,b) in enumerate(zip(cuts,cuts[1:])):
        mid=(a+b)/2
        label=next(label for st,en,label,_ in SCENES if st<=mid<en)
        cap=next((c['text'] for c in captions if c['start']<=mid<c['end']),'')
        path=WORK/f'caption-{i:03}.png';render_overlay(path,label,cap)
        overlays.append((path,b-a))
    cap_manifest=WORK/'captions.txt'
    cap_manifest.write_text(''.join(f"file '{path.as_posix()}'\nduration {d:.6f}\n" for path,d in overlays)+f"file '{overlays[-1][0].as_posix()}'\n")
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',manifest,'-f','concat','-safe','0','-i',cap_manifest,'-i',WORK/'narration.wav','-filter_complex','[0:v][1:v]overlay=0:0:format=auto[v];[2:a]loudnorm=I=-16:TP=-1.5:LRA=9[a]','-map','[v]','-map','[a]','-r','25','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','176','-movflags','+faststart',OUT/'final-demo.mp4'])
    info=probe(OUT/'final-demo.mp4')
    assert float(info['format']['duration']) <= 176.1
    assert any(stream['codec_type'] == 'audio' for stream in info['streams'])
    (OUT/'media/final-video-verification.json').write_text(json.dumps({'durationSeconds':float(info['format']['duration']),'actualApplicationSeconds':126,'width':1920,'height':1080,'syntheticVoice':VOICE,'bobScreenshot':str(args.bob_summary.resolve().relative_to(ROOT)),'bobScreenshotSha256':hashlib.sha256(args.bob_summary.read_bytes()).hexdigest(),'bobPanelCrop':[2424,900,3005,1360],'captionCount':len(captions),'sizeBytes':int(info['format']['size'])},indent=2))
    print('Rendered submission/final-demo.mp4. Inspect frames, audio and the full edit before publishing.')

if __name__=='__main__':main()
