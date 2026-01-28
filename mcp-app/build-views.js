import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const viewsDir = path.join(import.meta.dirname, "src", "views");
const distDir = path.join(import.meta.dirname, "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const htmlFiles = fs.readdirSync(viewsDir).filter((f) => f.endsWith(".html"));

for (const file of htmlFiles) {
  console.log(`Building view: ${file}`);
  execSync(`npx vite build`, {
    cwd: import.meta.dirname,
    stdio: "inherit",
    env: { ...process.env, INPUT: path.join("src", "views", file) },
  });
  // vite outputs to dist/ with the same name
  const outputPath = path.join(distDir, file);
  if (fs.existsSync(outputPath)) {
    console.log(`  -> dist/${file}`);
  }
}

console.log(`Built ${htmlFiles.length} views.`);
