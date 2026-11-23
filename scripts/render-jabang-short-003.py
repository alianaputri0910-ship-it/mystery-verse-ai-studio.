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
from PIL import Image, ImageDraw, ImageFont, ImageOps
from edge_tts import Communicate
from video_engine import VideoEngine, resolve_font_path

OUT = ROOT / "output"
VOICE = "id-ID-ArdiNeural"
RATE = "-7%"
MIN_SECONDS, MAX_SECONDS = 40.0, 179.0

def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr[-3000:] or "FFmpeg gagal.")
    return p.stdout.strip()

def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                      "-of", "default=noprint_wrappers=1:nokey=1", str(path)]))

async def make_voice(text, audio_path, rate=RATE, pitch="+0Hz", volume="+0%"):
    communicator = Communicate(text, VOICE, rate=rate, pitch=pitch, volume=volume, boundary="WordBoundary")
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

async def make_scene_voice(scene, audio_path, temp_dir):
    """Synthesize scene-specific acting; optional voice_parts allow emotional changes inside one scene."""
    parts = scene.get("voice_parts") or [{
        "text": scene["narration"],
        "rate": scene.get("rate", RATE),
        "pitch": scene.get("pitch", "+0Hz"),
        "volume": scene.get("volume", "+0%")
    }]
    if len(parts) == 1:
        part = parts[0]
        return await make_voice(part["text"], audio_path, part.get("rate", RATE),
                                part.get("pitch", "+0Hz"), part.get("volume", "+0%"))
    concat_file = temp_dir / f"{audio_path.stem}-parts.txt"
    boundaries = []
    offset = 0.0
    paths = []
    for index, part in enumerate(parts):
        part_path = temp_dir / f"{audio_path.stem}-part-{index}.mp3"
        words = await make_voice(part["text"], part_path, part.get("rate", RATE),
                                 part.get("pitch", "+0Hz"), part.get("volume", "+0%"))
        paths.append(part_path)
        boundaries.extend({"text": word["text"], "start": offset + word["start"]} for word in words)
        offset += duration(part_path)
    concat_file.write_text("".join(f"file '{p.as_posix()}'\n" for p in paths), encoding="utf-8")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file),
         "-c:a", "libmp3lame", "-q:a", "2", str(audio_path)])
    return boundaries

def create_short_thumbnail(background_path, output_path):
    """Create a bespoke Jabang Mayit 9:16 thriller poster."""
    source = Image.open(background_path).convert("RGB")
    image = ImageOps.fit(source, (1080, 1920), method=Image.Resampling.LANCZOS).convert("RGBA")
    shade = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shade_draw = ImageDraw.Draw(shade)
    for y in range(360, 1540):
        alpha = int(30 + 145 * ((y - 360) / 1180))
        shade_draw.line((0, y, 1080, y), fill=(8, 5, 8, alpha), width=1)
    image = Image.alpha_composite(image, shade)
    draw = ImageDraw.Draw(image)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    if not Path(font_path).exists():
        font_path = resolve_font_path()
    def font(size):
        try:
            return ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()
    brand_font = font(48)
    kicker_font = font(34)
    title_font = font(78)
    footer_font = font(32)
    gold = (226, 184, 94, 255)
    white = (255, 248, 235, 255)

    brand = "MYSTERY VERSE"
    box = draw.textbbox((0, 0), brand, font=brand_font, stroke_width=2)
    draw.text(((1080 - (box[2] - box[0])) / 2, 135), brand, font=brand_font,
              fill=gold, stroke_width=3, stroke_fill=(0, 0, 0, 180))
    draw.rounded_rectangle((150, 235, 930, 242), radius=3, fill=gold)

    kicker = "SERIAL HOROR INDONESIA"
    kb = draw.textbbox((0, 0), kicker, font=kicker_font)
    draw.text(((1080 - (kb[2] - kb[0])) / 2, 560), kicker, font=kicker_font,
              fill=gold, stroke_width=2, stroke_fill=(0, 0, 0, 180))

    title_lines = ["KAMPUNG", "JABANG MAYIT", "PENUMPANG ANEH"]
    y = 720
    for index, line in enumerate(title_lines):
        bb = draw.textbbox((0, 0), line, font=title_font, stroke_width=3)
        x = (1080 - (bb[2] - bb[0])) / 2
        color = gold if index == 2 else white
        draw.text((x + 4, y + 7), line, font=title_font, fill=(0, 0, 0, 220),
                  stroke_width=8, stroke_fill=(0, 0, 0, 220))
        draw.text((x, y), line, font=title_font, fill=color,
                  stroke_width=3, stroke_fill=(12, 8, 10, 255))
        y += 118

    footer = "EPISODE 003  •  MIMPI YANG TERLALU NYATA"
    fb = draw.textbbox((0, 0), footer, font=footer_font)
    draw.text(((1080 - (fb[2] - fb[0])) / 2, 1515), footer, font=footer_font,
              fill=white, stroke_width=2, stroke_fill=(0, 0, 0, 200))
    image.convert("RGB").save(output_path, quality=92, optimize=True)
    print("Poster Shorts Kampung Jabang Mayit berhasil dibuat.")

