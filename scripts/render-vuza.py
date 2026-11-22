import asyncio
import json
import shutil
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
# Saat skrip dijalankan sebagai `python scripts/render-vuza.py`, Python
# menambahkan folder scripts ke sys.path, bukan root repository.
# Tambahkan root secara eksplisit agar video_engine.py dapat diimpor.
sys.path.insert(0, str(ROOT))

from edge_tts import Communicate
from video_engine import VideoEngine
OUT = ROOT / "output"
VOICE = "id-ID-ArdiNeural"
MIN_SECONDS, MAX_SECONDS = 40.0, 60.0

def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr[-2500:] or "FFmpeg gagal.")
    return p.stdout.strip()

def duration(path):
    return float(run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)]))


async def save_audio_with_word_boundaries(text, audio_path):
    """Save Edge-TTS audio and its real word-boundary timestamps."""
    communicator = Communicate(text, VOICE, rate="-8%", volume="+0%")
    boundaries = []
    with open(audio_path, "wb") as audio_file:
        async for chunk in communicator.stream():
            if chunk.get("type") == "audio":
                audio_file.write(chunk.get("data", b""))
            elif chunk.get("type") == "WordBoundary":
                data = chunk.get("data", {})
                word = str(data.get("text", "")).strip()
                if word:
                    boundaries.append({
                        "text": word,
                        "start": float(data.get("offset", 0)) / 10_000_000.0
                    })
    if not audio_path.exists() or audio_path.stat().st_size == 0:
        raise RuntimeError("Edge-TTS tidak menghasilkan audio.")
    return boundaries

async def main():
    story = json.loads((OUT/"story.json").read_text(encoding="utf-8"))
    scenes = story.get("scenes", [])
    if not scenes:
        raise RuntimeError("Naskah kosong.")
    media = OUT/"vuza_media"
    media.mkdir(parents=True, exist_ok=True)
    engine = VideoEngine(str(OUT/"vuza_render"))
    script_data, expected = [], 0.0

    for i, scene in enumerate(scenes):
        n = int(scene["scene"])
        slot = float(scene["end"]) - float(scene["start"])
        target = slot - 0.5
        image = OUT/"images"/f"scene-{n:02d}.webp"
        if not image.is_file() or image.stat().st_size == 0:
            raise RuntimeError(f"Gambar adegan {n} hilang.")
        audio = engine.temp_dir/f"speech_{i}.mp3"
        print(f"Membuat suara adegan {n}/{len(scenes)}...")
        word_timings = await save_audio_with_word_boundaries(scene["narration"], audio)
        d = duration(audio)
        if d > target:
            speed = d/target
            if speed > 1.60:
                raise RuntimeError(f"Narasi adegan {n} terlalu panjang ({d:.2f}s); batas percepatan aman 1.60x.")
            print(f"Menyesuaikan tempo narasi adegan {n} menjadi {speed:.2f}x agar pas dengan durasi adegan.")
            temp = audio.with_name(audio.stem+"-fit.mp3")
            run(["ffmpeg","-y","-i",str(audio),"-filter:a",f"atempo={speed:.5f}","-t",f"{target:.3f}","-c:a","libmp3lame","-q:a","3",str(temp)])
            temp.replace(audio)
            word_timings = [{"text": w["text"], "start": w["start"] / speed} for w in word_timings]
            d = duration(audio)
        if not word_timings:
            tokens = scene["narration"].split()
            word_timings = [{"text": token, "start": (d * i / max(1, len(tokens)))} for i, token in enumerate(tokens)]
        if d < target-0.03:
            temp = audio.with_name(audio.stem+"-pad.mp3")
            run(["ffmpeg","-y","-i",str(audio),"-af",f"apad=pad_dur={target-d:.3f}","-t",f"{target:.3f}","-c:a","libmp3lame","-q:a","3",str(temp)])
            temp.replace(audio)
            d = duration(audio)
        expected += d+0.5
        folder = media/f"scene_{n:02d}"
        folder.mkdir(exist_ok=True)
        visual = folder/"visual.webp"
        shutil.copy2(image, visual)
        script_data.append({"sentence":scene["narration"],"keyword":f"scene_{n:02d}","_files":[str(visual)],"_word_timings":word_timings})
        print(f"Adegan {n}: {d+0.5:.2f} detik")

    if not MIN_SECONDS <= expected <= MAX_SECONDS:
        raise RuntimeError(f"Durasi rencana {expected:.2f}s di luar batas 40-60 detik.")
    settings = SimpleNamespace(ratio="9:16",vibe="general",filter="none",subtitles=True,subtitle_style="mystery_gold",emoji_subtitles=False,watermark=False,logo_path="")
    result = engine.create_video(script_data,media,media_type="photo",bg_music=None,settings=settings)
    if not result:
        raise RuntimeError("VUZA gagal membuat MP4.")
    final = OUT/"mystery-verse.mp4"
    shutil.copy2(result,final)
    actual = duration(final)
    if not MIN_SECONDS <= actual <= MAX_SECONDS:
        raise RuntimeError(f"MP4 berdurasi {actual:.2f}s; di luar batas 40-60.")
    print(f"BERHASIL: {final} | {actual:.2f} detik | 1080x1920 | 30 FPS")

if __name__ == "__main__":
    asyncio.run(main())
