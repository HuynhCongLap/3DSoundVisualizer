const fs = require("fs");
const path = require("path");

const folder = path.join(__dirname, "../public/demo-songs");
const files = fs.readdirSync(folder);

const playlist = files
  .filter(f => f.endsWith(".mp3"))
  .map(f => ({
    name: f.replace(/\.[^/.]+$/, ""), // Bỏ .mp3, lấy tên
    url: `/demo-songs/${f}`
  }));

fs.writeFileSync(
  path.join(folder, "demo-playlist.json"),
  JSON.stringify(playlist, null, 2)
);

console.log("demo-playlist.json generated:", playlist.length, "songs");