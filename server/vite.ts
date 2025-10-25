import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { type Server } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// This function is for development and not critical for production.
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
    root: path.resolve(__dirname, "..", "client"),
  });
  app.use(vite.middlewares);
}

export function serveStatic(app: Express) {
  // The server's compiled index.js is in 'dist'. The client assets are now in 'dist/public'.
  const publicPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(publicPath)) {
    throw new Error(
      `Could not find the build directory: ${publicPath}. Run 'npm run build'.`
    );
  }

  app.use(express.static(publicPath));
  // Fallback to index.html for single-page applications.
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}