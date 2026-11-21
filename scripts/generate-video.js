import fs from "node:fs";
import path from "node:path";

const API_ROOT = "https://apihub.agnes-ai.com";
const MODEL = "agnes-video-2.5-flash";
const API_KEY = process.env.AGNES_API_KEY;

const STORY_PATH = "output/story.json";
const OUTPUT_DIR = "output/video";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      `Agnes API HTTP ${response.status}: ${
        data.message || JSON.stringify(data)
      }`
    );
  }

  return data;
}

async function main() {
  if (!API_KEY) {
    throw new Error("AGNES_API_KEY belum tersedia di GitHub Secrets.");
  }

  if (!fs.existsSync(STORY_PATH)) {
    throw new Error("File output/story.json tidak ditemukan.");
  }

  const story = JSON.parse(
    fs.readFileSync(STORY_PATH, "utf8")
  );

  if (!Array.isArray(story.scenes) || !story.scenes.length) {
    throw new Error("Daftar adegan tidak ditemukan dalam story.json.");
  }

  // UJI COBA: hanya membuat adegan pertama.
  const scene = story.scenes[0];

  const prompt = [
    scene.visual_prompt || "",
    "Ultra-realistic cinematic horror documentary footage.",
    "Dark mysterious atmosphere, realistic human movement,",
    "natural environmental details, subtle handheld camera movement,",
    "dramatic low-key lighting, believable physical environment.",
    "No subtitles, no text, no logos, no watermark.",
    "Vertical horror short film, 9:16 composition."
  ].join(" ");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Mengirim adegan pertama ke Agnes AI...");

  const created = await request(`${API_ROOT}/v1/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      mode: "text",
      seconds: "10",
      size: "720P",
      aspect_ratio: "9:16",
      n: 1,
    }),
  });

  const videoId =
    created.video_id || created.id || created.task_id;

  if (!videoId) {
    throw new Error(
      `Agnes tidak mengembalikan video ID: ${JSON.stringify(created)}`
    );
  }

  console.log("Video ID:", videoId);
  console.log("Menunggu proses pembuatan video...");

  let result = null;

  for (let attempt = 1; attempt <= 90; attempt++) {
    await sleep(10000);

    const query = new URLSearchParams({
      video_id: videoId,
      model_name: MODEL,
    });

    result = await request(
      `${API_ROOT}/agnesapi?${query.toString()}`
    );

    const status = String(result.status || "").toLowerCase();

    console.log(`Pemeriksaan ${attempt}/90: ${status || "menunggu"}`);

    if (status === "completed") {
      break;
    }

    if (status === "failed" || status === "error") {
      throw new Error(
        `Pembuatan video gagal: ${JSON.stringify(result)}`
      );
    }

    result = null;
  }

  if (!result) {
    throw new Error("Waktu tunggu video habis. Coba jalankan ulang.");
  }

  const videoUrl = result.url;

  if (!videoUrl) {
    throw new Error(
      `URL video tidak ditemukan: ${JSON.stringify(result)}`
    );
  }

  console.log("Mengunduh video...");

  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(`Gagal mengunduh video: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length < 10000) {
    throw new Error("File video terlalu kecil atau tidak valid.");
  }

  const outputPath = path.join(
    OUTPUT_DIR,
    "scene-01.mp4"
  );

  fs.writeFileSync(outputPath, buffer);

  console.log("BERHASIL:", outputPath);
  console.log("Ukuran video:", buffer.length, "bytes");
}

main().catch((error) => {
  console.error("VIDEO GENERATION ERROR:", error.message);
  process.exit(1);
});
