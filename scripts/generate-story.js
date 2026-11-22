import fs from "node:fs";
import path from "node:path";

const topic = process.argv.slice(2).join(" ") ||
  "Tiga Penjaga Mercusuar Menghilang — Misteri Flannan Isles (1900)";

const scenes = [
  {
    beat: "HOOK",
    start: 0,
    end: 8,
    narration: "Di pulau terpencil ini, tiga penjaga mercusuar menghilang tanpa jejak.",
    visual_prompt: "A remote stone lighthouse on the Flannan Isles, Scotland, in December 1900, surrounded by a violent North Atlantic storm, jagged black rocks, huge waves, dense sea fog, cinematic historical mystery documentary, vertical 9:16, no text."
  },
  {
    beat: "TIGA PENJAGA",
    start: 8,
    end: 16,
    narration: "Pada Desember 1900, Ducat, Marshall, dan McArthur bertugas di Flannan Isles.",
    visual_prompt: "Three lighthouse keepers in historically accurate 1900 Scottish maritime work clothes near an isolated lighthouse, cold overcast weather, documentary historical reconstruction, photorealistic, vertical 9:16, no text."
  },
  {
    beat: "KAPAL BANTUAN",
    start: 16,
    end: 24,
    narration: "Namun kapal bantuan tiba dan menemukan mercusuar gelap, tanpa seorang penjaga.",
    visual_prompt: "A small early 1900s relief vessel approaching the remote Flannan Isles lighthouse through rough North Atlantic seas and fog, dark lighthouse windows, cinematic historical reconstruction, vertical 9:16, no text."
  },
  {
    beat: "PINTU YANG TERBUKA",
    start: 24,
    end: 32,
    narration: "Di dalam, ruangan kosong. Ketiga pria itu lenyap, tanpa penjelasan.",
    visual_prompt: "Interior of an isolated Scottish lighthouse in 1900, empty keeper quarters, abandoned table and chair, dim natural light through small windows, eerie silence, historically grounded cinematic documentary, vertical 9:16, no text."
  },
  {
    beat: "JEJAK MISTERIUS",
    start: 32,
    end: 40,
    narration: "Area pendaratan rusak dihantam badai. Perlengkapan berserakan di bebatuan.",
    visual_prompt: "Exposed landing area beneath the Flannan Isles lighthouse in 1900, jagged wet black rocks, damaged wooden railings, twisted ropes and storm-battered equipment, huge waves and sea spray, realistic storm damage, vertical 9:16, no text."
  },
  {
    beat: "LAUT MENELAN MEREKA",
    start: 40,
    end: 50,
    narration: "Diduga ombak besar menyeret mereka ke laut. Tak satu pun jasad ditemukan.",
    visual_prompt: "A towering North Atlantic wave crashing against the steep black rocks below the Flannan Isles lighthouse, a historical visual reconstruction of a possible accident, no people visible, dramatic but realistic, vertical 9:16, no text."
  },
  {
    beat: "MISTERI YANG TERSISA",
    start: 50,
    end: 60,
    narration: "Lebih dari seabad berlalu. Apa yang sebenarnya terjadi di pulau itu?",
    visual_prompt: "A lone Flannan Isles stone lighthouse at night in 1900, its beam sweeping across a dark restless sea, thick fog and distant waves, lonely mysterious atmosphere, cinematic photorealistic historical documentary, vertical 9:16, no text."
  }
];

const story = {
  channel: "MYSTERY VERSE",
  topic,
  language: "id-ID",
  format: {
    width: 1080,
    height: 1920,
    aspect_ratio: "9:16",
    duration_seconds: 60,
    fps: 30
  },
  scenes: scenes.map((scene, index) => ({
    scene: index + 1,
    start: scene.start,
    end: scene.end,
    beat: scene.beat,
    narration: scene.narration,
    visual_prompt: scene.visual_prompt,
    sound: "Dark ambient ocean drone, cold wind, distant storm waves, subtle cinematic impact sounds"
  }))
};

fs.mkdirSync("output", { recursive: true });
fs.writeFileSync(
  path.join("output", "story.json"),
  JSON.stringify(story, null, 2)
);

console.log("MYSTERY VERSE: naskah Flannan Isles 7 adegan berhasil dibuat.");
