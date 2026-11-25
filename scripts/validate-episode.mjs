import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const episodeId = args.find((v) => !v.startsWith("--")) || "episode-001";
const stageArg = args.find((v) => v.startsWith("--stage="));
const stage = stageArg ? stageArg.split("=")[1] : "quality";
const root = path.resolve("episodes", episodeId);

if (!/^episode-[a-zA-Z0-9_-]+$/.test(episodeId)) throw new Error("Invalid episode id.");
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Episode directory not found: ${root}`);

function readJson(name, required = true) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) {
    if (required) throw new Error(`Missing required file: ${file}`);
    return null;
  }
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error(`Invalid JSON in ${name}: ${error.message}`); }
}

const research = readJson("research.json", stage !== "quality");
const script = readJson("script.json", stage === "production" || stage === "quality");
const storyboard = readJson("storyboard.json", stage === "production" || stage === "quality");

for (const [name, data] of [["research.json", research], ["script.json", script], ["storyboard.json", storyboard]]) {
  if (data && data.episode_id !== episodeId) throw new Error(`${name} episode_id does not match folder.`);
}
if (stage === "production") {
  if (!Array.isArray(script.scenes) || script.scenes.length === 0) throw new Error("script.json needs at least one scene.");
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) throw new Error("storyboard.json needs at least one scene.");
  if (script.scenes.length !== storyboard.scenes.length) throw new Error("Script and storyboard scene counts must match.");
}
if (stage === "quality") {
  const qc = readJson("qc-report.json", false);
  if (qc && qc.episode_id !== episodeId) throw new Error("qc-report.json episode_id does not match folder.");
  for (const name of ["research.json", "script.json", "storyboard.json", "qc-report.json"]) readJson(name, false);
}
console.log(JSON.stringify({ok:true,episode_id:episodeId,stage}, null, 2));
