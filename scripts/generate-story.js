import fs from "node:fs";
import path from "node:path";

const topic = process.argv.slice(2).join(" ") ||
  "Misteri di rumah kosong";

const scenes = [
  {
    beat: "HOOK",
    narration: "Jam tiga pagi, seseorang mengetuk pintu rumah itu. Padahal rumah tersebut sudah kosong selama dua puluh tahun."
  },
  {
    beat: "MISTERI",
    narration: "Warga sekitar mengaku sering mendengar suara langkah kaki dari lantai dua. Padahal bangunan itu sudah tidak memiliki tangga."
  },
  {
    beat: "PETUNJUK",
    narration: "Suatu malam, seorang pria menemukan rekaman CCTV yang memperlihatkan seorang anak berdiri di jendela."
  },
  {
    beat: "ANCAMAN",
    narration: "Ketika rekaman diputar ulang, anak itu perlahan menoleh ke arah kamera."
  },
  {
    beat: "TWIST",
    narration: "Pria itu terkejut. Anak dalam rekaman ternyata memakai pakaian yang sama dengannya."
  },
  {
    beat: "CLIFFHANGER",
    narration: "Lalu terdengar tiga ketukan dari belakangnya. Padahal dia sedang sendirian."
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
    duration_seconds: 60
  },
  scenes: scenes.map((scene, index) => ({
    scene: index + 1,
    start: index * 10,
    end: (index + 1) * 10,
    beat: scene.beat,
    narration: scene.narration,
    visual_prompt:
      `Ultra realistic cinematic Indonesian horror, ${topic}, scene ${index + 1}, vertical 9:16, dark atmosphere, realistic lighting, suspenseful found footage style, no text, no watermark.`,
    sound: "Dark ambient drone, distant wind, subtle horror sound effects"
  }))
};

fs.mkdirSync("output", { recursive: true });

fs.writeFileSync(
  path.join("output", "story.json"),
  JSON.stringify(story, null, 2)
);

console.log("MYSTERY VERSE story berhasil dibuat!");
