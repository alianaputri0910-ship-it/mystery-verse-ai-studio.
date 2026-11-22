import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { spawnSync } from "node:child_process";

const API = "https://vexa-ai.pages.dev";
const storyPath = "output/story.json";
const outputDir = "output/images";
const maxAttempts = 3;

if (!fs.existsSync(storyPath)) {
  throw new Error("output/story.json tidak ditemukan. Jalankan npm run story terlebih dahulu.");
}

const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
if (!Array.isArray(story.scenes) || story.scenes.length !== 6) {
  throw new Error("MYSTERY VERSE membutuhkan tepat 6 adegan.");
}

fs.mkdirSync(outputDir, { recursive: true });

function toWebp(inputPath, outputPath) {
  const result = spawnSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", inputPath,
    "-vf", "scale=768:1365:force_original_aspect_ratio=increase,crop=768:1365",
    "-frames:v", "1", "-quality", "88", outputPath
  ], { encoding: "utf8" });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || "Konversi gambar ke WebP gagal.");
  }
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
    "Photorealistic cinematic horror documentary still, vertical 9:16 portrait composition.",
    "Realistic human anatomy, dramatic low-key lighting, deep shadows, atmospheric fog, intricate details.",
    "One coherent scene, no collage, no split screen, no text, no subtitles, no logo, no watermark."
  ].join(" ").slice(0, 990);

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let rawPath;
    try {
      console.log("Meminta gambar adegan " + number + " melalui layanan gambar gratis (percobaan " + attempt + "/" + maxAttempts + ")...");

      const response = await fetch(API + "/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "flux" }),
        signal: AbortSignal.timeout(240000)
      });

      const body = await response.text();
      if (!response.ok) {
        throw new Error("Layanan gambar mengembalikan HTTP " + response.status + ": " + body.slice(0, 400));
      }

      let result;
      try {
        result = JSON.parse(body);
      } catch {
        throw new Error("Respons layanan gambar bukan JSON yang valid: " + body.slice(0, 300));
      }

      if (!result.success || !result.proxy_url) {
        throw new Error(result.error || "Layanan gambar tidak mengembalikan proxy_url.");
      }

      const imageResponse = await fetch(result.proxy_url, {
        signal: AbortSignal.timeout(120000)
      });
      if (!imageResponse.ok) {
        throw new Error("Gagal mengunduh gambar dari proxy: HTTP " + imageResponse.status);
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      if (imageBuffer.length < 1000) {
        throw new Error("Data gambar terlalu kecil atau kosong.");
      }

      rawPath = path.join(outputDir, `scene-${number}-source`);
      fs.writeFileSync(rawPath, imageBuffer);
      toWebp(rawPath, outputPath);
      fs.rmSync(rawPath, { force: true });

      console.log("Gambar adegan " + number + " berhasil disimpan: " + outputPath);
      return;
    } catch (error) {
      lastError = error;
      if (rawPath) fs.rmSync(rawPath, { force: true });
      console.error("Percobaan " + attempt + " gagal untuk adegan " + number + ": " + error.message);
      if (attempt < maxAttempts) await sleep(attempt * 10000);
    }
  }

  throw new Error(
    "Gagal membuat gambar adegan " + number + " setelah " + maxAttempts +
    " percobaan. Penyedia gambar gratis mungkin sedang sibuk. Detail: " +
    (lastError?.message || "unknown error")
  );
}

for (const scene of story.scenes) {
  await generate(scene);
}

console.log("Semua 6 gambar MYSTERY VERSE siap digunakan.");
