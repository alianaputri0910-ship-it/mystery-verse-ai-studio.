
import fs from "node:fs";
import path from "node:path";

const storyPath = "output/story.json";

if (!fs.existsSync(storyPath)) {
  throw new Error("Cerita belum tersedia. Jalankan npm run story.");
}

const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

const scenesHTML = story.scenes.map(scene => {
  const number = String(scene.scene).padStart(2, "0");
  const audioPath = `./output/audio/scene-${number}.mp3`;

  if (!fs.existsSync(`output/audio/scene-${number}.mp3`)) {
    throw new Error(`Audio adegan ${number} belum tersedia.`);
  }

  return `
    <section
      class="scene clip"
      id="scene-${number}"
      data-start="${scene.start}"
      data-duration="${scene.end - scene.start}"
      data-track-index="0"
    >
      <div class="brand">MYSTERY VERSE</div>
      <div class="number">
        ${number} — ${escapeHTML(scene.beat)}
      </div>
      <div class="caption">
        ${escapeHTML(scene.narration)}
      </div>
      <div class="footer">60 SECONDS OF MYSTERY</div>
    </section>

    <audio
      id="voice-${number}"
      src="${audioPath}"
      data-start="${scene.start}"
      data-track-index="1"
    ></audio>
  `;
}).join("\n");

const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MYSTERY VERSE</title>
<style>
* { box-sizing: border-box; }

html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  background: #050505;
  color: white;
  font-family: Arial, sans-serif;
}

#root {
  position: relative;
  width: 1080px;
  height: 1920px;
  overflow: hidden;
  background: radial-gradient(
    ellipse at center, #291010, #050505 75%
  );
}

.scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 100px;
  text-align: center;
}

.brand {
  color: #b99a9a;
  font-size: 42px;
  letter-spacing: 12px;
  margin-bottom: 100px;
}

.number {
  color: #d13b3b;
  font-size: 30px;
  letter-spacing: 6px;
  margin-bottom: 50px;
}

.caption {
  font-size: 64px;
  line-height: 1.4;
  font-weight: bold;
  text-shadow: 0 5px 20px black;
}

.footer {
  position: absolute;
  bottom: 100px;
  color: #777;
  font-size: 24px;
  letter-spacing: 8px;
}
</style>
</head>
<body>
<div id="root"
  data-composition-id="mystery-verse"
  data-start="0"
  data-duration="${story.format.duration_seconds}"
  data-width="1080"
  data-height="1920"
  data-no-timeline>
  ${scenesHTML}
</div>
</body>
</html>`;

fs.mkdirSync("output", { recursive: true });

fs.writeFileSync("index.html", html);

fs.writeFileSync(
  "output/storyboard.html",
  `<!DOCTYPE html>
  <html lang="id">
  <head><meta charset="UTF-8"><title>MYSTERY VERSE Storyboard</title></head>
  <body>${scenesHTML}</body>
  </html>`
);

fs.writeFileSync(
  "output/video-manifest.json",
  JSON.stringify({
    channel: story.channel,
    format: story.format,
    scene_count: story.scenes.length,
    voice: "id-ID-ArdiNeural",
    scenes: story.scenes
  }, null, 2)
);

console.log("Storyboard dan komposisi video berhasil dibuat!");
