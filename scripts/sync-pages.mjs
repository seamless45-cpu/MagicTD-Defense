/**
 * Publishes the built game where GitHub Pages expects it.
 *
 * Pages is configured (outside our control) to serve this branch's root, so the
 * playable artifact has to live at ./index.html. `npm run build` runs this after
 * `vite build`:
 *   dist/app.html  -> dist/index.html   (so `npm run preview` works at "/")
 *   dist/app.html  -> ./index.html      (what GitHub Pages serves)
 */
import { copyFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(root, "dist", "app.html");

if (!existsSync(built)) {
  console.error(`sync-pages: ${path.relative(root, built)} not found - run vite build first`);
  process.exit(1);
}

let html = readFileSync(built, "utf8");

// keep only the served entry name; everything is already inlined
if (!html.includes("MagicTD")) {
  console.error("sync-pages: refusing to publish, app.html does not look like the built game");
  process.exit(1);
}

// `vite build` may reference the entry by name; there should be no external module left
const external = html.match(/<script[^>]+src="[^"]*"/i);
if (external) {
  console.error(`sync-pages: refusing to publish, found an external script: ${external[0]}`);
  process.exit(1);
}

// mark the generated file (comment placed after the doctype, which is safe)
const marker =
  "<!-- GENERATED FILE - do not edit. Source entry is app.html; rebuild with `npm run build`. -->";
if (!html.includes("GENERATED FILE - do not edit")) {
  html = html.replace(/(<!doctype html>)/i, `$1\n${marker}`);
}

copyFileSync(built, path.join(root, "dist", "index.html"));
writeFileSync(path.join(root, "index.html"), html);
console.log(
  `sync-pages: wrote dist/index.html and index.html (${(html.length / 1024).toFixed(1)} kB) - GitHub Pages ready`
);
