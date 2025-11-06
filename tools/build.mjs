import { cp, mkdir, rm, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const distDir = join(projectRoot, "dist");

const filesToCopy = [
  "index.html",
  "styles.css",
  "script.js",
  "manifest.json",
  "sw.js",
];

const directoriesToCopy = [
  "assets",
  "config",
];

async function ensureCleanDist() {
  await rm(distDir, { force: true, recursive: true });
  await mkdir(distDir, { recursive: true });
}

async function copyStaticFiles() {
  await Promise.all(
    filesToCopy.map((file) =>
      cp(join(projectRoot, file), join(distDir, file), { force: true })
    )
  );
  for (const dir of directoriesToCopy) {
    await cp(join(projectRoot, dir), join(distDir, dir), {
      recursive: true,
      force: true,
    });
  }
}

async function createMetaFile() {
  const metadata = {
    generatedAt: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
  };
  await writeFile(
    join(distDir, "build.json"),
    JSON.stringify(metadata, null, 2),
    "utf8"
  );
}

async function build() {
  console.info("Cleaning dist directory...");
  await ensureCleanDist();
  console.info("Copying static assets...");
  await copyStaticFiles();
  console.info("Writing metadata...");
  await createMetaFile();
  console.info("Build completed. Output in ./dist");
}

build().catch((error) => {
  console.error("Build failed", error);
  process.exitCode = 1;
});
