/* eslint-disable prettier/prettier */

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: {
        entry: "index.js",
      },
      serverFns: {
        disableCsrfMiddlewareWarning: true,
      },
    }),
    nitro(),
    tsconfigPaths(),
    tailwindcss(),
    viteReact(),
  ],
  nitro: {
    preset: "cloudflare-pages",
  },

  // ── Pre-bundle heavy deps so the browser doesn't do it on first load ──
  optimizeDeps: {
    include: [
      "@supabase/supabase-js",
      "@tanstack/react-router",
      "@tanstack/react-start",
      "react",
      "react-dom",
    ],
  },
  esbuild: {
    target: "esnext",
    logOverride: { "this-is-undefined-in-esm": "silent" },
  },
});
