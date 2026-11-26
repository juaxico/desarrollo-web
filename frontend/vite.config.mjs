import { defineConfig } from "vite";
import { resolve } from "path";
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// En desarrollo (npm run dev) las llamadas a /api se reenvían al backend (puerto 3000)
export default defineConfig({
    plugins: [{
        name: "classic-scripts-and-product-images",
        closeBundle() {
            // Los scripts clásicos exponen funciones utilizadas por los botones HTML.
            for (const folder of ["js", "imagenes_productos"]) {
                cpSync(resolve(__dirname, "assets", folder), resolve(__dirname, "dist/assets", folder), {recursive:true});
            }
        }
    }],
    server: {
        proxy: {
            "/api": "http://localhost:3000"
        }
    },
    preview: {
        proxy: {"/api": "http://127.0.0.1:3000"}
    },
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                cortes: resolve(__dirname, "cortes.html"),
                parrillas: resolve(__dirname, "parrillas.html"),
                pedido: resolve(__dirname, "pedido.html"),
                historial: resolve(__dirname, "mis-pedidos.html"),
                pago: resolve(__dirname, "pago.html")
            }
        }
    }
});
