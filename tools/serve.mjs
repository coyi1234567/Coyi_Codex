#!/usr/bin/env node
import http from "http";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { extname, join, resolve } from "path";
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

function parseArgs(argv) {
  const args = { root: process.cwd(), port: 4173 };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--root" && next) {
      args.root = resolve(next);
      i += 1;
    } else if (key === "--port" && next) {
      args.port = Number.parseInt(next, 10) || args.port;
      i += 1;
    }
  }
  return args;
}

function withinRoot(requestPath, root) {
  const resolved = resolve(root, requestPath);
  return resolved.startsWith(root);
}

const { root, port } = parseArgs(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) {
      pathname += "index.html";
    }
    const filePath = join(root, pathname.replace(/^\/+/, ""));
    if (!withinRoot(filePath, root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      res.writeHead(301, { Location: `${pathname}/` });
      res.end();
      return;
    }
    const ext = extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": ext === ".html" ? "no-cache" : "max-age=3600",
    });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(port, () => {
  const relativeRoot = root.startsWith(process.cwd())
    ? `.${root.slice(process.cwd().length)}` || "."
    : root;
  console.info(`Nebula Expedition dev server running at http://localhost:${port}`);
  console.info(`Serving files from ${relativeRoot}`);
});
