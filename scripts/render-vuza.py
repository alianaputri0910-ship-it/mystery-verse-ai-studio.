import asyncio
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from edge_tts import Communicate
from video_engine import VideoEngine, resolve_font_path

OUT = ROOT / "output"
VOICE = "id-ID-ArdiNeural"
RATE = "-10%"
MIN_SECONDS, MAX_SECONDS = 40.0, 75.0

def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr[-3000:] or "FFmpeg gagal.")
    return p.stdout.strip()

def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                      "-of", "default=noprint_wrappers=1:nokey=1", str(path)]))

async def make_voice(text, audio_path):
    communicator = Communicate(text, VOICE, rate=RATE, volume="+0%", boundary="WordBoundary")
    boundaries = []
    with open(audio_path, "wb") as f:
        async for chunk in communicator.stream():
            if chunk.get("type") == "audio":
                f.write(chunk.get("data", b""))
            elif chunk.get("type") == "WordBoundary":
                # edge-tts emits offset/text at the top level (some versions wrap them in data).
                data = chunk.get("data") or chunk
                word = str(data.get("text", chunk.get("text", ""))).strip()
                offset = data.get("offset", chunk.get("offset", 0))
                if word:
                    boundaries.append({"text": word, "start": float(offset) / 10_000_000.0})
    if not audio_path.exists() or audio_path.stat().st_size < 1000:
        raise RuntimeError("Edge-TTS tidak menghasilkan audio yang valid.")
    if not boundaries:
        raise RuntimeError("Edge-TTS tidak mengirim WordBoundary; render dihentikan agar subtitle per kata tidak berubah menjadi satu blok.")
    return boundaries

def make_brand(path):
    canvas = Image.new("RGBA", (1080, 120), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    font_path = resolve_font_path()
    try:
        font = ImageFont.truetype(font_path, 46) if font_path else ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()
    label = "MYSTERY VERSE"
    b = draw.textbbox((0, 0), label, font=font, stroke_width=2)
    x, y = (1080 - (b[2] - b[0])) / 2, 28
    draw.text((x + 2, y + 3), label, font=font, fill=(0, 0, 0, 110), stroke_width=3, stroke_fill=(0, 0, 0, 90))
    draw.text((x, y), label, font=font, fill=(230, 193, 112, 158), stroke_width=1, stroke_fill=(15, 12, 8, 100))
    canvas.save(path)

def make_ambience(path, seconds):
    sr = 24000
    n = max(1, int(seconds * sr))
    rng = np.random.default_rng(2000)
    t = np.arange(n, dtype=np.float32) / sr
    coarse = rng.normal(0, 1, max(2, int(seconds * 100))).astype(np.float32)
    wind = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(coarse)), coarse)
    wind /= max(0.001, float(np.max(np.abs(wind))))
    bed = 0.006 * wind + 0.006 * np.sin(2 * np.pi * 46 * t) + 0.003 * np.sin(2 * np.pi * 67 * t)
    for at in np.arange(0.8, seconds, 7.5):
        start = int(at * sr)
        length = min(int(0.45 * sr), n - start)
        if length > 0:
            lt = np.arange(length, dtype=np.float32) / sr
            env = np.exp(-lt * 8)
            bed[start:start+length] += 0.012 * env * rng.normal(0, 1, length)
            bed[start:start+length] += 0.014 * env * np.sin(2 * np.pi * 82 * lt)
    bed = np.clip(bed, -0.06, 0.06)
    stereo = np.column_stack((bed, bed))
    pcm = (stereo * 32767).astype("<i2")
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes(pcm.tobytes())

