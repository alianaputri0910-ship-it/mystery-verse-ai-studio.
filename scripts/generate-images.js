import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const storyPath = "output/story.json";
const outputDir = "output/images";

if (!fs.existsSync(storyPath)) {
  throw new Error("output/story.json tidak ditemukan. Jalankan npm run story terlebih dahulu.");
}

const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
if (!Array.isArray(story.scenes) || story.scenes.length !== 7) {
  throw new Error("MYSTERY VERSE Flannan Isles membutuhkan tepat 7 adegan.");
}

fs.mkdirSync(outputDir, { recursive: true });

// Prioritaskan visual buatan ChatGPT yang diunggah sebagai ZIP ke assets/ai-images.
const aiAssetsDir = "assets/ai-images";
const aiZip = fs.existsSync(aiAssetsDir)
  ? fs.readdirSync(aiAssetsDir).find(name => name.toLowerCase().endsWith(".zip"))
  : null;

if (aiZip) {
  const extractDir = path.join(aiAssetsDir, "_extracted");
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  const unzip = spawnSync("unzip", ["-o", path.join(aiAssetsDir, aiZip), "-d", extractDir], { encoding: "utf8" });
  if (unzip.status !== 0) throw new Error("Gagal mengekstrak ZIP gambar: " + (unzip.stderr || ""));
  const listing = spawnSync("find", [extractDir, "-type", "f"], { encoding: "utf8" });
  if (listing.status !== 0) throw new Error("Tidak dapat membaca isi ZIP: " + (listing.stderr || ""));
  const ordered = listing.stdout.split(/\r?\n/)
    .filter(file => file && /\.(jpe?g|png|webp)$/i.test(file))
    .sort();
  if (ordered.length < 6) throw new Error("ZIP gambar harus berisi minimal 7 gambar. Ditemukan: " + ordered.length);
  for (let i = 0; i < 7; i++) {
    const outputPath = path.join(outputDir, `scene-${String(i + 1).padStart(2, "0")}.webp`);
    toWebp(ordered[i], outputPath);
    console.log("Memakai visual ChatGPT untuk adegan " + String(i + 1).padStart(2, "0"));
  }
  console.log("Tujuh visual berhasil disiapkan dari ZIP.");
  process.exit(0);
}


// Foto dicari per adegan dari Wikimedia Commons. Ini bukan gambar AI,
// tetapi sumber publik yang tidak memerlukan API key atau kredit.
const sceneSearches = [
  ["Flannan Isles lighthouse Scotland", "Flannan Isles lighthouse"],
  ["Scottish lighthouse keepers 1900", "lighthouse keeper Scotland historical"],
  ["Hesperus ship lighthouse Flannan Isles", "historic lighthouse supply ship Scotland"],
  ["Flannan Isles lighthouse interior", "historic lighthouse interior Scotland"],
  ["Flannan Isles lighthouse landing rocks", "Flannan Isles rocks landing"],
  ["North Atlantic storm giant wave rocky coast Scotland", "storm waves rocky Scottish coast"],
  ["Flannan Isles lighthouse night fog", "Flannan Isles lighthouse fog"]
];

function toWebp(inputPath, outputPath) {
  const result = spawnSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", inputPath,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=0.08:contrast=1.06:saturation=0.96,unsharp=5:5:0.35:3:3:0.0",
    "-frames:v", "1", "-quality", "88", outputPath
  ], { encoding: "utf8" });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Konversi gambar ke WebP gagal.");
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
    throw new Error("File WebP hasil konversi kosong atau rusak.");
  }
}

function fieldValue(metadata, key) {
  const value = metadata?.[key]?.value;
  return typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim() : "";
}

function acceptableLicense(name) {
  return /public domain|cc0|cc by(?:-sa)?(?:\s|$)/i.test(name || "");
}

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: "1400",
    origin: "*"
  });
  const response = await fetch(COMMONS_API + "?" + params.toString(), {
    headers: { "User-Agent": "MysteryVerseVideoBuilder/1.0 (automated video production)" },
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error("Wikimedia Commons HTTP " + response.status);
  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  return pages.map(page => {
    const info = page.imageinfo?.[0] || {};
    const metadata = info.extmetadata || {};
    return {
      title: page.title,
      imageUrl: info.thumburl || info.url,
      pageUrl: info.descriptionurl || ("https://commons.wikimedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_"))),
      width: info.width || 0,
      height: info.height || 0,
      license: fieldValue(metadata, "LicenseShortName"),
      artist: fieldValue(metadata, "Artist"),
      credit: fieldValue(metadata, "Credit"),
      usageTerms: fieldValue(metadata, "UsageTerms")
    };
  }).filter(item =>
    item.imageUrl &&
    item.width >= 500 &&
    item.height >= 500 &&
    acceptableLicense(item.license)
  );
}

async function generate(scene, index) {
  const number = String(scene.scene).padStart(2, "0");
  const outputPath = path.join(outputDir, `scene-${number}.webp`);
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
    console.log("Gambar adegan " + number + " sudah ada, dilewati.");
    return;
  }

  const searches = sceneSearches[index] || ["abandoned house night", "dark mysterious house"];
  let selected;
  let lastError;

  for (const query of searches) {
    try {
      console.log("Mencari visual adegan " + number + " di Wikimedia Commons: " + query);
      const results = await searchCommons(query);
      if (results.length) {
        selected = results[0];
        break;
      }
    } catch (error) {
      lastError = error;
      console.warn("Pencarian Commons gagal: " + error.message);
    }
  }

  if (!selected) {
    throw new Error(
      "Tidak menemukan foto Commons dengan lisensi bebas yang sesuai untuk adegan " +
      number + ". " + (lastError?.message || "")
    );
  }

  const response = await fetch(selected.imageUrl, {
    headers: { "User-Agent": "MysteryVerseVideoBuilder/1.0" },
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error("Gagal mengunduh foto Commons: HTTP " + response.status);

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) throw new Error("File foto Commons kosong atau terlalu kecil.");

  const rawPath = path.join(outputDir, `scene-${number}-source`);
  try {
    fs.writeFileSync(rawPath, buffer);
    toWebp(rawPath, outputPath);
  } finally {
    fs.rmSync(rawPath, { force: true });
  }

  const creditsPath = path.join(outputDir, "credits.json");
  let credits = [];
  if (fs.existsSync(creditsPath)) {
    try { credits = JSON.parse(fs.readFileSync(creditsPath, "utf8")); } catch {}
  }
  credits = credits.filter(item => item.scene !== Number(number));
  credits.push({
    scene: Number(number),
    file: path.basename(outputPath),
    title: selected.title,
    creator: selected.artist || selected.credit || "Tidak dicantumkan",
    license: selected.license,
    usageTerms: selected.usageTerms,
    source: selected.pageUrl
  });
  credits.sort((a, b) => a.scene - b.scene);
  fs.writeFileSync(creditsPath, JSON.stringify(credits, null, 2));

  console.log("Visual adegan " + number + " berhasil diunduh dan dikonversi: " + outputPath);
  console.log("Sumber: " + selected.pageUrl + " | Lisensi: " + selected.license);
}

for (let index = 0; index < story.scenes.length; index++) {
  await generate(story.scenes[index], index);
}

console.log("Semua 7 visual Flannan Isles siap digunakan (foto Wikimedia Commons, bukan AI).");
