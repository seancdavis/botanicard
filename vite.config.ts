import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import netlifyPlugin from "@netlify/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), netlifyPlugin()],
});
