import fs from "node:fs";
import path from "node:path";
const slug=(process.argv[2]||process.env.EPISODE_SLUG||"").trim();
if(!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("Slug episode tidak valid.");
const file=path.join("episodes",slug,"longform.json");
for(const p of ["config/brand.json","config/visual-style.json","config/voice-profiles.json","scripts/generate-longform-images.js","scripts/render-longform.py",file]){
 if(!fs.existsSync(p)) throw new Error("File wajib tidak ditemukan: "+p);
}
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const brand=JSON.parse(fs.readFileSync("config/brand.json","utf8"));
const style=JSON.parse(fs.readFileSync("config/visual-style.json","utf8"));
if(data.slug!==slug) throw new Error("Slug episode tidak cocok.");
if(brand.channel_name!=="MYSTERY VERSE") throw new Error("Brand channel tidak cocok.");
if(style.style_lock!==true) throw new Error("Visual style lock harus aktif.");
if(!Array.isArray(data.chapters)||data.chapters.length<6) throw new Error("Minimal enam bab.");
for(const [i,c] of data.chapters.entries()){
 if(!c.title?.trim()||!c.narration?.trim()) throw new Error("Bab "+(i+1)+" tidak lengkap.");
}
const words=data.chapters.map(c=>c.narration.trim().split(/\s+/).length).reduce((a,b)=>a+b,0);
if(words<650) throw new Error("Naskah terlalu pendek: "+words+" kata.");
console.log(JSON.stringify({ok:true,channel:brand.channel_name,episode:slug,chapters:data.chapters.length,words,visual_style:style.style_name},null,2));
