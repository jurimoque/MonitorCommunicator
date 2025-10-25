import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// This is the definitive, standard Vite configuration for this project structure.
export default defineConfig({
  plugins: [react()],
  // The project root is the actual root, NOT the 'client' folder.
  resolve: {
    alias: {
      // Alias to find components, lib, etc. inside client/src
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  build: {
    // Build client assets into a 'public' subfolder inside the main 'dist' directory.
    outDir: "dist/public",
    rollupOptions: {
      // The entry point for the client is the index.html inside the 'client' folder.
      input: path.resolve(__dirname, "client", "index.html"),
    },
    emptyOutDir: true,
  },
  // The public assets directory is also inside the 'client' folder.
  publicDir: path.resolve(__dirname, "client", "public"),
});