import asyncio
import json
import re
import wave
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
from video_engine import VideoEngine, resolve_font_path
OUT = ROOT / "output"
VOICE = "id-ID-ArdiNeural"
NARRATION_RATE = "-18%"
MIN_SECONDS, MAX_SECONDS = 40.0, 60.0

def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr[-2500:] or "FFmpeg gagal.")
    return p.stdout.strip()

def duration(path):
    return float(run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)]))


def compress_long_pauses(audio_path, word_timings):
    """Shorten only long silent gaps while keeping subtitle timestamps aligned."""
    probe = subprocess.run(
        ["ffmpeg", "-i", str(audio_path), "-af", "silencedetect=noise=-42dB:d=0.50", "-f", "null", "-"],
        capture_output=True, text=True
    )
    silence_starts = [float(x) for x in re.findall(r"silence_start:\s*([0-9.]+)", probe.stderr)]
    silence_ends = [float(x) for x in re.findall(r"silence_end:\s*([0-9.]+)", probe.stderr)]
    pairs = []
    for start, end in zip(silence_starts, silence_ends):
        if end - start > 0.50:
            pairs.append((start, end))
    if not pairs:
        return word_timings, duration(audio_path)

    original_duration = duration(audio_path)
    keep_silence = 0.18
    intervals = []
    cursor = 0.0
    removed = []
    for start, end in pairs:
        cut_start = min(end, start + keep_silence)
        if cut_start > cursor:
            intervals.append((cursor, cut_start))
        removed.append((cut_start, end))
        cursor = end
    if cursor < original_duration:
        intervals.append((cursor, original_duration))
    intervals = [(a, b) for a, b in intervals if b - a > 0.025]
    if len(intervals) < 2:
        return word_timings, original_duration

    filters = []
    labels = []
    for i, (start, end) in enumerate(intervals):
        filters.append(f"[0:a]atrim=start={start:.6f}:end={end:.6f},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[a{i}]")
    filters.append("".join(labels) + f"concat=n={len(labels)}:v=0:a=1[out]")
    temp = audio_path.with_name(audio_path.stem + "-tight.mp3")
    run(["ffmpeg", "-y", "-i", str(audio_path), "-filter_complex", ";".join(filters),
         "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "3", str(temp)])

    def shifted(t):
        removed_before = 0.0
        for cut_start, cut_end in removed:
            if t >= cut_end:
                removed_before += cut_end - cut_start
            elif t > cut_start:
                return cut_start - removed_before
        return max(0.0, t - removed_before)

    adjusted = [{"text": w["text"], "start": shifted(float(w["start"]))} for w in word_timings]
    temp.replace(audio_path)
    return adjusted, duration(audio_path)


def create_atmospheric_sfx(path, seconds):
    """Create original low-level wind/sea ambience and restrained scene-transition hits."""
    import numpy as np
    sample_rate = 24000
    count = max(1, int(seconds * sample_rate))
    rng = np.random.default_rng(1900)
    time = np.arange(count, dtype=np.float32) / sample_rate
    coarse_count = max(2, int(seconds * 120))
    coarse = rng.normal(0.0, 1.0, coarse_count).astype(np.float32)
    coarse_x = np.linspace(0.0, 1.0, coarse_count)
    fine_x = np.linspace(0.0, 1.0, count)
    wind = np.interp(fine_x, coarse_x, coarse).astype(np.float32)
    wind /= max(0.001, float(np.max(np.abs(wind))))
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * 0.075 * time + 0.8)
    bed = (0.010 * wind * swell
           + 0.010 * np.sin(2 * np.pi * 48.0 * time)
           + 0.004 * np.sin(2 * np.pi * 73.0 * time + 0.3))
    # Soft, short whoosh/low thump at each scene change; kept below narration.
    for scene_start in np.arange(0.7, seconds, 8.0):
        start = int(scene_start * sample_rate)
        length = min(int(0.55 * sample_rate), count - start)
        if length <= 0:
            continue
        local_t = np.arange(length, dtype=np.float32) / sample_rate
        envelope = np.exp(-local_t * 7.0)
        burst = rng.normal(0.0, 1.0, length).astype(np.float32)
        bed[start:start + length] += 0.018 * envelope * burst
        bed[start:start + length] += 0.025 * envelope * np.sin(2 * np.pi * 92.0 * local_t)
    peak = max(0.001, float(np.max(np.abs(bed))))
    bed = np.clip(bed * min(1.0, 0.085 / peak), -0.085, 0.085)
    stereo = np.column_stack((bed, bed)).astype(np.float32)
    pcm = (stereo * 32767).astype("<i2")
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())


