
import fs from "node:fs";
import path from "node:path";

const storyPath = "output/story.json";

if (!fs.existsSync(storyPath)) {
  console.error("Cerita belum tersedia.");
  console.error("Buat cerita terlebih dahulu.");
  process.exit(1);
}

const story = JSON.parse(
  fs.readFileSync(storyPath, "utf8")
);

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

const scenesHTML = story.scenes.map(scene => `
  <section class="scene">
    <div class="scene-number">
      SCENE ${scene.scene} | ${scene.start}s - ${scene.end}s
    </div>

    <div class="visual">
      <p>VISUAL PROMPT</p>
      ${escapeHTML(scene.visual_prompt)}
    </div>

    <div class="caption">
      ${escapeHTML(scene.narration)}
    </div>

    <div class="sound">
      ${escapeHTML(scene.sound)}
    </div>
  </section>
`).join("\n");

const html = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width, initial-scale=1">
<title>MYSTERY VERSE - Storyboard</title>
<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  background: #080808;
  color: white;
  font-family: Arial, sans-serif;
}

header {
  padding: 25px;
  text-align: center;
  color: #d5b4b4;
  letter-spacing: 4px;
}

.scene {
  width: min(100%, 480px);
  min-height: 700px;
  margin: 25px auto;
  padding: 30px;
  background:
    radial-gradient(circle at center, #321313, #080808 75%);
  border: 1px solid #492020;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.scene-number {
  color: #e34b4b;
  letter-spacing: 2px;
}

.visual, .sound {
  color: #aaa;
  font-size: 14px;
  line-height: 1.7;
}

.caption {
  font-size: 25px;
  line-height: 1.5;
  font-weight: bold;
  text-shadow: 0 2px 8px black;
}

footer {
  text-align: center;
  padding: 25px;
  color: #777;
}
</style>
</head>
<body>
<header>
  <h1>MYSTERY VERSE</h1>
  <p>${escapeHTML(story.topic)}</p>
</header>

${scenesHTML}

<footer>
  HORROR STORYBOARD PRODUCTION
</footer>
</body>
</html>
`;

fs.mkdirSync("output", { recursive: true });

fs.writeFileSync(
  path.join("output", "storyboard.html"),
  html
);

fs.writeFileSync(
  path.join("output", "video-manifest.json"),
  JSON.stringify({
    channel: story.channel,
    format: story.format,
    scene_count: story.scenes.length,
    scenes: story.scenes
  }, null, 2)
);

console.log("Storyboard berhasil disiapkan!");
