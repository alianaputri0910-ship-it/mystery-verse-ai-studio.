import asyncio
import json
import subprocess
from pathlib import Path
from edge_tts import Communicate

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "longform"
IMAGES = OUT / "images"
VOICE = "id-ID-ArdiNeural"
RATE = "-10%"

def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr[-2500:] or "FFmpeg gagal")
    return p.stdout.strip()

def duration(path):
    return float(run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)]))

def srt_time(seconds):
    ms=max(0,int(seconds*1000))
    h,ms=divmod(ms,3600000)
    m,ms=divmod(ms,60000)
    s,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

async def make_voice_and_word_captions(text, audio_path, srt_path):
    communicator=Communicate(text,VOICE,rate=RATE,volume="+0%",boundary="WordBoundary")
    boundaries=[]
    with open(audio_path,"wb") as audio_file:
        async for chunk in communicator.stream():
            if chunk.get("type")=="audio":
                audio_file.write(chunk.get("data",b""))
            elif chunk.get("type")=="WordBoundary":
                data=chunk.get("data") or chunk
                word=str(data.get("text",chunk.get("text",""))).strip()
                offset=float(data.get("offset",chunk.get("offset",0)))/10_000_000.0
                if word: boundaries.append((offset,word))
    if not audio_path.exists() or audio_path.stat().st_size<1000:
        raise RuntimeError("Edge-TTS tidak menghasilkan audio valid.")
    if not boundaries:
        raise RuntimeError("Edge-TTS tidak mengirim WordBoundary; subtitle per kata tidak dapat dibuat.")
    cues=[]
    for i,(start,word) in enumerate(boundaries):
        end=boundaries[i+1][0] if i+1<len(boundaries) else start+0.45
        end=max(start+0.10,end)
        cues.append(f"{i+1}\n{srt_time(start)} --> {srt_time(end)}\n{word}\n")
    srt_path.write_text("\n".join(cues),encoding="utf-8")

async def main():
    data=json.loads((ROOT/"episodes/trunyan/longform.json").read_text(encoding="utf-8"))
    chapters=data.get("chapters",[])
    if len(chapters)<6: raise RuntimeError("Minimal enam bab untuk video panjang.")
    for i,chapter in enumerate(chapters,1):
        if not chapter.get("title","").strip() or not chapter.get("narration","").strip():
            raise RuntimeError(f"Bab {i} kehilangan judul atau narasi.")
    OUT.mkdir(parents=True,exist_ok=True)
    metadata={"title":data.get("title",""),"description":data.get("description",""),
              "tags":["Desa Trunyan","Mepasah","Taru Menyan","Bali Aga","MYSTERY VERSE"],
              "hashtags":["#DesaTrunyan","#Mepasah","#BaliAga","#MisteriNusantara","#MysteryVerse"]}
    (OUT/"youtube-metadata.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding="utf-8")
    parts=[]
    for i,chapter in enumerate(chapters,1):
        audio=OUT/f"chapter-{i:02d}.mp3"
        image=IMAGES/f"chapter-{i:02d}.jpg"
        if not image.exists(): raise RuntimeError(f"Visual bab {i} tidak ditemukan.")
        srt=OUT/f"chapter-{i:02d}.srt"
        await make_voice_and_word_captions(chapter["narration"],audio,srt)
        seconds=duration(audio)
        if seconds<8: raise RuntimeError(f"Audio bab {i} terlalu pendek.")
        segment=OUT/f"segment-{i:02d}.mp4"
        title=chapter["title"].replace(":"," - ").replace("'","")
        font="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        vf=("scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
            "zoompan=z='min(zoom+0.00035,1.035)':d=1:s=1920x1080:fps=30,"
            f"drawtext=fontfile={font}:text='{title}':fontcolor=white:fontsize=42:"
            "borderw=2:bordercolor=black@0.65:x=80:y=900,"
            "drawtext=fontfile="+font+":text='MYSTERY VERSE':fontcolor=0xD6B46A@0.72:fontsize=26:"
            "borderw=1:bordercolor=black@0.45:x=w-text_w-70:y=55,"
            f"subtitles=filename={srt.as_posix()}:force_style='FontName=DejaVu Sans,FontSize=25,PrimaryColour=&H006AB4D6,OutlineColour=&HCC000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=75',format=yuv420p")
        run(["ffmpeg","-y","-loop","1","-framerate","30","-i",str(image),"-i",str(audio),
             "-t",f"{seconds:.3f}","-vf",vf,"-map","0:v:0","-map","1:a:0",
             "-c:v","libx264","-preset","veryfast","-crf","21","-r","30",
             "-c:a","aac","-b:a","192k","-ar","48000","-shortest",str(segment)])
        parts.append(segment)
        print(f"Bab {i}/{len(chapters)} selesai: {seconds:.1f} detik")

    concat=OUT/"concat.txt"
    concat.write_text("".join("file '"+p.name+"'\n" for p in parts),encoding="utf-8")
    body=OUT/"body.mp4"
    run(["ffmpeg","-y","-f","concat","-safe","0","-i",str(concat),"-c","copy",str(body)])

    opening_image=IMAGES/"opening.jpg"
    opening=OUT/"opening.mp4"
    intro=OUT/"intro.mp4"
    run(["ffmpeg","-y","-loop","1","-framerate","30","-i",str(opening_image),
         "-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=48000",
         "-t","4","-vf","scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
         "zoompan=z='min(zoom+0.001,1.04)':d=1:s=1920x1080:fps=30,"
         "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:"
         "text='MYSTERY VERSE':fontcolor=0xD6B46A:fontsize=70:borderw=3:bordercolor=black@0.8:"
         "x=(w-text_w)/2:y=h*0.72,format=yuv420p",
         "-c:v","libx264","-preset","veryfast","-crf","21","-r","30","-c:a","aac","-b:a","128k",str(opening)])
    run(["ffmpeg","-y","-i",str(opening),"-i",str(body),
         "-filter_complex","[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]",
         "-map","[v]","-map","[a]","-c:v","libx264","-preset","veryfast","-crf","21",
         "-pix_fmt","yuv420p","-r","30","-c:a","aac","-b:a","192k","-movflags","+faststart",str(intro)])
    final=ROOT/"output"/"mystery-verse-trunyan-longform.mp4"
    final.parent.mkdir(parents=True,exist_ok=True)
    run(["ffmpeg","-y","-i",str(intro),"-c","copy",str(final)])
    actual=duration(final)
    probe=json.loads(run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(final)]))
    video=next((x for x in probe.get("streams",[]) if x.get("codec_type")=="video"),None)
    audio_stream=next((x for x in probe.get("streams",[]) if x.get("codec_type")=="audio"),None)
    if not video or (video.get("width"),video.get("height"))!=(1920,1080):
        raise RuntimeError("Validasi resolusi long-form gagal: harus 1920x1080.")
    if not audio_stream: raise RuntimeError("Validasi audio long-form gagal.")
    if actual<180: raise RuntimeError(f"Video panjang terlalu pendek ({actual/60:.1f} menit); cek narasi.")
    run(["ffmpeg","-v","error","-i",str(final),"-f","null","-"])
    print(f"BERHASIL: {final} | {actual/60:.1f} menit | 1920x1080 | 30 FPS | {VOICE} {RATE} | subtitle per kata")

if __name__=="__main__":
    asyncio.run(main())
