import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const slug = (process.argv[2] || process.env.EPISODE_SLUG || "").trim();
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("EPISODE_SLUG_INVALID");
const input = path.join("episodes", slug, "longform.json");
const outputDir = path.join("output", "longform", "images");
const apiKey = process.env.POLLINATIONS_API_KEY;
if (!fs.existsSync(input)) throw new Error("LONGFORM_EPISODE_NOT_FOUND: " + input);
if (!apiKey) throw new Error("POLLINATIONS_API_KEY_MISSING");
const episode = JSON.parse(fs.readFileSync(input, "utf8"));
if (episode.slug !== slug || !Array.isArray(episode.chapters) || episode.chapters.length < 6) throw new Error("LONGFORM_SCHEMA_INVALID");
const brand = JSON.parse(fs.readFileSync("config/visual-style.json", "utf8"));
const style = [brand.style_name, brand.visual_prompt, "cinematic photorealism, realistic dramatic lighting, high environmental detail, no text, no watermark, horizontal widescreen 16:9"].filter(Boolean).join(", ");
const topic = episode.topic || episode.title || slug.replaceAll("-", " ");
const model = process.env.POLLINATIONS_IMAGE_MODEL || "black-forest-labs/flux.1-schnell";
fs.mkdirSync(outputDir, {recursive:true});
const items = [
  {name:"opening", prompt:episode.opening_visual_prompt || "Wide cinematic establishing view introducing "+topic+", documentary atmosphere, 16:9."},
  ...episode.chapters.map((chapter,i)=>({
    name:"chapter-"+String(i+1).padStart(2,"0"),
    prompt:chapter.visual_prompt || "Cinematic documentary reconstruction illustrating chapter '"+chapter.title+"' from the story '"+topic+"'. Respectful, plausible setting and visual details, no sensational gore, 16:9."
  })),
  {name:"thumbnail",prompt:episode.thumbnail_visual_prompt || "Premium YouTube documentary thumbnail about "+topic+". Strong central subject, cinematic mystery atmosphere, dramatic light, clear negative space for title added separately, 16:9, no letters."}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<items.length;i++){
 const item=items[i],dest=path.join(outputDir,item.name+".jpg"),prompt=item.prompt+" "+style;
 const url="https://gen.pollinations.ai/image/"+encodeURIComponent(prompt)+"?model="+encodeURIComponent(model)+"&width=1920&height=1080&seed="+(7200+i);
 let last;
 for(let attempt=1;attempt<=4;attempt++){
  try{
   const response=await fetch(url,{headers:{Authorization:"Bearer "+apiKey,Accept:"image/*"},signal:AbortSignal.timeout(180000)});
   if(!response.ok)throw new Error("HTTP "+response.status+" "+(await response.text()).slice(0,300));
   if(!(response.headers.get("content-type")||"").startsWith("image/"))throw new Error("Response bukan gambar.");
   const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<10000)throw new Error("Gambar terlalu kecil.");
   const tmp=dest+".source";fs.writeFileSync(tmp,bytes);
   const ff=spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-i",tmp,"-vf","scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080","-frames:v","1",dest],{encoding:"utf8"});
   fs.rmSync(tmp,{force:true});if(ff.status!==0)throw new Error(ff.stderr||"Konversi gambar gagal.");
   console.log("Visual siap: "+item.name);last=null;break;
  }catch(e){last=e;console.error(item.name+" percobaan "+attempt+": "+e.message);if(attempt<4)await sleep(7000*attempt);}
 }
 if(last)throw new Error("Gagal membuat "+item.name+": "+last.message);
}
console.log("Semua visual long-form episode "+slug+" selesai dibuat.");
