import fs from "node:fs";
import path from "node:path";

const input = "episodes/trunyan/longform.json";
const outputDir = "output/longform/images";
const apiKey = process.env.POLLINATIONS_API_KEY;
if (!fs.existsSync(input)) throw new Error("LONGFORM_EPISODE_NOT_FOUND: " + input);
if (!apiKey) throw new Error("POLLINATIONS_API_KEY_MISSING: Tambahkan secret pada GitHub Actions.");
const episode = JSON.parse(fs.readFileSync(input, "utf8"));
if (!Array.isArray(episode.chapters) || episode.chapters.length < 6) throw new Error("LONGFORM_SCHEMA_INVALID: Minimal enam bab diperlukan.");
fs.mkdirSync(outputDir, {recursive:true});
const model = process.env.POLLINATIONS_IMAGE_MODEL || "black-forest-labs/flux.1-schnell";
const prompts = [
  "Wide cinematic documentary establishing shot of Lake Batur and Trunyan village in Kintamani Bali at blue hour, mist over water, volcanic ridges, respectful premium documentary photography, 16:9, no text.",
  ...episode.chapters.map((chapter, i) => {
    const topics = [
      "Aerial wide view of Trunyan village on the eastern shore of Lake Batur, Kintamani, Bali, mountain landscape, misty morning, 16:9 documentary photo.",
      "Bali Aga traditional village atmosphere in Trunyan, traditional architecture and lakeside path, no staged stereotypes, wide documentary photo.",
      "Respectful non-graphic cultural reconstruction of a traditional Trunyan cemetery clearing, bamboo ancak saji protective structures beneath a large tree, no human remains, wide 16:9.",
      "Wide landscape illustration showing three separate paths through a forested cemetery environment, symbolic representation of three cemetery areas, no bodies, 16:9.",
      "Majestic old Taru Menyan tree in a sacred Trunyan cemetery, broad roots, dense canopy, shafts of natural light, no supernatural effects, 16:9.",
      "Artistic folklore reconstruction of an ancient traveler near a fragrant sacred tree beside Lake Batur, clearly illustrative not historical evidence, 16:9.",
      "Respectful documentary scene of local village elders from behind walking along a lakeside path, traditional attire, no identifiable faces, 16:9.",
      "Quiet cultural landscape of Trunyan with village, lake and mountain at dusk, contemplative and respectful, 16:9.",
      "Cinematic twilight view of Lake Batur and Trunyan village, mountain silhouette, dark maroon and muted gold documentary tone, 16:9."
    ];
    return topics[i % topics.length];
  })
];
const all = [{name:"opening",prompt:prompts[0]}, ...episode.chapters.map((c,i)=>({name:"chapter-"+String(i+1).padStart(2,"0"),prompt:prompts[i+1]}))];
for (let i=0;i<all.length;i++) {
  const item=all[i], dest=path.join(outputDir,item.name+".jpg");
  const url="https://gen.pollinations.ai/image/"+encodeURIComponent(item.prompt+" Photorealistic cinematic documentary still, horizontal widescreen 16:9, high detail, natural light, no text, no watermark.")+"?model="+encodeURIComponent(model)+"&width=1920&height=1080&seed="+(7200+i);
  let last;
  for(let attempt=1;attempt<=4;attempt++){
    try{
      const response=await fetch(url,{headers:{Authorization:"Bearer "+apiKey,Accept:"image/*"},signal:AbortSignal.timeout(180000)});
      if(!response.ok)throw new Error("HTTP "+response.status+" "+(await response.text()).slice(0,300));
      if(!(response.headers.get("content-type")||"").startsWith("image/"))throw new Error("Response bukan gambar.");
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length<10000)throw new Error("Gambar terlalu kecil.");
      const tmp=dest+".source";fs.writeFileSync(tmp,bytes);
      const {spawnSync}=await import("node:child_process");
      const ff=spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-i",tmp,"-vf","scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080","-frames:v","1",dest],{encoding:"utf8"});
      fs.rmSync(tmp,{force:true});
      if(ff.status!==0)throw new Error(ff.stderr||"Konversi gambar gagal.");
      console.log("Visual siap: "+item.name);
      last=null;break;
    }catch(e){last=e;console.error(item.name+" percobaan "+attempt+": "+e.message);if(attempt<4)await new Promise(r=>setTimeout(r,7000*attempt));}
  }
  if(last)throw new Error("Gagal membuat "+item.name+": "+last.message);
}
console.log("Semua visual long-form berhasil dibuat.");
