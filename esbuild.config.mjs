import esbuild from "esbuild";
import process from "process";

const context = await esbuild.context({
    entryPoints: ["main.ts"],
    bundle: true,
    external: ["obsidian"],
    format: "cjs",
    target: "es2020",
    outfile: "main.js",
    logLevel: "info",
    sourcemap: false,
    treeShaking: true,
});

await context.rebuild();
process.exit(0);