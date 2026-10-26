import { expect } from "@playwright/test"

import { csrfRequest, test } from "./fixtures"

test("administrator can save, reload and clear member NAT domains", async ({ adminPage: page }) => {
    const settingsResponse = await page.request.get("/api/v1/setting")
    expect(settingsResponse.ok()).toBe(true)
    const settingsBody = await settingsResponse.json()
    expect(settingsBody.success).toBe(true)
    const original = settingsBody.data.config
    try {
        await page.goto("/dashboard/settings")
        const domains = page.getByLabel(/Member NAT domains|成员 NAT 域名名单/)
        const dashboardHost = page.getByLabel(/Dashboard public host|面板对外域名/)
        await dashboardHost.fill("panel.example.com")
        await domains.fill("TUNNEL.example.com.\nfiles.example.com")
        const saved = page.waitForResponse(
            (response) =>
                response.url().endsWith("/api/v1/setting") &&
                response.request().method() === "PATCH",
        )
        await page.getByRole("button", { name: /Confirm|确认/ }).click()
        expect((await (await saved).json()).success).toBe(true)
        await page.reload()
        await expect(domains).toHaveValue("tunnel.example.com\nfiles.example.com")
        await domains.fill("")
        const cleared = page.waitForResponse(
            (response) =>
                response.url().endsWith("/api/v1/setting") &&
                response.request().method() === "PATCH",
        )
        await page.getByRole("button", { name: /Confirm|确认/ }).click()
        const clearResponse = await cleared
        expect(clearResponse.request().postDataJSON().nat_member_domains).toEqual([])
        expect((await clearResponse.json()).success).toBe(true)
        await page.reload()
        await expect(domains).toHaveValue("")
    } finally {
        const restored = await csrfRequest(page, "patch", "/api/v1/setting", {
            data: { ...original, nat_member_domains: original.nat_member_domains ?? [] },
        })
        expect(restored.ok()).toBe(true)
        expect((await restored.json()).success).toBe(true)
    }
})