async def main():
    story = json.loads((OUT / "story.json").read_text(encoding="utf-8"))
    scenes = story.get("scenes", [])
    if len(scenes) != 8:
        raise RuntimeError("Naskah harus berisi 8 adegan termasuk ajakan penonton.")
    images = OUT / "images"
    if not images.exists():
        raise RuntimeError("Folder gambar AI tidak ditemukan.")
    engine = VideoEngine(str(OUT / "vuza_render"))
    script_data = []
    total = 0.0

    for i, scene in enumerate(scenes):
        audio = engine.temp_dir / f"speech_{i}.mp3"
        words = await make_voice(scene["narration"], audio)
        seconds = duration(audio)
        if seconds < 2:
            raise RuntimeError(f"Narasi adegan {i+1} terlalu pendek ({seconds:.2f}s).")
        total += seconds + 0.15
        image = images / f"scene-{i+1:02d}.webp"
        if not image.exists() or image.stat().st_size < 1000:
            raise RuntimeError(f"Gambar adegan {i+1} tidak ditemukan atau kosong.")
        folder = OUT / "vuza_media" / f"scene_{i+1:02d}"
        folder.mkdir(parents=True, exist_ok=True)
        visual = folder / "visual.webp"
        shutil.copy2(image, visual)
        script_data.append({
            "sentence": scene["narration"],
            "keyword": f"scene_{i+1:02d}",
            "_files": [str(visual)],
            "_word_timings": words
        })
        print(f"Adegan {i+1}: narasi {seconds:.2f} detik, {len(words)} penanda kata terbaca, kecepatan tetap {RATE}.")

    intro_seconds = 3.5
    if not MIN_SECONDS <= total + intro_seconds <= MAX_SECONDS:
        raise RuntimeError(f"Total narasi + opening {total + intro_seconds:.2f}s di luar batas 40–75 detik. Naskah perlu dipadatkan, bukan mempercepat suara.")
    settings = SimpleNamespace(ratio="9:16", vibe="general", filter="none",
                               subtitles=True, subtitle_style="mystery_gold",
                               emoji_subtitles=False, watermark=False, logo_path="")
    result = engine.create_video(script_data, OUT / "vuza_media", media_type="photo",
                                 bg_music=None, settings=settings)
    if not result:
        raise RuntimeError("VUZA gagal menyusun video.")
    final = OUT / "mystery-verse.mp4"
    shutil.copy2(result, final)

    brand = OUT / "mystery-verse-brand.png"
    branded = OUT / "mystery-verse-branded.mp4"
    make_brand(brand)
    run(["ffmpeg", "-y", "-i", str(final), "-i", str(brand),
         "-filter_complex", "[0:v][1:v]overlay=(W-w)/2:42:format=auto[v]",
         "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "19", "-c:a", "copy", str(branded)])
    branded.replace(final)

    actual = duration(final)
    ambience = OUT / "mystery-verse-atmosphere.wav"
    mixed = OUT / "mystery-verse-mixed.mp4"
    make_ambience(ambience, actual)
    run(["ffmpeg", "-y", "-i", str(final), "-i", str(ambience),
         "-filter_complex", "[1:a]volume=0.28[sfx];[0:a][sfx]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(mixed)])
    mixed.replace(final)
    # Create a short branded animated opening from the generated mystery corridor visual.
    opening_image = images / "opening.webp"
    if not opening_image.exists() or opening_image.stat().st_size < 1000:
        raise RuntimeError("Visual opening tidak ditemukan.")
    opening = OUT / "mystery-verse-opening.mp4"
    joined = OUT / "mystery-verse-with-opening.mp4"
    font = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    run(["ffmpeg", "-y", "-loop", "1", "-framerate", "30", "-i", str(opening_image),
         "-f", "lavfi", "-i", "sine=frequency=48:sample_rate=48000:duration=3.5",
         "-t", "3.5", "-vf",
         "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
         "zoompan=z='min(zoom+0.0012,1.06)':d=105:s=1080x1920:fps=30,"
         f"drawtext=fontfile={font}:text='MYSTERY VERSE':fontcolor=0xD6A52B:fontsize=68:"
         "borderw=3:bordercolor=black@0.75:x=(w-text_w)/2:y=h*0.70,"
         "fade=t=in:st=0:d=0.4,fade=t=out:st=3.0:d=0.5,format=yuv420p",
         "-af", "volume=0.10,afade=t=in:st=0:d=0.3,afade=t=out:st=3.0:d=0.5",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
         "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "128k",
         "-ar", "48000", "-ac", "2", str(opening)])
    run(["ffmpeg", "-y", "-i", str(opening), "-i", str(final),
         "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]",
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(joined)])
    joined.replace(final)

    actual = duration(final)
    if not MIN_SECONDS <= actual <= MAX_SECONDS:
        raise RuntimeError(f"MP4 akhir berdurasi {actual:.2f}s, di luar batas 40–75.")
    probe = json.loads(run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(final)]))
    video_stream = next((x for x in probe.get("streams",[]) if x.get("codec_type")=="video"),None)
    audio_stream = next((x for x in probe.get("streams",[]) if x.get("codec_type")=="audio"),None)
    if not video_stream or (video_stream.get("width"),video_stream.get("height")) != (1080,1920):
        raise RuntimeError("Validasi resolusi gagal: hasil harus 1080x1920.")
    if not audio_stream:
        raise RuntimeError("Validasi audio gagal: MP4 tidak memiliki audio.")
    thumbnail = engine.generate_thumbnail(str(final), story.get("youtube",{}).get("title","MYSTERY VERSE"))
    if thumbnail:
        shutil.copy2(thumbnail, OUT/"thumbnail.jpg")
    print(f"BERHASIL: {final} | {actual:.2f}s | 1080x1920 | 30 FPS | opening 3.5s + CTA tersinkron | {len(script_data)} adegan dengan subtitle per kata")

if __name__ == "__main__":
    asyncio.run(main())
