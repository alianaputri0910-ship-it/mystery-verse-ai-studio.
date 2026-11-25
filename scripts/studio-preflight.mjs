import fs from "node:fs";
import path from "node:path";

const slug = (process.argv[2] || process.env.EPISODE_SLUG || "").trim();
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error("Pakai slug episode, contoh: node scripts/studio-preflight.mjs episode-baru");
  process.exit(2);
}
const base = path.join("episodes", slug);
const required = [
  "config/brand.json", "config/visual-style.json", "config/voice-profiles.json",
  "config/video-profiles.json", path.join(base, "short.json"),
  path.join(base, "longform.json"), "scripts/generate-story.js",
  "scripts/generate-images.js", "scripts/render-vuza.py",
  "scripts/generate-longform-images.js", "scripts/render-longform.py"
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) throw new Error("File wajib tidak ditemukan: " + missing.join(", "));
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const brand = read("config/brand.json");
const visual = read("config/visual-style.json");
const short = read(path.join(base, "short.json"));
const long = read(path.join(base, "longform.json"));
if (brand.channel_name !== "MYSTERY VERSE") throw new Error("Brand channel tidak cocok.");
if (visual.style_lock !== true) throw new Error("Visual style lock harus aktif.");
if (short.slug !== slug || !Array.isArray(short.scenes) || short.scenes.length !== 8) throw new Error("short.json harus memiliki slug yang cocok dan tepat 8 adegan.");
if (!short.opening_visual_prompt?.trim()) throw new Error("opening_visual_prompt Shorts belum tersedia.");
if (long.slug !== slug || !Array.isArray(long.chapters) || long.chapters.length < 6) throw new Error("longform.json harus memiliki slug yang cocok dan minimal 6 bab.");
if (!long.opening_visual_prompt?.trim() && !long.topic?.trim() && !short.topic?.trim()) {
  throw new Error("Isi topic pada short.json/longform.json atau opening_visual_prompt long-form.");
}
for (const [i, scene] of short.scenes.entries()) {
  if (!scene.beat?.trim() || !scene.narration?.trim() || !scene.visual_prompt?.trim()) throw new Error("Adegan Shorts " + (i + 1) + " belum lengkap.");
}
for (const [i, chapter] of long.chapters.entries()) {
  if (!chapter.title?.trim() || !chapter.narration?.trim()) throw new Error("Bab long-form " + (i + 1) + " belum lengkap.");
}
console.log(JSON.stringify({
  ok: true, channel: brand.channel_name, episode: slug,
  shorts_scenes: short.scenes.length, longform_chapters: long.chapters.length,
  visual_style: visual.style_name, style_lock: visual.style_lock
}, null, 2));
