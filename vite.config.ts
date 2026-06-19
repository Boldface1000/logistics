import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    serverFns: {
      disableCsrfMiddlewareWarning: true,
    },
  },
  nitro: true,

  // ── Pre-bundle heavy deps so the browser doesn't do it on first load ──
  optimizeDeps: {
    include: [
      "@supabase/supabase-js",
      "@tanstack/react-router",
      "@tanstack/react-start",
      "react",
      "react-dom",
    ],
    force: false, // set true once to force a clean re-bundle, then revert
  },

  // ── Warm up the most-visited routes so HMR is instant ──
  server: {
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/routes/__root.tsx", "./src/routes/index.tsx"],
    },
  },

  // ── Faster builds ──
  esbuild: {
    target: "esnext",
    logOverride: { "this-is-undefined-in-esm": "silent" },
  },
});
