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
        cssCodeSplit: true,
        sourcemap: false,
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    if (!id.includes("node_modules")) return

                    // 提取顶级包名，例如 node_modules/react/ 或 node_modules/@radix-ui/react-popover/
                    const m = id.match(/node_modules\/(@?[^/]+)/)
                    const pkg = m ? m[1] : null
                    if (!pkg) return "vendor"

                    // React 生态统一到一个分组，避免拆散 runtime/scheduler 导致 undefined
                    if (
                        pkg === "react" ||
                        pkg === "react-dom" ||
                        pkg === "scheduler" ||
                        pkg === "react-router" ||
                        pkg === "react-router-dom" ||
                        pkg === "history"
                    ) {
                        return "react"
                    }

                    // Radix UI / shadcn 生态
                    if (
                        pkg.startsWith("@radix-ui") ||
                        pkg === "class-variance-authority" ||
                        pkg === "clsx" ||
                        pkg === "tailwind-merge"
                    ) {
                        return "ui"
                    }

                    // 表单与校验
                    if (
                        pkg === "react-hook-form" ||
                        pkg === "@hookform" ||
                        pkg === "@hookform/resolvers" ||
                        pkg === "zod"
                    ) {
                        return "form"
                    }

                    // i18n
                    if (pkg === "i18next" || pkg === "react-i18next") {
                        return "i18n"
                    }

                    // 数据获取
                    if (pkg === "swr") {
                        return "swr"
                    }

                    // 其它第三方按包名切分，避免合成一个过大的 vendor
                    return `vendor-${pkg}`
                },
            },
        },
    },
})
