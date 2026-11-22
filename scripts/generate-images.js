import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const storyPath = "output/story.json";
const outputDir = "output/images";
const aiAssetsDir = "assets/ai-images";

if (!fs.existsSync(storyPath)) {
  throw new Error("output/story.json tidak ditemukan. Jalankan npm run story terlebih dahulu.");
}
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
if (!Array.isArray(story.scenes) || story.scenes.length !== 7) {
  throw new Error("MYSTERY VERSE Flannan Isles membutuhkan tepat 7 adegan.");
}

fs.mkdirSync(outputDir, { recursive: true });
const aiZip = fs.existsSync(aiAssetsDir)
  ? fs.readdirSync(aiAssetsDir).find(name => name.toLowerCase() === "perchance-scenes.zip")
  : null;

if (!aiZip) {
  throw new Error(
    "PERCHANCE_IMAGES_NOT_AVAILABLE: Wikimedia Commons sudah dinonaktifkan. " +
    "Perchance.org tidak menyediakan API publik resmi untuk membuat gambar langsung dari GitHub Actions. " +
    "Otomatisasi melalui endpoint tidak resmi memerlukan otomasi browser dan verifikasi anti-bot; " +
    "workflow tidak akan mencoba melewati verifikasi tersebut. " +
    "Arsip lama mystery-verse-ai-visuals.zip berisi hanya 6 gambar dan tidak akan digunakan. Untuk render berbasis Perchance, diperlukan arsip assets/ai-images/perchance-scenes.zip berisi tepat 7 gambar."
  );
}

const extractDir = path.join(aiAssetsDir, "_extracted");
fs.rmSync(extractDir, { recursive: true, force: true });
fs.mkdirSync(extractDir, { recursive: true });
const unzip = spawnSync("unzip", ["-o", path.join(aiAssetsDir, aiZip), "-d", extractDir], { encoding: "utf8" });
if (unzip.status !== 0) throw new Error("Gagal mengekstrak ZIP gambar: " + (unzip.stderr || ""));
const listing = spawnSync("find", [extractDir, "-type", "f"], { encoding: "utf8" });
if (listing.status !== 0) throw new Error("Tidak dapat membaca isi ZIP: " + (listing.stderr || ""));
const files = listing.stdout.split(/\r?\n/)
  .filter(file => file && /\.(jpe?g|png|webp)$/i.test(file))
  .sort();
if (files.length !== 7) {
  throw new Error("ZIP Perchance harus berisi tepat 7 gambar JPG, PNG, atau WebP. Ditemukan: " + files.length);
}

function toWebp(inputPath, outputPath) {
  const result = spawnSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", inputPath,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=0.04:contrast=1.08:saturation=0.92,unsharp=5:5:0.35:3:3:0.0",
    "-frames:v", "1", "-quality", "88", outputPath
  ], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Konversi gambar ke WebP gagal.");
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
    throw new Error("File WebP hasil konversi kosong atau rusak.");
  }
}

for (let i = 0; i < 7; i++) {
  const outputPath = path.join(outputDir, `scene-${String(i + 1).padStart(2, "0")}.webp`);
  toWebp(files[i], outputPath);
  console.log("Visual AI Perchance adegan " + String(i + 1).padStart(2, "0") + " siap.");
}
console.log("Tujuh gambar AI berhasil diproses. Tidak ada gambar Wikimedia yang digunakan.");
