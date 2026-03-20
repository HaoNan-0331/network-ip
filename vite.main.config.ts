import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '.vite/build'),
    lib: {
      entry: path.resolve(__dirname, 'src/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3',
        'ssh2',
        'ssh2-promise',
        'telnet-client',
      ],
      output: {
        entryFileNames: 'main.js',
      },
    },
  },
});
