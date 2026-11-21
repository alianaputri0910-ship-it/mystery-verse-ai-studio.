import fs from "node:fs";
import path from "node:path";

const storyPath = process.argv[2] || "output/story.json";
const endpoint = process.env.ARBOTTS_TTS_ENDPOINT;
const apiKey = process.env.ARBOTTS_API_KEY;

if (!fs.existsSync(storyPath)) {
  console.error("File cerita tidak ditemukan:", storyPath);
  process.exit(1);
}

if (!endpoint) {
  console.error(
    "ARBO TTS belum terhubung. Endpoint API belum diatur."
  );
  process.exit(1);
}

const story = JSON.parse(
  fs.readFileSync(storyPath, "utf8")
);

const voice = JSON.parse(
  fs.readFileSync("config/voice.json", "utf8")
);

const narration = story.scenes
  .map(scene => scene.narration)
  .join("\n\n");

const headers = {
  "Content-Type": "application/json"
};

if (apiKey) {
  headers.Authorization = `Bearer ${apiKey}`;
}

const response = await fetch(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({
    text: narration,
    voice: voice.voice_id,
    language: voice.language,
    format: voice.output.format
  })
});

if (!response.ok) {
  throw new Error(
    `ArboTTS error: ${response.status}`
  );
}

const outputDir = "output";
fs.mkdirSync(outputDir, { recursive: true });

const audio = Buffer.from(
  await response.arrayBuffer()
);

fs.writeFileSync(
  path.join(outputDir, "narration.wav"),
  audio
);

console.log("Audio narasi berhasil disimpan!");
