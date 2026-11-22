import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { spawnSync } from "node:child_process";

const API = "https://aihorde.net/api/v2";
const API_KEY = process.env.AI_HORDE_API_KEY || "0000000000";
const storyPath = "output/story.json";
const outputDir = "output/images";
const maxWaitMs = 25 * 60 * 1000;

if (!fs.existsSync(storyPath)) {
  throw new Error("output/story.json tidak ditemukan. Jalankan npm run story terlebih dahulu.");
}

const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
if (!Array.isArray(story.scenes) || story.scenes.length !== 6) {
  throw new Error("MYSTERY VERSE membutuhkan tepat 6 adegan.");
}

fs.mkdirSync(outputDir, { recursive: true });

async function api(pathname, options = {}) {
  const response = await fetch(API + pathname, {
    ...options,
    headers: {
      apikey: API_KEY,
      "Client-Agent": "MYSTERY-VERSE-AI-STUDIO:1.0:github-actions",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error("AI Horde API " + response.status + ": " + body.slice(0, 500));
  }
  return body ? JSON.parse(body) : {};
}

function toWebp(inputPath, outputPath) {
  const result = spawnSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", inputPath,
    "-vf", "scale=768:1152:force_original_aspect_ratio=increase,crop=768:1152",
    "-frames:v", "1", "-quality", "88", outputPath
  ], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Konversi gambar ke WebP gagal.");
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
    throw new Error("File WebP hasil konversi kosong atau rusak.");
  }
}

async function generate(scene) {
  const number = String(scene.scene).padStart(2, "0");
  const outputPath = path.join(outputDir, `scene-${number}.webp`);
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
    console.log("Gambar adegan " + number + " sudah ada, dilewati.");
    return;
  }

  const prompt = [
    scene.visual_prompt,
    "Photorealistic cinematic still frame, vertical portrait composition 2:3.",
    "High detail, realistic human anatomy, natural cinematic lighting, deep shadows, atmospheric fog.",
    "One coherent scene, no collage, no split screen, no text, no subtitles, no logo, no watermark."
  ].join(" ");

  console.log("Mengirim permintaan gambar AI Horde untuk adegan " + number + "...");
  const request = await api("/generate/async", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      params: {
        sampler_name: "k_euler",
        cfg_scale: 7,
        width: 512,
        height: 768,
        steps: 24,
        n: 1
      },
      nsfw: false,
      censor_nsfw: true,
      trusted_workers: false,
    })
  });

  if (!request.id) throw new Error("AI Horde tidak mengembalikan ID tugas gambar.");
  const started = Date.now();
  let generation = null;

  while (Date.now() - started < maxWaitMs) {
    await sleep(12000);
    const status = await api("/generate/check/" + request.id);
    console.log(
      "Adegan " + number + " — antrean: " +
      (status.queue_position ?? "?") +
      ", selesai: " + (status.done ? "ya" : "belum")
    );

    if (status.faulted) throw new Error("AI Horde gagal membuat gambar adegan " + number + ".");
    if (status.done) {
      const result = await api("/generate/status/" + request.id);
      generation = result.generations && result.generations[0];
      break;
    }
  }

  if (!generation || !generation.img) {
    throw new Error("Waktu tunggu gambar adegan " + number + " habis. Jalankan ulang workflow; gambar yang sudah selesai akan dipertahankan.");
  }

  const rawPath = path.join(outputDir, `scene-${number}-source.png`);
  const imageValue = generation.img;

  if (imageValue.startsWith("https://") || imageValue.startsWith("http://")) {
    const response = await fetch(imageValue);
    if (!response.ok) throw new Error("Gagal mengunduh gambar adegan " + number + ".");
    fs.writeFileSync(rawPath, Buffer.from(await response.arrayBuffer()));
  } else {
    const comma = imageValue.indexOf(",");
    const encoded = imageValue.startsWith("data:image/") && comma >= 0
      ? imageValue.slice(comma + 1)
      : imageValue;
    fs.writeFileSync(rawPath, Buffer.from(encoded, "base64"));
  }

  toWebp(rawPath, outputPath);
  fs.rmSync(rawPath, { force: true });
  console.log("Gambar adegan " + number + " tersimpan: " + outputPath);
}

for (const scene of story.scenes) {
  await generate(scene);
}

console.log("Semua 6 gambar MYSTERY VERSE siap digunakan.");
