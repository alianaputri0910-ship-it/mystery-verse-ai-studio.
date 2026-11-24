import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const storyPath = "output/story.json";
const outputDir = "output/images";
const referenceDir = "output/character-references";
const apiKey = process.env.POLLINATIONS_API_KEY;
const model = process.env.POLLINATIONS_IMAGE_MODEL || "black-forest-labs/flux.1-kontext-pro";
if (!fs.existsSync(storyPath)) throw new Error("output/story.json tidak ditemukan.");
if (!apiKey) throw new Error("POLLINATIONS_API_KEY_MISSING: Tambahkan secret POLLINATIONS_API_KEY pada GitHub Actions.");
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
  ElderlyWoman: "Photorealistic live-action casting reference portrait, one 75-year-old Indonesian woman, deeply lined aged face, slight stoop, thin elderly build, wearing the same faded moss-green long dress, holding a tiny yellow flashlight. Face and outfit clearly visible, plain muted grey studio background, soft neutral cinematic key light, realistic skin texture, no props except the flashlight, no text, vertical portrait."
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

function mediaUrl(res) {
  const link = res.headers.get("link") || "";
  const match = link.match(/<([^>]+)>\s*;\s*rel="?enclosure"?/i);
  if (match) return match[1];
  const location = res.headers.get("location");
  if (location && location.startsWith("https://")) return location;
  throw new Error("API tidak mengembalikan URL referensi media; hentikan agar identitas tidak dibuat tanpa reference lock.");
}
async function requestImage(prompt, index, filename, references = []) {
  const params = new URLSearchParams({
    model, width: "1024", height: "1792", seed: String(4100 + index),
    nologo: "true", private: "true", quality: "high",
    negative_prompt: "cartoon, illustration, anime, CGI, plastic skin, deformed face, asymmetrical eyes, malformed hands, extra fingers, extra limbs, duplicated people, fused bodies, floating objects, incorrect motorcycle geometry, wrong rider position, random text, watermark, logo"
  });
  if (references.length) params.set("image", references.join("|"));
  const url = "https://gen.pollinations.ai/image/" + encodeURIComponent(prompt) + "?" + params.toString();
  const output = path.join(filename.startsWith("character-") ? referenceDir : outputDir, filename);
  let lastError;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      console.log("Generating " + filename + " with " + model + " (" + attempt + "/3)");
      const res = await fetch(url, { headers:{Authorization:"Bearer "+apiKey,Accept:"image/*"}, signal:AbortSignal.timeout(240000) });
      if (!res.ok) throw new Error("HTTP "+res.status+": "+(await res.text()).slice(0,300));
      if (!(res.headers.get("content-type")||"").startsWith("image/")) throw new Error("Respons bukan gambar.");
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < 12000) throw new Error("Gambar terlalu kecil.");
      const refUrl = mediaUrl(res);
      const temp = output + ".source";
      fs.writeFileSync(temp,bytes);
      const ff = spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-i",temp,"-vf","scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=0.02:contrast=1.04:saturation=0.96,unsharp=5:5:0.25:3:3:0.0","-frames:v","1","-quality","92",output],{encoding:"utf8"});
      fs.rmSync(temp,{force:true});
      if(ff.status!==0) throw new Error(ff.stderr||"Konversi WebP gagal.");
      return refUrl;
    } catch(e) {
      lastError=e;
      console.error(filename+" gagal: "+e.message);
      if(attempt<3) await sleep(attempt*10000);
    }
  }
  throw new Error("Gagal menghasilkan "+filename+": "+lastError?.message);
}

// Create canonical casting portraits first. Every scene then receives only the relevant character references.
const refs = {};
let idx=0;
for (const [name,prompt] of Object.entries(cast)) {
  refs[name] = await requestImage(prompt,idx++,"character-"+name.toLowerCase()+".webp");
  console.log("Reference locked for "+name);
  await sleep(2500);
}
for (let i=0;i<story.scenes.length;i++) {
  const selected = sceneCast[i].map(name=>refs[name]);
  const prompt = story.scenes[i].visual_prompt +
    " Premium live-action Indonesian horror feature film still, precise cinematic blocking, coherent practical lighting, natural human anatomy, physically correct perspective, authentic fabric and skin texture, vertical 9:16. Match the supplied character reference images exactly for every named character. No text, no watermark.";
  await requestImage(prompt,100+i,"scene-"+String(i+1).padStart(2,"0")+".webp",selected);
  console.log("Adegan "+(i+1)+"/8 selesai; referensi: "+sceneCast[i].join(", "));
  await sleep(2500);
}
console.log("Selesai: 5 portrait referensi karakter + 8 visual adegan dengan reference-image conditioning.");
