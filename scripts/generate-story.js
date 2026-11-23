import fs from "node:fs";
import path from "node:path";

const slug = process.argv.slice(2).join(" ").trim() || "trunyan";
if (!/^[a-z0-9-]+$/.test(slug)) {
  throw new Error("EPISODE_SLUG_INVALID: Gunakan slug huruf kecil, angka, dan tanda hubung saja.");
}

const episodePath = path.join("episodes", slug, "short.json");
if (!fs.existsSync(episodePath)) {
  throw new Error("EPISODE_NOT_FOUND: Tidak ada naskah Shorts di " + episodePath);
}

const episode = JSON.parse(fs.readFileSync(episodePath, "utf8"));
if (episode.slug !== slug) throw new Error("EPISODE_SLUG_MISMATCH: Slug file dan isi episode berbeda.");
if (!Array.isArray(episode.scenes) || episode.scenes.length !== 8) {
  throw new Error("EPISODE_VALIDATION_FAILED: Shorts harus memiliki tepat 8 adegan termasuk CTA.");
}
for (const [index, scene] of episode.scenes.entries()) {
  if (!scene.narration?.trim() || !scene.visual_prompt?.trim() || !scene.beat?.trim()) {
    throw new Error("EPISODE_VALIDATION_FAILED: Adegan " + (index + 1) + " kehilangan beat, narasi, atau prompt visual.");
  }
}
if (!episode.opening_visual_prompt?.trim()) throw new Error("EPISODE_VALIDATION_FAILED: Opening visual prompt tidak tersedia.");

const storyData = {
  ...episode,
  format: { width: 1080, height: 1920, aspect_ratio: "9:16", duration_target_seconds: 65, fps: 30 }
};
fs.mkdirSync("output", { recursive: true });
fs.writeFileSync(path.join("output", "story.json"), JSON.stringify(storyData, null, 2));
fs.writeFileSync(path.join("output", "youtube-metadata.json"), JSON.stringify(episode.youtube || {}, null, 2));
console.log("MYSTERY VERSE: episode " + slug + " tervalidasi; " + storyData.scenes.length + " adegan siap untuk Shorts.");
