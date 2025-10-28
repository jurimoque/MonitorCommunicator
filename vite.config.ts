import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  // CRITICAL: Use relative paths for all assets in the final build.
  base: "./",
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  // CRITICAL: Define the source root, which is essential for this project structure.
  root: "client",
  build: {
    // CRITICAL: Output to the project's root 'dist' folder, relative to the 'root' property.
    outDir: "../dist",
    emptyOutDir: true,
    // CAPACITOR FIX: Los módulos @capacitor/* DEBEN ser bundleados por Vite.
    // El archivo capacitor.js en el HTML es solo el bridge nativo, pero los módulos
    // TypeScript (@capacitor/core, @capacitor/app, etc.) son librerías JavaScript
    // normales que necesitan estar en el bundle final.
    // NO usar external para @capacitor/*
  },
});