import path from "path"
import { defineConfig } from "vite"
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        content: path.resolve(__dirname, "src/Content/content.ts"),
      },
      // Output the content script as content.js instead of typescript file
      output: {
        entryFileNames: (chunk) => {
          return chunk.name === "content" ? "content.js" : "[name].[hash].js"
        }
      }
    }
  }
})
