// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.

// what is the next step for this project to come online. i just ran both "npm run build" & "npm run dev" all turn out successful and project running live on server, ➜  Local:   http://localhost:8080/ ➜  Network: http://192.168.43.13:8080/ and i have run build successfully on my cloudflared account which i linked this commited project to github to cloudflared, updated the secrets on github "VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN".

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
