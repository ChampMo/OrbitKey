import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development:
  //  - Prevent Vite from obscuring Rust compiler errors
  clearScreen: false,
  server: {
    port: 1420,
    // Tauri expects a fixed port; fail if it's unavailable
    strictPort: true,
    watch: {
      // Ignore the Rust source directory to avoid unnecessary reloads
      ignored: ["**/src-tauri/**"],
    },
  },
}));
