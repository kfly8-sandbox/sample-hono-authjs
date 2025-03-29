import path from "path"
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrHotReload from 'vite-plugin-ssr-hot-reload'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const commonConfig = {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    }
  }

  if (mode === 'client') {
    return {
      ...commonConfig,
      plugins: [ tailwindcss() ],
      build: {
        rollupOptions: {
          input: {
            style: "./src/style.css",
          },
          output: {
            dir: "./dist",
            assetFileNames: "static/[name].[ext]",
          },
        },
        copyPublicDir: true,
        minify: true,
      }
    }
  }
  else {
    return {
      ...commonConfig,
      ssr: {
        external: ['react', 'react-dom'],
      },
      plugins: [ssrHotReload(), cloudflare(), tailwindcss()],
    }
  }
})
