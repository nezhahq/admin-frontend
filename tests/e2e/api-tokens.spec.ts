import { expect } from "@playwright/test"

import { csrfHeaders, defaultAdmin, loginAs, test } from "./fixtures"

test("admin can create and reveal an API token via UI", async ({ page }) => {
    await loginAs(page, defaultAdmin)
    await page.goto("/dashboard/settings/api-tokens")
    await expect(page.getByRole("heading", { name: /API Tokens|API 令牌/ })).toBeVisible()

    const name = `e2e-${Date.now().toString(36)}`

    await page.getByRole("button", { name: /Create API token|创建 API 令牌/ }).click()

    const dialog = page.getByRole("dialog")
    await dialog.getByLabel(/^Name|^名称/).fill(name)
    await dialog.getByText("nezha:server:read").click()

    await dialog.getByRole("button", { name: /Create API token|创建 API 令牌/ }).click()

    const codeBlock = page.locator("code").filter({ hasText: /^nzp_/ })
    await expect(codeBlock).toBeVisible({ timeout: 10_000 })
    const revealed = (await codeBlock.textContent())?.trim() ?? ""
    expect(revealed).toMatch(/^nzp_/)

    await page.getByRole("button", { name: /^Done$|^完成$/ }).click()

    await expect(page.getByRole("cell", { name })).toBeVisible()

    // 仅通过 API 清理：headless 下 window.confirm() 的时序对 UI revoke 不稳定，
    // 这里只保证 token 不残留到下一次跑测试。UI revoke 路径由专门的测试覆盖。
    const tokens = await page.request.get("/api/v1/api-tokens").then((r) => r.json())
    const target = tokens.data.find((t: { name: string }) => t.name === name)
    if (target) {
        const del = await page.request.delete(`/api/v1/api-tokens/${target.id}`, {
            headers: await csrfHeaders(page),
        })
        expect(del.ok()).toBeTruthy()
    }
})

test("admin can revoke an API token via UI revoke button", async ({ page }) => {
    await loginAs(page, defaultAdmin)

    const name = `e2e-revoke-${Date.now().toString(36)}`
    const created = await page.request.post("/api/v1/api-tokens", {
        headers: await csrfHeaders(page),
        data: { name, scopes: ["nezha:server:read"] },
    })
    expect(created.ok()).toBeTruthy()
    const tokenID: number = (await created.json()).data.id

    await page.goto("/dashboard/settings/api-tokens")
    const row = page.getByRole("row").filter({ hasText: name })
    await expect(row).toBeVisible()

    page.once("dialog", (dialog) => dialog.accept())
    await row.getByRole("button", { name: /Revoke|撤销/ }).click()

    await expect(row).toHaveCount(0)

    // The list endpoint omits `data` entirely when the admin has zero tokens,
    // so default to [] before searching for the revoked id.
    const after = await page.request.get("/api/v1/api-tokens").then((r) => r.json())
    const tokens: Array<{ id: number }> = after.data ?? []
    expect(tokens.find((t) => t.id === tokenID)).toBeUndefined()
})

test("an API token can authenticate /mcp", async ({ page }) => {
    await loginAs(page, defaultAdmin)
    await page.goto("/dashboard/settings/api-tokens")

    // EnableMCP defaults to false: snapshot + enable + restore so the test is hermetic.
    const settingBefore = (await page.request.get("/api/v1/setting").then((r) => r.json())).data
        ?.config as Record<string, unknown> & {
        site_name?: string
        user_template?: string
        enable_mcp?: boolean
    }
    const baseSettings: Record<string, unknown> = {
        ...settingBefore,
        site_name: settingBefore?.site_name || "Nezha",
        user_template: settingBefore?.user_template || "user-dist",
    }
    const enableResp = await page.request.patch("/api/v1/setting", {
        headers: await csrfHeaders(page),
        data: { ...baseSettings, enable_mcp: true },
    })
    expect(enableResp.ok(), "PATCH /api/v1/setting must succeed to enable MCP for the test").toBeTruthy()

    try {
        const apiResp = await page.request.post("/api/v1/api-tokens", {
            headers: await csrfHeaders(page),
            data: {
                name: `e2e-mcp-${Date.now().toString(36)}`,
                scopes: ["nezha:server:read"],
            },
        })
        expect(apiResp.ok()).toBeTruthy()
        const body = await apiResp.json()
        expect(body.success).toBe(true)
        const token: string = body.data.token
        const tokenID: number = body.data.id
        expect(token).toMatch(/^nzp_/)

        const mcpResp = await page.request.post("/mcp", {
            headers: { Authorization: `Bearer ${token}` },
            data: { jsonrpc: "2.0", id: 1, method: "initialize" },
        })
        expect(mcpResp.ok()).toBeTruthy()
        const mcpBody = await mcpResp.json()
        expect(mcpBody.result?.serverInfo?.name).toBe("nezha-mcp")

        const whoamiResp = await page.request.post("/mcp", {
            headers: { Authorization: `Bearer ${token}` },
            data: {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: { name: "meta.whoami", arguments: {} },
            },
        })
        const whoamiBody = await whoamiResp.json()
        expect(whoamiBody.result?.isError).toBeFalsy()
        expect(whoamiBody.result?.structuredContent?.scopes).toContain("nezha:server:read")

        const delResp = await page.request.delete(`/api/v1/api-tokens/${tokenID}`, {
            headers: await csrfHeaders(page),
        })
        expect(delResp.ok()).toBeTruthy()
    } finally {
        await page.request.patch("/api/v1/setting", {
            headers: await csrfHeaders(page),
            data: { ...baseSettings, enable_mcp: !!settingBefore?.enable_mcp },
        })
    }
})
