/* eslint-disable prettier/prettier */

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    // 1. TanStack Start needs to be right at the top so it can crawl routes
    //    and generate `routeTree.gen.ts` before any other plugin tries to read it.
    tanstackStart({
      server: {
        entry: "server",
      },
      serverFns: {
        disableCsrfMiddlewareWarning: true,
      },
    }),
    // 2. Paths resolution next
    tsconfigPaths(),
    // 3. Styling and UI compilation
    tailwindcss(),
    viteReact(),
  ],

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
