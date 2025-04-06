import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import ssrHotReload from "vite-plugin-ssr-hot-reload";

export default defineConfig(({ mode }) => {
  const commonConfig = {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };

  if (mode === "client") {
    return {
      ...commonConfig,
      plugins: [tailwindcss()],
      build: {
        rollupOptions: {
          input: {
            style: "./src/style.css",
            client: "./src/client.tsx",
          },
          output: {
            dir: "./dist",
            assetFileNames: "static/[name].[ext]",
            entryFileNames: "static/[name].js",
          },
        },
        copyPublicDir: true,
        minify: true,
      },
    };
  }

  return {
    ...commonConfig,
    ssr: {
      external: ["react", "react-dom"],
    },
    plugins: [ssrHotReload(), cloudflare(), tailwindcss()],
  };
});
