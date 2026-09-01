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
 *     package — the same externals the first-party client bundles use;
 *   - the standard CJS preamble (`var module = { exports: {} }; …`) the
 *     bundled body expects — without it the factory throws
 *     `ReferenceError: module is not defined` at materialization and the
 *     renderer boot fails.
 *
 * The script finishes with a browser-materialization smoke test: it executes
 * the artifact against mocked seed modules and fails the build when the
 * factory cannot produce `apply`/`inject`.
 *
 * Run: `pnpm run build:client` (or `node scripts/build-client.mjs`).
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

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
const artifact = [
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {`,
  "var module = { exports: {} };",
  "var exports = module.exports;",
  'Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
  body,
  "return module.exports;",
  "} });",
  ""
].join("\n");

// Browser-materialization smoke test against mocked platform seeds.
let captured = null;
const sandbox = {
  window: {
    __ModuleLoader__: {
      load: (entry) => {
        captured = entry;
      }
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(artifact, sandbox, { filename: "client/client.js" });
if (captured === null) throw new Error("artifact registered no module factory");
if (captured.id !== pkg.name) throw new Error(`artifact id ${JSON.stringify(captured.id)} does not match package name ${JSON.stringify(pkg.name)}`);
const seeds = {
  react: {
    useEffect: () => {},
    useLayoutEffect: () => {},
    useState: (value) => [value, () => {}],
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    Fragment: "Fragment"
  },
  "react/jsx-runtime": {
    jsx: (...args) => ({ args }),
    jsxs: (...args) => ({ args }),
    Fragment: "Fragment"
  },
  "react-dom": {
    createPortal: (element) => element
  },
  "@deepseek-ai/dsh-client-ui-primitives": {
    Button: () => {},
    IconArchiveOutline20: () => {},
    IconEllipsisOutline16: () => {},
    IconFolderClose16: () => {},
    IconTrashOutline16: () => {},
    Menu: () => {},
    RiskConfirmation: () => {},
    relativeTime: () => ({ unit: "now", n: 0 })
  }
};
const factoryExports = captured.factory((spec) => {
  if (Object.hasOwn(seeds, spec)) return seeds[spec];
  throw new Error(`unexpected external require: ${spec}`);
});
if (typeof factoryExports.apply !== "function") throw new Error("artifact exports no apply function");
if (!Array.isArray(factoryExports.inject)) throw new Error("artifact exports no inject list");

const outPath = join(root, "client/client.js");
writeFileSync(outPath, artifact);
console.log(`built ${outPath} (${Buffer.byteLength(artifact)} bytes; smoke test: apply/inject OK; externals: ${externals.join(", ")})`);
