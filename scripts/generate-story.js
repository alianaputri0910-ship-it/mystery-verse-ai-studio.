import fs from "node:fs";
import path from "node:path";

const DEFAULT_TOPIC = "Pembunuhan Keluarga Setagaya — Misteri yang Belum Terpecahkan (2000)";
const requestedTopic = process.argv.slice(2).join(" ").trim() || DEFAULT_TOPIC;

// IMPORTANT: This repository currently contains one fully-authored episode.
// Never label a hard-coded Setagaya script as a different topic.
if (requestedTopic !== DEFAULT_TOPIC) {
  throw new Error(
    "TOPIC_NOT_AUTHORED: Generator saat ini hanya memiliki naskah terverifikasi untuk Setagaya. " +
    "Topik baru tidak boleh dirender sebelum tersedia sebagai episode dengan narasi, visual, sumber, dan metadata yang sesuai. " +
    "Permintaan: " + requestedTopic
  );
}

const scenes = [
  {
    beat: "MALAM TERAKHIR",
    narration: "Tokyo, 30 Desember 2000. Sebuah keluarga menghabiskan malam terakhir mereka di rumah.",
    visual_prompt: "Respectful cinematic historical reconstruction of a quiet residential street in Setagaya, Tokyo, winter night December 2000, modest Japanese family home beside a dark neighborhood park, subtle warm window light, empty street, documentary realism, no people visible, no text, vertical 9:16."
  },
  {
    beat: "EMPAT KORBAN",
    narration: "Mikio Miyazawa, istrinya Yasuko, dan dua anak mereka tinggal di sana.",
    visual_prompt: "A respectful symbolic reconstruction of a Japanese family home interior in Tokyo around 2000, four empty dining place settings, warm domestic light, ordinary family photographs softly out of focus, no identifiable real people, no violence, photorealistic documentary, vertical 9:16."
  },
  {
    beat: "PAGI YANG MENGERIKAN",
    narration: "Pagi berikutnya, keluarga itu ditemukan tewas. Kasusnya mengguncang Jepang.",
    visual_prompt: "Quiet Japanese suburban home exterior in Setagaya on a cold winter morning in 2000, police tape at a respectful distance, investigators as indistinct silhouettes, overcast natural light, no bodies, no blood, no graphic content, cinematic true crime documentary, vertical 9:16."
  },
  {
    beat: "PELAKU TERTINGGAL",
    narration: "Namun, pelaku meninggalkan banyak petunjuk di dalam rumah.",
    visual_prompt: "Careful forensic investigation reconstruction inside a Japanese home circa 2000, gloved investigator hands examining ordinary clothing and small evidence markers on a table, no gore, no readable labels, restrained documentary lighting, photorealistic, vertical 9:16."
  },
  {
    beat: "JEJAK YANG GANJIL",
    narration: "Jejak sidik jari, pakaian, dan bukti biologis ditemukan di lokasi.",
    visual_prompt: "Close-up forensic evidence still life in a Japanese investigation room, fingerprint powder and evidence bags containing folded clothing, case photographs blurred and unreadable, cool cinematic lighting, realistic 2000-era details, no graphic imagery, vertical 9:16."
  },
  {
    beat: "TETAP TAK TERUNGKAP",
    narration: "Bahkan, penyelidik meyakini pelaku sempat berada di rumah setelah pembunuhan.",
    visual_prompt: "Empty kitchen in a quiet Japanese suburban house at night, untouched cup and computer monitor glowing faintly, long shadows, unsettling but realistic atmosphere, no person visible, historical 2000 setting, cinematic true crime documentary, vertical 9:16."
  },
  {
    beat: "MISTERI 25 TAHUN",
    narration: "Lebih dari dua puluh lima tahun berlalu. Identitas pembunuhnya masih menjadi misteri.",
    visual_prompt: "Present-day exterior of a quiet residential area beside Soshigaya Park in Setagaya Tokyo at dusk, lone streetlight, winter trees, solemn respectful atmosphere, cinematic documentary realism, no people, no text, vertical 9:16."
  },
  {
    beat: "AJAKAN MYSTERY VERSE",
    narration: "Ikuti MYSTERY VERSE. Like, subscribe, dan tulis pendapatmu!",
    visual_prompt: "Cinematic dark mystery documentary closing scene, elegant black evidence wall with subtle gold light, a vintage typewriter and pinned blank case photographs, dramatic shadows, refined gold typography reading LIKE • SUBSCRIBE • KOMENTAR and MYSTERY VERSE, tasteful premium Netflix documentary visual, no people, vertical 9:16."
  }
];

const storyData = {
  channel: "MYSTERY VERSE",
  topic: DEFAULT_TOPIC,
  title: "EMPAT ORANG TEWAS, PEMBUNUHNYA HILANG — MISTERI SETAGAYA (2000)",
  youtube: {
    title: "EMPAT ORANG TEWAS, PEMBUNUHNYA HILANG… MISTERI SETAGAYA 2000",
    description: "Pada malam 30 Desember 2000, keluarga Miyazawa menjadi korban pembunuhan di rumah mereka di Setagaya, Tokyo. Banyak petunjuk ditemukan, tetapi pelakunya belum tertangkap. Kisah nyata yang masih menyisakan pertanyaan.\n\nMYSTERY VERSE — kisah nyata, misteri, dan kejadian yang belum terpecahkan.\n\nCatatan: Video ini merupakan rekonstruksi dokumenter berdasarkan informasi publik. Tidak menampilkan detail grafis dan menghormati para korban.",
    hashtags: ["#Setagaya", "#MisteriNyata", "#TrueCrime", "#MisteriJepang", "#MysteryVerse", "#YouTubeShorts"],
    tags: ["Setagaya family murder", "misteri Setagaya", "pembunuhan Jepang 2000", "kasus belum terpecahkan", "true crime Indonesia", "misteri nyata"]
  },
  opening_visual_prompt: "A cinematic horror mystery channel opening: a long narrow abandoned corridor disappearing into darkness, a trail of subtle dark-red footprints leading toward the distance, a motionless anonymous black-hooded silhouette at the far end, cold fog, one flickering overhead light, dramatic high-contrast shadows, tasteful non-graphic atmosphere, premium Netflix mystery documentary cinematography, no text, vertical 9:16.",
  language: "id-ID",
  format: { width: 1080, height: 1920, aspect_ratio: "9:16", duration_seconds: 60, fps: 30 },
  scenes: scenes.map((scene, index) => ({
    scene: index + 1,
    beat: scene.beat,
    narration: scene.narration,
    visual_prompt: scene.visual_prompt,
    sound: "Low restrained dark ambient drone, subtle winter wind, soft cinematic transition impact"
  }))
};

if (storyData.scenes.length !== 8 || storyData.scenes.some(s => !s.narration || !s.visual_prompt)) {
  throw new Error("EPISODE_VALIDATION_FAILED: Setiap adegan wajib memiliki narasi dan visual prompt.");
}

fs.mkdirSync("output", { recursive: true });
fs.writeFileSync(path.join("output", "story.json"), JSON.stringify(storyData, null, 2));
fs.writeFileSync(path.join("output", "youtube-metadata.json"), JSON.stringify(storyData.youtube, null, 2));
console.log("MYSTERY VERSE: episode Setagaya tervalidasi; 8 adegan termasuk CTA siap dirender.");
