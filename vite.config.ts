/* eslint-disable prettier/prettier */

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackRouter(),
    tanstackStart({
      server: { entry: "server" },
      serverFns: {
        disableCsrfMiddlewareWarning: true,
      },
    }),
    viteReact(),
    nitro(),
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
