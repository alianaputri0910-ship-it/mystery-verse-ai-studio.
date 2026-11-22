import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const storyPath = "output/story.json";
const outputDir = "output/images";
const apiKey = process.env.POLLINATIONS_API_KEY;

if (!fs.existsSync(storyPath)) throw new Error("output/story.json tidak ditemukan.");
if (!apiKey) throw new Error("POLLINATIONS_API_KEY_MISSING: Tambahkan secret POLLINATIONS_API_KEY pada GitHub Settings > Secrets and variables > Actions.");
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
if (!Array.isArray(story.scenes) || story.scenes.length !== 7) throw new Error("Proyek ini membutuhkan tepat 7 adegan.");
fs.mkdirSync(outputDir, { recursive: true });
const model = process.env.POLLINATIONS_IMAGE_MODEL || "black-forest-labs/flux.1-schnell";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function generate(scene, index) {
  const prompt = scene.visual_prompt + " Photorealistic cinematic historical documentary reconstruction, vertical portrait 9:16, highly detailed, natural lighting, no text, no watermark.";
  const url = "https://gen.pollinations.ai/image/" + encodeURIComponent(prompt) + "?model=" + encodeURIComponent(model) + "&width=768&height=1365&seed=" + (1900 + index);
  const output = path.join(outputDir, `scene-${String(index + 1).padStart(2, "0")}.webp`);
  let error;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(`Membuat gambar ${index + 1}/7 (percobaan ${attempt}/4) dengan Pollinations ${model}...`);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" }, signal: AbortSignal.timeout(180000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
      if (!(res.headers.get("content-type") || "").startsWith("image/")) throw new Error("Respons bukan file gambar.");
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < 10000) throw new Error("File gambar terlalu kecil.");
      const temp = output + ".source";
      fs.writeFileSync(temp, bytes);
      const ff = spawnSync("ffmpeg", ["-y","-hide_banner","-loglevel","error","-i",temp,"-vf","scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=0.04:contrast=1.08:saturation=0.92,unsharp=5:5:0.35:3:3:0.0","-frames:v","1","-quality","88",output], {encoding:"utf8"});
      fs.rmSync(temp,{force:true});
      if (ff.status !== 0) throw new Error(ff.stderr || "Konversi WebP gagal.");
      if (!fs.existsSync(output) || fs.statSync(output).size < 1000) throw new Error("Gambar hasil konversi kosong.");
      console.log(`Gambar adegan ${index + 1} selesai.`);
      return;
    } catch (e) {
      error = e;
      console.error(`Percobaan ${attempt} gagal: ${e.message}`);
      if (attempt < 4) await sleep(attempt * 8000);
    }
  }
  throw new Error(`Gagal membuat adegan ${index + 1}: ${error?.message}`);
}
for (let i=0; i<story.scenes.length; i++) await generate(story.scenes[i],i);
console.log("Tujuh gambar AI berhasil dibuat.");
