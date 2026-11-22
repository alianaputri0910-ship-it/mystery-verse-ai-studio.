
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const storyPath = "output/story.json";
const outputDir = "output/audio";
const voice = "id-ID-ArdiNeural";

if (!fs.existsSync(storyPath)) {
  console.error("File cerita tidak ditemukan:", storyPath);
  process.exit(1);
}

const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));

if (!Array.isArray(story.scenes) || story.scenes.length === 0) {
  throw new Error("Cerita tidak memiliki adegan.");
}

fs.mkdirSync(outputDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8"
  });

  if (result.error) throw result.error;

  if (result.status !== 0) {
    throw new Error(
      result.stderr || `${command} gagal dijalankan`
    );
  }

  return result.stdout.trim();
}

for (const scene of story.scenes) {
  const filename =
    `scene-${String(scene.scene).padStart(2, "0")}.mp3`;

  const outputPath = path.join(outputDir, filename);
  const availableDuration = scene.end - scene.start;

  console.log(`Membuat suara adegan ${scene.scene}...`);

  run("edge-tts", [
    "--voice", voice,
    "--rate", "-15%",
    "--volume", "+0%",
    "--text", scene.narration,
    "--write-media", outputPath
  ]);

  if (!fs.existsSync(outputPath) ||
      fs.statSync(outputPath).size === 0) {
    throw new Error(`Audio gagal dibuat: ${filename}`);
  }

  const duration = Number(run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    outputPath
  ]));

  console.log(
    `Adegan ${scene.scene}: ${duration.toFixed(2)} detik`
  );

  if (duration > availableDuration - 0.15) {
    throw new Error(
      `Narasi adegan ${scene.scene} terlalu panjang ` +
      `(${duration.toFixed(2)} detik). ` +
      `Batas aman: ${(availableDuration - 0.15).toFixed(2)} detik. ` +
      `Pendekkan teks narasi adegan ini.`
    );
  }
}

console.log("Semua audio ArdiNeural berhasil dibuat!");