def create_channel_brand(path):
    """Create a subtle, readable MYSTERY VERSE label for the top of the frame."""
    from PIL import Image, ImageDraw, ImageFont
    canvas = Image.new("RGBA", (1080, 120), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    font_path = resolve_font_path()
    try:
        font = ImageFont.truetype(font_path, 46) if font_path else ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()
    label = "MYSTERY VERSE"
    box = draw.textbbox((0, 0), label, font=font, stroke_width=2)
    width = box[2] - box[0]
    x = (1080 - width) / 2
    y = 30
    draw.text((x + 2, y + 3), label, font=font, fill=(0, 0, 0, 105),
              stroke_width=3, stroke_fill=(0, 0, 0, 95))
    draw.text((x, y), label, font=font, fill=(230, 193, 112, 158),
              stroke_width=1, stroke_fill=(15, 12, 8, 100))
    canvas.save(path)


async def save_audio_with_word_boundaries(text, audio_path):
    """Save Edge-TTS audio and its real word-boundary timestamps."""
    communicator = Communicate(text, VOICE, rate=NARRATION_RATE, volume="+0%")
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
        target = slot - 0.12
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
        word_timings, d = compress_long_pauses(audio, word_timings)
        expected += d+0.15
        folder = media/f"scene_{n:02d}"
        folder.mkdir(exist_ok=True)
        visual = folder/"visual.webp"
        shutil.copy2(image, visual)
        script_data.append({"sentence":scene["narration"],"keyword":f"scene_{n:02d}","_files":[str(visual)],"_word_timings":word_timings})
        print(f"Adegan {n}: {d+0.15:.2f} detik (jeda panjang dipadatkan)")

    if not MIN_SECONDS <= expected <= MAX_SECONDS:
        raise RuntimeError(f"Durasi rencana {expected:.2f}s di luar batas 40-60 detik.")
    settings = SimpleNamespace(ratio="9:16",vibe="general",filter="none",subtitles=True,subtitle_style="mystery_gold",emoji_subtitles=False,watermark=False,logo_path="")
    result = engine.create_video(script_data,media,media_type="photo",bg_music=None,settings=settings)
    if not result:
        raise RuntimeError("VUZA gagal membuat MP4.")
    final = OUT/"mystery-verse.mp4"
    shutil.copy2(result,final)

    # Add a subtle channel identity at the top and original atmospheric SFX below narration.
    brand_png = OUT / "mystery-verse-brand.png"
    sfx_wav = OUT / "mystery-verse-atmosphere.wav"
    branded_video = OUT / "mystery-verse-branded.mp4"
    mixed_video = OUT / "mystery-verse-mixed.mp4"
    create_channel_brand(brand_png)
    run(["ffmpeg", "-y", "-i", str(final), "-i", str(brand_png),
         "-filter_complex", "[0:v][1:v]overlay=(W-w)/2:42:format=auto[v]",
         "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "19", "-c:a", "copy", str(branded_video)])
    branded_video.replace(final)

    actual = duration(final)
    create_atmospheric_sfx(sfx_wav, actual)
    run(["ffmpeg", "-y", "-i", str(final), "-i", str(sfx_wav),
         "-filter_complex", "[1:a]volume=0.32[sfx];[0:a][sfx]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(mixed_video)])
    mixed_video.replace(final)

    actual = duration(final)
    if not MIN_SECONDS <= actual <= MAX_SECONDS:
        raise RuntimeError(f"MP4 berdurasi {actual:.2f}s; di luar batas 40-60.")
    print(f"BERHASIL: {final} | {actual:.2f} detik | 1080x1920 | 30 FPS")

if __name__ == "__main__":
    asyncio.run(main())
