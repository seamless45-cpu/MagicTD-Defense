import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
/**
 * Dev-only request logger. When a browser reports a blank page we can check the server
 * log to see exactly which requests it made (and whether the module graph was fetched).
 */
function requestLogger(): Plugin {
  return {
    name: "magictd-request-logger",
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
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), requestLogger()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
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
