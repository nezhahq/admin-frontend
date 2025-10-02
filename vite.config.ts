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

                    // 提取顶级包名，兼容 scoped packages（如 @radix-ui/react-dialog）
                    const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/)
                    const pkg = match ? match[1] : null
                    if (!pkg) return "vendor"

                    // 1. 核心框架：React 及其紧密依赖（必须合并，避免运行时错误）
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

                    // 2. UI 相关：Radix UI + shadcn 工具链
                    if (
                        pkg.startsWith("@radix-ui/") ||
                        pkg === "class-variance-authority" ||
                        pkg === "clsx" ||
                        pkg === "tailwind-merge"
                    ) {
                        return "ui"
                    }

                    // 3. 表单与校验
                    if (
                        pkg === "react-hook-form" ||
                        pkg.startsWith("@hookform/") || // 匹配 @hookform/resolvers, @hookform/devtools 等
                        pkg === "zod"
                    ) {
                        return "form"
                    }

                    // 4. 国际化
                    if (pkg === "i18next" || pkg === "react-i18next") {
                        return "i18n"
                    }

                    // 5. 数据获取
                    if (pkg === "swr") {
                        return "data"
                    }

                    // 6. 工具类库（高频、轻量、通用）—— 合并减少请求数
                    const utilityLibs = [
                        "lodash-es",
                        "date-fns",
                        "dayjs",
                        "axios",
                        "nanoid",
                        "uuid",
                        "immer",
                        "lodash",
                    ]
                    if (utilityLibs.includes(pkg)) {
                        return "utils"
                    }

                    // 7. 大型独立库（如图表、富文本等）单独分包，按需加载
                    const largeLibs = [
                        "chart.js",
                        "recharts",
                        "echarts",
                        "quill",
                        "draft-js",
                        "monaco-editor",
                        "@monaco-editor/react",
                    ]
                    if (largeLibs.includes(pkg)) {
                        return `lib-${pkg.replace(/@/g, "").replace(/\//g, "-")}`
                    }

                    // 8. 其他第三方库：按顶级包名分组，但限制数量（避免太多小 chunk）
                    // 如果你项目依赖很多，可考虑合并为 "vendor-others"
                    return "vendor"
                },
            },
        },
    },
})
