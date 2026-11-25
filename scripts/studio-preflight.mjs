import fs from "node:fs";

const required = [
  "config/brand.json",
  "config/visual-style.json",
  "config/voice-profiles.json",
  "config/video-profiles.json",
  "episodes/trunyan/short.json",
  "episodes/trunyan/longform.json",
  "scripts/generate-story.js",
  "scripts/generate-images.js",
  "scripts/render-vuza.py",
  "scripts/generate-longform-images.js",
  "scripts/render-longform.py"
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Studio preflight gagal. File wajib tidak ditemukan:", missing);
  process.exit(1);
}

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const brand = read("config/brand.json");
const visual = read("config/visual-style.json");
const short = read("episodes/trunyan/short.json");
const long = read("episodes/trunyan/longform.json");

if (brand.channel_name !== "MYSTERY VERSE") throw new Error("Brand channel tidak cocok.");
if (visual.style_lock !== true) throw new Error("Visual style lock harus aktif.");
if (short.slug !== "trunyan" || short.scenes?.length !== 8) throw new Error("Episode Shorts Trunyan harus memiliki 8 adegan.");
if (!short.opening_visual_prompt) throw new Error("Opening visual Shorts belum tersedia.");
if (long.slug !== "trunyan" || long.chapters?.length < 6) throw new Error("Episode long-form Trunyan membutuhkan minimal 6 bab.");

for (const [i, scene] of short.scenes.entries()) {
  if (!scene.narration?.trim() || !scene.visual_prompt?.trim()) {
    throw new Error("Adegan Shorts " + (i + 1) + " belum lengkap.");
  }
}
for (const [i, chapter] of long.chapters.entries()) {
  if (!chapter.title?.trim() || !chapter.narration?.trim()) {
    throw new Error("Bab long-form " + (i + 1) + " belum lengkap.");
  }
}

console.log(JSON.stringify({
  ok: true,
  channel: brand.channel_name,
  episode: "trunyan",
  shorts_scenes: short.scenes.length,
  longform_chapters: long.chapters.length,
  visual_style: visual.style_name,
  style_lock: visual.style_lock
}, null, 2));
