import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2020",
    // One HTML file per route. There is no app shell and no client router.
    rollupOptions: {
      input: {
        index: "index.html",
        manifesto: "manifesto.html",
        privacy: "privacy.html",
        notFound: "404.html",
      },
    },
  },
});
