import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const here = import.meta.dirname;

// Build jadi SATU file IIFE yang self-contained: React, three.js, dan R3F
// semuanya ke-bundle di dalam. Nggak ada dependency eksternal, nggak ada
// fetch ke CDN sama sekali.
//
// Output-nya ditaruh langsung ke public/ folder app Frappe, jadi dilayani
// di /assets/xsha_office/office/office.js tanpa lewat esbuild-nya Frappe.
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: resolve(here, "../xsha_office/public/office"),
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    target: "es2020",
    lib: {
      entry: resolve(here, "src/main.tsx"),
      formats: ["iife"],
      name: "XshaOffice",
      fileName: () => "office.js",
    },
  },
});
