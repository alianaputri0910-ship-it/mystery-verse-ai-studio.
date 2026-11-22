import fs from "node:fs";
import path from "node:path";

const topic = process.argv.slice(2).join(" ") ||
  "Tiga Penjaga Mercusuar Menghilang — Misteri Flannan Isles (1900)";

const scenes = [
  {
    beat: "HOOK",
    start: 0,
    end: 8,
    narration: "Bayangkan... tiga orang tinggal di sebuah pulau terpencil. Mereka menjaga mercusuar di tengah lautan. Namun, suatu hari... ketiganya menghilang tanpa jejak.",
    visual_prompt: "A remote stone lighthouse on the Flannan Isles, Scotland, in December 1900, surrounded by a violent North Atlantic storm, jagged black rocks, huge waves, dense sea fog, cinematic historical mystery documentary, vertical 9:16, no text."
  },
  {
    beat: "TIGA PENJAGA",
    start: 8,
    end: 16,
    narration: "Desember 1900. James Ducat, Thomas Marshall, dan Donald McArthur menjalankan tugas mereka di Flannan Isles, Skotlandia. Tak seorang pun menyangka itu akan menjadi hari-hari terakhir mereka terlihat.",
    visual_prompt: "Three lighthouse keepers in historically accurate 1900 Scottish maritime work clothes near an isolated lighthouse, cold overcast weather, documentary historical reconstruction, photorealistic, vertical 9:16, no text."
  },
  {
    beat: "KAPAL BANTUAN",
    start: 16,
    end: 24,
    narration: "Ketika kapal bantuan tiba, sesuatu terasa sangat aneh. Mercusuar itu gelap. Tidak ada penjaga yang menyambut. Bahkan, tak ada tanda kehidupan.",
    visual_prompt: "A small early 1900s relief vessel approaching the remote Flannan Isles lighthouse through rough North Atlantic seas and fog, dark lighthouse windows, cinematic historical reconstruction, vertical 9:16, no text."
  },
  {
    beat: "PINTU YANG TERBUKA",
    start: 24,
    end: 32,
    narration: "Para pencari memasuki bangunan itu. Ketiga penjaga sudah tidak ada. Mereka meninggalkan mercusuar tanpa penjelasan. Seolah-olah sesuatu telah memaksa mereka pergi.",
    visual_prompt: "Interior of an isolated Scottish lighthouse in 1900, empty keeper quarters, abandoned table and chair, dim natural light through small windows, eerie silence, historically grounded cinematic documentary, vertical 9:16, no text."
  },
  {
    beat: "JEJAK MISTERIUS",
    start: 32,
    end: 40,
    narration: "Di area pendaratan, ditemukan kerusakan akibat cuaca ekstrem. Beberapa perlengkapan rusak. Semua mengarah pada satu kemungkinan mengerikan... ombak raksasa telah datang.",
    visual_prompt: "Exposed landing area beneath the Flannan Isles lighthouse in 1900, jagged wet black rocks, damaged wooden railings, twisted ropes and storm-battered equipment, huge waves and sea spray, realistic storm damage, vertical 9:16, no text."
  },
  {
    beat: "LAUT MENELAN MEREKA",
    start: 40,
    end: 50,
    narration: "Penyelidikan menduga ketiganya tersapu ombak besar ketika berada di dekat pantai. Tetapi tidak ada satu pun jasad yang ditemukan. Laut seolah menelan mereka tanpa meninggalkan jawaban.",
    visual_prompt: "A towering North Atlantic wave crashing against the steep black rocks below the Flannan Isles lighthouse, a historical visual reconstruction of a possible accident, no people visible, dramatic but realistic, vertical 9:16, no text."
  },
  {
    beat: "MISTERI YANG TERSISA",
    start: 50,
    end: 60,
    narration: "Lebih dari satu abad berlalu... ketiga penjaga itu tidak pernah ditemukan. Apakah mereka benar-benar hanya tersapu ombak? Atau ada sesuatu yang tak pernah diketahui siapa pun? Menurutmu, apa yang terjadi?",
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
