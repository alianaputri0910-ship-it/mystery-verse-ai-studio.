import fs from "node:fs";
import path from "node:path";

const API = "https://aihorde.net/api/v2";
const API_KEY = "0000000000";
const OUTPUT = "output/images";
const MAX_WAIT_MS = 9 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

const storyPath = "output/story.json";

if (!fs.existsSync(storyPath)) {
  throw new Error("output/story.json tidak ditemukan. Jalankan npm run story terlebih dahulu.");
}

const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));

if (!Array.isArray(story.scenes) || story.scenes.length !== 6) {
  throw new Error("MYSTERY VERSE membutuhkan tepat 6 adegan.");
}

fs.mkdirSync(OUTPUT, { recursive: true });

const headers = {
  apikey: API_KEY,
  "Content-Type": "application/json",
  "Client-Agent": "MYSTERY-VERSE:1.0:github.com/alianaputri0910-ship-it/mystery-verse-ai-studio"
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(60000)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `AI Horde HTTP ${response.status}: ${JSON.stringify(body)}`
    );
  }

  return body;
}

function makePrompt(scene) {
  return [
    "Photorealistic cinematic Indonesian supernatural horror film still.",
    "Vertical portrait composition, 2:3 aspect ratio.",
    "Extremely realistic photography, natural human anatomy, detailed environment.",
    "Dark atmospheric lighting, deep shadows, subtle film grain.",
    "Professional horror movie cinematography, unsettling suspense.",
    "No text, no subtitles, no logo, no watermark.",
    `Story topic: ${story.topic}.`,
    `Scene: ${scene.beat}.`,
    `Visual direction: ${scene.visual_prompt || ""}.`,
    `Scene context: ${scene.narration}.`,
    "Create a visually coherent and believable horror scene."
  ].join(" ");
}

async function submitScene(scene) {
  const prompt = makePrompt(scene);

  console.log(`Mengirim permintaan gambar adegan ${scene.scene}...`);

  const result = await request(`${API}/generate/async`, {
    method: "POST",
    body: JSON.stringify({
      prompt: `${prompt} ### text, watermark, logo, blurry, low quality, cartoon, illustration, distorted anatomy`,
      params: {
        width: 512,
        height: 768,
        steps: 25,
        n: 1,
        cfg_scale: 7
      },
      nsfw: false,
      censor_nsfw: true,
      r2: true,
      shared: true,
      allow_downgrade: true
    })
  });

  if (!result.id) {
    throw new Error(`Tidak mendapat ID untuk adegan ${scene.scene}.`);
  }

  console.log(`Adegan ${scene.scene} masuk antrean: ${result.id}`);

  return {
    scene,
    id: result.id,
    done: false
  };
}

async function downloadImage(imageData, filename) {
  let buffer;

  if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
    const response = await fetch(imageData, {
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`Gagal mengunduh gambar: HTTP ${response.status}`);
    }

    buffer = Buffer.from(await response.arrayBuffer());
  } else if (imageData.startsWith("data:")) {
    const encoded = imageData.split(",")[1];
    buffer = Buffer.from(encoded, "base64");
  } else {
    buffer = Buffer.from(imageData, "base64");
  }

  if (buffer.length < 10000) {
    throw new Error(`File gambar terlalu kecil: ${filename}`);
  }

  fs.writeFileSync(filename, buffer);
}

async function main() {
  console.log("MYSTERY VERSE - AI IMAGE GENERATOR");
  console.log("Menggunakan AI Horde anonim tanpa API berbayar.");

  const jobs = await Promise.all(
    story.scenes.map(submitScene)
  );

  const started = Date.now();

  while (jobs.some(job => !job.done)) {
    if (Date.now() - started > MAX_WAIT_MS) {
      throw new Error(
        "Antrean AI Horde terlalu lama. Jalankan workflow kembali nanti."
      );
    }

    for (const job of jobs) {
      if (job.done) continue;

      const status = await request(
        `${API}/generate/check/${job.id}`
      );

      if (status.faulted) {
        throw new Error(
          `AI Horde gagal memproses adegan ${job.scene.scene}.`
        );
      }

      if (status.done) {
        job.done = true;
        console.log(`Adegan ${job.scene.scene} selesai diproses.`);
      }
    }

    if (jobs.some(job => !job.done)) {
      await new Promise(resolve =>
        setTimeout(resolve, POLL_INTERVAL_MS)
      );
    }
  }

  for (const job of jobs) {
    const result = await request(
      `${API}/generate/status/${job.id}`
    );

    if (!result.generations || result.generations.length === 0) {
      throw new Error(
        `Tidak ada hasil gambar untuk adegan ${job.scene.scene}.`
      );
    }

    const image = result.generations.find(item => !item.censored);

    if (!image?.img) {
      throw new Error(
        `Gambar adegan ${job.scene.scene} kosong atau terkena sensor.`
      );
    }

    const number = String(job.scene.scene).padStart(2, "0");
    const filename = path.join(
      OUTPUT,
      `scene-${number}.webp`
    );

    await downloadImage(image.img, filename);

    console.log(`Gambar tersimpan: ${filename}`);
  }

  console.log("ENAM GAMBAR MYSTERY VERSE BERHASIL DIBUAT!");
}

main().catch(error => {
  console.error("IMAGE GENERATOR ERROR:", error);
  process.exit(1);
});