def create_intro_card(output_path, episode_number, episode_title):
    """Create a distressed horror-film title card with blood-red glitch accents."""
    image = Image.new("RGB", (1080, 1920), (1, 1, 3))
    draw = ImageDraw.Draw(image)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf"
    if not Path(font_path).exists():
        font_path = resolve_font_path()
    def f(size):
        try:
            return ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()

    # Dark scanlines, interference bands and sparse red static.
    for y in range(0, 1920, 6):
        draw.line((0, y, 1080, y), fill=(5, 5, 8), width=1)
    for y, h in [(585, 5), (664, 3), (1120, 8), (1285, 4)]:
        draw.rectangle((0, y, 1080, y+h), fill=(28, 7, 10))
    rng = np.random.default_rng(19)
    for _ in range(130):
        x = int(rng.integers(0, 1080))
        y = int(rng.integers(500, 1370))
        w = int(rng.integers(2, 23))
        color = (int(rng.integers(55, 125)), 5, 9)
        draw.rectangle((x, y, min(1080, x+w), y+2), fill=color)

    def centered_distressed(label, y, font, color, red_shadow=True):
        box = draw.textbbox((0, 0), label, font=font, stroke_width=2)
        x = (1080 - (box[2] - box[0])) // 2
        if red_shadow:
            draw.text((x-7, y+3), label, font=font, fill=(105, 5, 13),
                      stroke_width=3, stroke_fill=(105, 5, 13))
            draw.text((x+5, y-2), label, font=font, fill=(28, 44, 48),
                      stroke_width=1, stroke_fill=(28, 44, 48))
        draw.text((x, y), label, font=font, fill=color,
                  stroke_width=3, stroke_fill=(12, 9, 10))
        # Fine scratches cut across the lettering for a worn horror-poster feel.
        width = box[2] - box[0]
        for i in range(11):
            sx = x + int((i + 1) * width / 13)
            sy = y + int(rng.integers(8, max(9, box[3] - box[1] - 8)))
            draw.line((sx, sy, sx + int(rng.integers(4, 15)), sy + int(rng.integers(8, 24))),
                      fill=(65, 48, 47), width=1)

    # Small series label.
    label_font = f(30)
    centered_distressed("MYSTERY VERSE PRESENTS", 575, label_font, (156, 130, 119), False)

    # Main title: narrow, weathered, bone-white with blood-red offset.
    title_font = f(78)
    centered_distressed("KAMPUNG", 720, title_font, (218, 211, 198))
    centered_distressed("JABANG MAYIT", 825, f(82), (232, 224, 210))

    # Episode and subtitle are clearly legible but still ominous.
    ep_font = f(39)
    centered_distressed(f"EPISODE {episode_number}", 1010, ep_font, (178, 145, 125), False)
    draw.rectangle((250, 1080, 830, 1084), fill=(116, 12, 20))
    centered_distressed(episode_title.upper(), 1125, f(43), (196, 25, 34))

    # A few vertical blood-like streaks under the subtitle.
    for x, length in [(318, 30), (447, 17), (716, 26), (804, 14)]:
        draw.line((x, 1182, x-2, 1182+length), fill=(96, 7, 14), width=2)

    image.save(output_path, quality=95)
    print(f"Title card horor distressed + blood-red glitch Episode {episode_number} berhasil dibuat.")

def create_outro_card(background_path, output_path):
    """Create a bespoke end card; Shorts begin directly with the story, no opening."""
    source = Image.open(background_path).convert("RGB")
    image = ImageOps.fit(source, (1080, 1920), method=Image.Resampling.LANCZOS).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, 1080, 1920), fill=(4, 5, 8, 178))
    od.rectangle((72, 520, 1008, 1370), fill=(8, 7, 9, 190), outline=(210, 157, 103, 210), width=3)
    image = Image.alpha_composite(image, overlay)
    draw = ImageDraw.Draw(image)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    if not Path(font_path).exists():
        font_path = resolve_font_path()
    def f(size):
        try:
            return ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()
    gold, white = (226, 184, 94, 255), (255, 248, 235, 255)
    def centered(label, y, font, color):
        b = draw.textbbox((0, 0), label, font=font, stroke_width=2)
        x = (1080 - (b[2] - b[0])) / 2
        draw.text((x, y), label, font=font, fill=color, stroke_width=2, stroke_fill=(0, 0, 0, 210))
    centered("MYSTERY VERSE", 635, f(54), gold)
    centered("LANJUTANNYA ADA DI", 830, f(38), white)
    centered("EPISODE 003", 900, f(76), gold)
    centered("SUBSCRIBE  •  LIKE  •  KOMEN", 1090, f(38), white)
    centered("Menurut lo, apa yang bakal terjadi", 1200, f(30), white)
    centered("sama Arya?", 1245, f(30), white)
    image.convert("RGB").save(output_path, quality=92, optimize=True)
    print("Outro CTA MYSTERY VERSE berhasil dibuat.")

