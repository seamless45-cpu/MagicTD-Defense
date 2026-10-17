import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dev-only extras:
 *  - serve the Vite entry (`app.html`) at "/" so the familiar URL keeps working
 *  - log every request so a blank page in a proxied preview can be traced server-side
 *
 * `app.html` is the source/dev entry. The repo-root `index.html` is a *generated*
 * build artifact, committed because GitHub Pages serves this branch's root directly.
 * Run `npm run build` to regenerate it.
 */
function devExtras(): Plugin {
  return {
    name: "magictd-dev-extras",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const started = Date.now();
        res.on("finish", () => {
          const ua = String(req.headers["user-agent"] || "").slice(0, 60);
          const origin = req.headers.origin || "-";
          const host = req.headers.host || "-";
          console.log(
            `[req] ${res.statusCode} ${req.url} host=${host} origin=${origin} ${Date.now() - started}ms ua="${ua}"`
          );
        });
        next();
      });
      // "/" -> the real entry file
      server.middlewares.use((req, _res, next) => {
        const url = req.url || "/";
        if (url === "/" || url.startsWith("/?")) req.url = "/app.html" + url.slice(1);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), devExtras()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // entry is app.html; scripts/sync-pages.mjs copies the result to index.html
    rollupOptions: {
      input: path.resolve(__dirname, "app.html"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // allow the sandbox preview host (https://<port>-<id>.e2b.app)
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
});
