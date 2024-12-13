import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
    base: "/dashboard",
    plugins: [react()],
    server: {
        proxy: {
            "^/api/v1/ws/.*": {
                target: "ws://localhost:8008",
                changeOrigin: true,
                ws: true,
            },
            "/api": {
                target: "http://localhost:8008",
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        return id.toString().split("node_modules/")[1].split("/")[0].toString()
                    }
                },
            },
        },
    },
})
