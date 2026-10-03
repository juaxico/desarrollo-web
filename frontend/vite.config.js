import { defineConfig } from "vite";
import { resolve } from "path";

// En desarrollo (npm run dev) las llamadas a /api se reenvían al backend (puerto 3000)
export default defineConfig({
    server: {
        proxy: {
            "/api": "http://localhost:3000"
        }
    },
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                cortes: resolve(__dirname, "cortes.html"),
                parrillas: resolve(__dirname, "parrillas.html"),
                pedido: resolve(__dirname, "pedido.html")
            }
        }
    }
});