def make_brand(path):
    """Create a new restrained copper-gold channel signature for this series."""
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
    draw.text((x, y), label, font=font, fill=(226, 166, 118, 190), stroke_width=1, stroke_fill=(15, 12, 8, 100))
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
        raise RuntimeError("Naskah inti harus berisi tepat 8 adegan cerita.")
    images = OUT / "images"
    if not images.exists():
        raise RuntimeError("Folder gambar AI tidak ditemukan.")
    engine = VideoEngine(str(OUT / "vuza_render"))
    script_data = []
    total = 0.0

    for i, scene in enumerate(scenes):
        audio = engine.temp_dir / f"speech_{i}.mp3"
        words = await make_scene_voice(scene, audio, engine.temp_dir)
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

    # Concise CTA leaves room for the recurring 2.4-second opening title card.
    outro_text = "Mau tahu lanjutannya? Subscribe, like, dan tulis teori lo di komentar!"
    outro_audio = engine.temp_dir / "speech_8.mp3"
    outro_words = await make_voice(outro_text, outro_audio, rate="-8%", pitch="+0Hz", volume="+0%")
    outro_seconds = duration(outro_audio)
    outro_image = OUT / "vuza_media" / "scene_09"
    outro_image.mkdir(parents=True, exist_ok=True)
    outro_card = outro_image / "outro.webp"
    create_outro_card(images / "scene-08.webp", outro_card)
    script_data.append({
        "sentence": outro_text,
        "keyword": "scene_09",
        "_files": [str(outro_card)],
        "_word_timings": outro_words
    })
    total += outro_seconds + 0.15
    if not MIN_SECONDS <= total <= MAX_SECONDS:
        raise RuntimeError(f"Total cerita + outro {total:.2f}s di luar batas 40–179 detik. Padatkan naskah; jangan mempercepat suara.")
    print(f"Outro CTA: {outro_seconds:.2f} detik, {len(outro_words)} penanda kata, kecepatan tetap {RATE}.")
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

    # Every episode begins with the same 2.4-second black glitch title card as Episode 001.
    title_text = str(story.get("title", ""))
    episode_number = str(story.get("slug", "jabang-mayit-003")).rsplit("-", 1)[-1].zfill(3)
    episode_title = title_text.split("—", 1)[-1].strip() if "—" in title_text else "PENUMPANG YANG ANEH"
    intro_image = OUT / f"episode-{episode_number}-glitch-title.png"
    intro_video = OUT / f"episode-{episode_number}-glitch-title.mp4"
    joined = OUT / f"episode-{episode_number}-with-title.mp4"
    create_intro_card(intro_image, episode_number, episode_title)
    run(["ffmpeg", "-y", "-loop", "1", "-i", str(intro_image),
         "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
         "-t", "2.4", "-vf", "scale=1080:1920,noise=alls=16:allf=t+u,format=yuv420p",
         "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
         "-c:a", "aac", "-b:a", "192k", "-shortest", str(intro_video)])
    run(["ffmpeg", "-y", "-i", str(intro_video), "-i", str(final),
         "-filter_complex",
         "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[0:a]aresample=48000[a0];[1:a]aresample=48000[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]",
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
         "-c:a", "aac", "-b:a", "192k", str(joined)])
    joined.replace(final)

    actual = duration(final)
    if not MIN_SECONDS <= actual <= MAX_SECONDS:
        raise RuntimeError(f"MP4 akhir berdurasi {actual:.2f}s, di luar batas 40–179 detik termasuk intro.")
    probe = json.loads(run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(final)]))
    video_stream = next((x for x in probe.get("streams",[]) if x.get("codec_type")=="video"),None)
    audio_stream = next((x for x in probe.get("streams",[]) if x.get("codec_type")=="audio"),None)
    if not video_stream or (video_stream.get("width"),video_stream.get("height")) != (1080,1920):
        raise RuntimeError("Validasi resolusi gagal: hasil harus 1080x1920.")
    if not audio_stream:
        raise RuntimeError("Validasi audio gagal: MP4 tidak memiliki audio.")
    create_short_thumbnail(images/"scene-08.webp", OUT/"thumbnail.jpg")
    print(f"BERHASIL: {final} | {actual:.2f}s | 1080x1920 | 30 FPS | intro glitch 2.4s + outro CTA tersinkron | {len(script_data)} adegan dengan subtitle per kata")

if __name__ == "__main__":
    asyncio.run(main())
