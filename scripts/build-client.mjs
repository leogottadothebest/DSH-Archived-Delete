/**
 * dsh-plugin-archived-conversations — client bundle build.
 *
 * The DSH browser runtime executes each plugin's `./client` artifact as a
 * classic script and expects it to register a CJS factory through
 * `window.__ModuleLoader__.load({ id, factory(require) })` (the client
 * module system's lazy table). Raw ESM sources would fail to parse in the
 * browser and brick the renderer boot — so this script bundles the client
 * half into that exact format:
 *
 *   - bundled inline: zod codecs and every local module;
 *   - external (resolved through the platform seed/module graph at
 *     runtime): react, react/jsx-runtime, react-dom, and the primitives
 *     package — the same externals the first-party client bundles use.
 *
 * Run: `pnpm run build:client` (or `node scripts/build-client.mjs`).
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const externals = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/dsh-client-ui-primitives"
];

const result = await build({
  entryPoints: [join(root, "client/src/index.js")],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["es2022"],
  external: externals,
  write: false,
  logLevel: "warning"
});

if (result.outputFiles.length !== 1) {
  throw new Error("expected exactly one bundle output");
}

const body = result.outputFiles[0].text;
const artifact = `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {\n${body}\n} });\n`;
const outPath = join(root, "client/client.js");
writeFileSync(outPath, artifact);
console.log(`built ${outPath} (${Buffer.byteLength(artifact)} bytes, externals: ${externals.join(", ")})`);
