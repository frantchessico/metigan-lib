import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM + CJS + type declarations for Node and bundlers.
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
    outDir: 'dist',
    // Make `require('metigan')` return the default export (the client class)
    // with the named exports attached, while keeping ESM `import` working.
    cjsInterop: true,
  },
  // Self-contained browser build for <script> / unpkg / jsDelivr.
  // Exposes a global `Metigan` that IS the default export (the client class),
  // with the named exports attached as static properties.
  {
    entry: { metigan: 'src/index.ts' },
    format: ['iife'],
    globalName: 'Metigan',
    minify: true,
    sourcemap: true,
    target: 'es2018',
    outDir: 'dist',
    footer: {
      js: 'Metigan=Object.assign(Metigan.default,Metigan);',
    },
  },
]);
