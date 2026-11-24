import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const storyPath = "output/story.json";
const outputDir = "output/images";
const referenceDir = "output/character-references";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const model = "@cf/black-forest-labs/flux-2-klein-4b";
if (!fs.existsSync(storyPath)) throw new Error("output/story.json tidak ditemukan.");
if (!accountId || !apiToken) throw new Error("CLOUDFLARE_CREDENTIALS_MISSING: Tambahkan secrets CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN pada GitHub Actions.");
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
if (!Array.isArray(story.scenes) || story.scenes.length !== 8) throw new Error("Proyek ini membutuhkan 8 adegan cerita.");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(referenceDir, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const cast = {
  Arya: "Photorealistic live-action casting reference portrait, one 27-year-old Indonesian man, medium tan skin, oval masculine face, short slightly messy black hair, dark brown eyes, clean-shaven, lean-average build, wearing a dark charcoal jacket over a plain black shirt. Neutral serious expression, head-to-mid-thigh framing, plain muted grey studio background, soft neutral cinematic key light, realistic skin texture, no props, no text, vertical portrait.",
  Nita: "Photorealistic live-action casting reference portrait, one young adult Indonesian woman, visibly pregnant with a natural late-second-trimester belly, long straight black hair, gentle oval face, wearing a dusty-rose blouse and dark cardigan. Neutral calm expression, head-to-mid-thigh framing so pregnancy and clothing are clear, plain muted grey studio background, soft neutral cinematic key light, realistic skin texture, no props, no text, vertical portrait.",
  KangBasir: "Photorealistic live-action casting reference portrait, one 48-year-old sturdy Indonesian man, medium-brown skin, weathered friendly face, short black hair with slight grey at temples, average sturdy build, wearing a practical dark motorcycle jacket and dark trousers. Warm but reserved expression, head-to-mid-thigh framing, plain muted grey studio background, soft neutral cinematic key light, realistic skin texture, no props, no text, vertical portrait.",
  MysteriousLongHairedMan: "Photorealistic live-action casting reference portrait, one tall broad-shouldered Indonesian man in his mid-30s, medium-brown skin, long straight black hair, imposing build, angular face, wearing plain dark clothing. Cold unsettling expression, head-to-mid-thigh framing, plain muted grey studio background, soft neutral cinematic key light, realistic skin texture, no props, no text, vertical portrait.",
  ElderlyWoman: "Photorealistic live-action casting reference portrait, one 75-year-old Indonesian woman, deeply lined aged face, slight stoop, thin elderly build, wearing the same faded moss-green long dress. Face and outfit clearly visible, plain muted grey studio background, soft neutral cinematic key light, realistic skin texture, no props, no text, vertical portrait."
};
const sceneCast = [
  ["Arya","Nita"],
  ["Arya","KangBasir"],
  ["Arya","Nita","MysteriousLongHairedMan"],
  ["Arya","KangBasir"],
  ["Arya","Nita","KangBasir","MysteriousLongHairedMan"],
  ["ElderlyWoman"],
  ["ElderlyWoman"],
  ["Arya","KangBasir"]
];
const endpoint = "https://api.cloudflare.com/client/v4/accounts/" + accountId + "/ai/run/" + model;
function runFfmpeg(args, label) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(label + ": " + (result.stderr || "FFmpeg gagal."));
}
async function requestImage(prompt, index, filename, references = []) {
  if (references.length > 4) throw new Error("FLUX.2 Klein 4B hanya menerima maksimal 4 gambar referensi.");
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", "1024");
  form.append("height", "1792");
  form.append("seed", String(4100 + index));
  form.append("guidance", "4");
  for (let i = 0; i < references.length; i++) {
    const bytes = fs.readFileSync(references[i]);
    form.append("input_image_" + i, new Blob([bytes], { type: "image/jpeg" }), "reference-" + i + ".jpg");
  }
  const output = path.join(filename.startsWith("character-") ? referenceDir : outputDir, filename);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log("Generating " + filename + " with Cloudflare " + model + " (" + attempt + "/3)");
      const res = await fetch(endpoint, { method: "POST", headers: { Authorization: "Bearer " + apiToken }, body: form, signal: AbortSignal.timeout(240000) });
      const raw = await res.text();
      if (!res.ok) throw new Error("HTTP " + res.status + ": " + raw.slice(0, 700));
      const payload = JSON.parse(raw);
      const encoded = payload && payload.result && payload.result.image;
      if (!encoded) throw new Error("Cloudflare tidak mengembalikan result.image: " + raw.slice(0, 500));
      const bytes = Buffer.from(encoded, "base64");
      if (bytes.length < 12000) throw new Error("Gambar terlalu kecil atau respons tidak valid.");
      const temp = output + ".source";
      fs.writeFileSync(temp, bytes);
      runFfmpeg(["-y","-hide_banner","-loglevel","error","-i",temp,"-vf","scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=0.02:contrast=1.04:saturation=0.96,unsharp=5:5:0.25:3:3:0.0","-frames:v","1","-quality","92",output], "Konversi visual");
      fs.rmSync(temp, { force: true });
      if (filename.startsWith("character-")) {
        const refPath = path.join(referenceDir, filename.replace(/\.webp$/i, "-ref.jpg"));
        runFfmpeg(["-y","-hide_banner","-loglevel","error","-i",output,"-vf","scale=448:448:force_original_aspect_ratio=increase,crop=448:448","-frames:v","1","-q:v","3",refPath], "Pembuatan thumbnail referensi");
      }
      return output;
    } catch (error) {
      lastError = error;
      console.error(filename + " gagal: " + error.message);
      if (attempt < 3 && !/HTTP 4(00|01|03|29)/.test(error.message)) await sleep(attempt * 10000);
      else if (/HTTP 4(00|01|03|29)/.test(error.message)) break;
    }
  }
  throw new Error("Gagal menghasilkan " + filename + ": " + (lastError ? lastError.message : "unknown error"));
}

const refs = {};
let idx = 0;
for (const [name, prompt] of Object.entries(cast)) {
  const fullPath = await requestImage(prompt, idx++, "character-" + name.toLowerCase() + ".webp");
  refs[name] = fullPath.replace(/\.webp$/i, "-ref.jpg");
  console.log("Reference locked for " + name);
  await sleep(1500);
}
for (let i = 0; i < story.scenes.length; i++) {
  const selected = sceneCast[i].map(name => refs[name]);
  const prompt = story.scenes[i].visual_prompt + " Premium live-action Indonesian horror feature film still, precise cinematic blocking, coherent practical lighting, natural human anatomy, physically correct perspective, authentic fabric and skin texture, vertical 9:16. Match the supplied character reference images exactly for every named character. No text, no watermark.";
  await requestImage(prompt, 100 + i, "scene-" + String(i + 1).padStart(2, "0") + ".webp", selected);
  console.log("Adegan " + (i + 1) + "/8 selesai; referensi: " + sceneCast[i].join(", "));
  await sleep(1500);
}
console.log("Selesai: 5 portrait karakter + 8 visual adegan dengan Cloudflare FLUX.2 Klein 4B. Visual QA wajib dilakukan sebelum publikasi.");
