import { defineConfig, mergeConfig } from "vitest/config"

import viteConfig from "./vite.config.ts"

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: "jsdom",
            exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
            globals: true,
            setupFiles: ["./src/test/setup.ts"],
        },
    }),
)
