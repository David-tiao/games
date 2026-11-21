import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/play/gomoku/",
  server: { host: "0.0.0.0", port: 5173, strictPort: true }
});
