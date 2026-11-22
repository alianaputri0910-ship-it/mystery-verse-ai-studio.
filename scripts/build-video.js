
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
  const imagePath = `./output/images/scene-${number}.webp`;
  const audioPath = `./output/audio/scene-${number}.mp3`;

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Gambar adegan ${number} belum tersedia.`);
  }

  if (!fs.existsSync(`output/audio/scene-${number}.mp3`)) {
    throw new Error(`Audio adegan ${number} belum tersedia.`);
  }

  return `
    <img
      class="clip visual"
      id="visual-${number}"
      src="${imagePath}"
      data-start="${scene.start}"
      data-duration="${scene.end - scene.start}"
      data-track-index="0"
      alt="MYSTERY VERSE scene ${number}"
    />

    <section
      class="scene clip"
      id="scene-${number}"
      data-start="${scene.start}"
      data-duration="${scene.end - scene.start}"
      data-track-index="1"
    >
      <div class="shade"></div>

      <div class="brand">MYSTERY VERSE</div>
<div class="caption" id="caption-${number}">
        ${escapeHTML(scene.narration)}
      </div>

      <div class="footer">60 SECONDS OF MYSTERY</div>
    </section>

    <audio
      id="voice-${number}"
      src="${audioPath}"
      data-start="${scene.start}"
      data-duration="${scene.end - scene.start}"
      data-track-index="2"
    ></audio>
  `;
}).join("\n");

const animationScript = story.scenes.map(scene => {
  const number = String(scene.scene).padStart(2, "0");
  const direction = scene.scene % 2 === 0 ? -1 : 1;

  return `
    timeline.fromTo(
      "#visual-${number}",
      {
        scale: 1.04,
        x: ${direction * 8},
        y: 0
      },
      {
        scale: 1.18,
        x: ${direction * -8},
        y: -12,
        duration: ${scene.end - scene.start},
        ease: "none"
      },
      ${scene.start}
    );

    timeline.fromTo(
      "#caption-${number}",
      {
        opacity: 0,
        y: 35
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out"
      },
      ${scene.start + 0.3}
    );
  `;
}).join("\n");

const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MYSTERY VERSE</title>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #050505;
  color: white;
  font-family: Arial, sans-serif;
}

#root {
  position: relative;
  width: 1080px;
  height: 1920px;
  overflow: hidden;
  background: #050505;
}

.visual {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transform-origin: center center;
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

.shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,0.18),
    rgba(0,0,0,0.02) 32%,
    rgba(0,0,0,0.12) 62%,
    rgba(0,0,0,0.58)
  );
}

.brand, .number, .caption, .footer {
  position: relative;
  z-index: 2;
}

.brand {
  position: absolute;
  top: 92px;
  left: 0;
  right: 0;
  color: rgba(245, 232, 232, 0.82);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 9px;
  text-shadow: 0 3px 16px rgba(0,0,0,0.95);
}

.caption {
  position: absolute;
  left: 76px;
  right: 76px;
  bottom: 190px;
  max-width: 928px;
  padding: 24px 30px;
  border-radius: 18px;
  background: rgba(0,0,0,0.76);
  border: 1px solid rgba(194, 145, 35, 0.38);
  color: #D6A52B;
  font-size: 50px;
  line-height: 1.3;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0,0,0,0.95);
}

.footer {
  position: absolute;
  bottom: 88px;
  color: rgba(238,238,238,0.78);
  font-size: 20px;
  letter-spacing: 6px;
  text-shadow: 0 3px 14px rgba(0,0,0,0.95);
}
</style>
</head>

<body>

<div id="root"
  data-composition-id="mystery-verse"
  data-start="0"
  data-duration="${story.format.duration_seconds}"
  data-width="1080"
  data-height="1920">

  ${scenesHTML}

</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>

<script>
window.__timelines = window.__timelines || {};

const timeline = gsap.timeline({ paused: true });

${animationScript}

window.__timelines["mystery-verse"] = timeline;
</script>

</body>
</html>`;

fs.mkdirSync("output", { recursive: true });

fs.writeFileSync("index.html", html);

fs.writeFileSync(
  "output/video-manifest.json",
  JSON.stringify({
    channel: story.channel,
    format: story.format,
    scene_count: story.scenes.length,
    voice: "id-ID-ArdiNeural",
    visual_engine: "AI Horde",
    animation_engine: "HyperFrames + GSAP",
    scenes: story.scenes
  }, null, 2)
);

console.log("MYSTERY VERSE visual composition berhasil dibuat!");
