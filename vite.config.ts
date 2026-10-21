import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
    base: "/dashboard",
    plugins: [react()],
    server: {
        // Bind the dev server to loopback so an in-browser CSRF or LAN
        // scan cannot reach a developer's dashboard token. Override with
        // `bun run dev -- --host 0.0.0.0` for Docker / remote dev only.
        host: "127.0.0.1",
        proxy: {
            "^/api/v1/ws/.*": {
                target: "ws://127.0.0.1:8008",
                changeOrigin: true,
                ws: true,
            },
            "/api": {
                target: "http://127.0.0.1:8008",
                changeOrigin: true,
            },
            "/mcp": {
                target: "http://127.0.0.1:8008",
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
                    if (!pkg) return

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

                    // 4.1 动画 / 表格 / 终端 / 图标 / 组件库底座：这些以前全被
                    // 兜底的 "vendor" 吞进首屏 chunk。现在各自成块，随对应路由的
                    // 懒加载 chunk 一起按需下载。
                    if (pkg === "framer-motion" || pkg === "motion" || pkg === "motion-dom") {
                        return "motion"
                    }
                    if (
                        pkg.startsWith("@tanstack/") ||
                        pkg === "react-virtuoso" ||
                        pkg === "react-day-picker"
                    ) {
                        return "table"
                    }
                    if (pkg.startsWith("@xterm/")) {
                        return "terminal"
                    }
                    // simple-icons is deliberately not bucketed: ui/icon.tsx
                    // raw-imports every brand SVG through import.meta.glob, so
                    // the module map alone is ~5 MB. Left to Rollup it becomes
                    // its own on-demand chunk fetched only when an OAuth
                    // provider icon is rendered.
                    if (pkg === "lucide-react" || pkg === "country-flag-icons") {
                        return "icons"
                    }
                    if (
                        pkg === "cmdk" ||
                        pkg === "vaul" ||
                        pkg === "sonner" ||
                        pkg === "next-themes" ||
                        pkg === "zustand" ||
                        pkg === "jotai-zustand" ||
                        pkg === "copy-to-clipboard"
                    ) {
                        return "ui-kit"
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

                    // 8. 其余第三方库不再强制合并：让 Rollup 把它们并入
                    // 引用它们的路由 chunk，首屏就不会为一个只在设置页用到的
                    // 小库多付一次请求。只有只被入口引用的情况才会留在入口 chunk。
                    return
                },
            },
        },
    },
})
