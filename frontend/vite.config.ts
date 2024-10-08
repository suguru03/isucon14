import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

 const DEFAULT_HOSTNAME = 'localhost';
 const DEFAULT_PORT = 3000;

export const config = {
  plugins: [
    remix({
      ssr: false,
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    host: DEFAULT_HOSTNAME,
    port: DEFAULT_PORT,
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    host: DEFAULT_HOSTNAME,
    port: DEFAULT_PORT,
  }
} as const satisfies UserConfig;

export default defineConfig(config);
