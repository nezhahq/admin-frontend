import { expect } from "@playwright/test"

import { csrfRequest, defaultAdmin, expectAuthenticated, expectUnauthenticated, loginAs, test } from "./fixtures"

test("login persists session via cookie and getProfile succeeds", async ({ page }) => {
    await loginAs(page, defaultAdmin)
    await expectAuthenticated(page)
})

test("password change rotates TokenVersion and revokes existing session", async ({ page }) => {
    await loginAs(page, defaultAdmin)

    const originalCookies = await page.context().cookies()
    const originalJWT = originalCookies.find((c) => c.name === "nz-jwt")?.value
    expect(originalJWT, "login must set nz-jwt cookie").toBeTruthy()

    const newPassword = `e2e-${Date.now().toString(36)}`
    let isOnNewPassword = false
    try {
        const resp = await csrfRequest(page, "post", "/api/v1/profile", {
            data: {
                original_password: defaultAdmin.password,
                new_password: newPassword,
                new_username: defaultAdmin.username,
                reject_password: false,
            },
        })
        expect(resp.ok(), "profile update must succeed").toBeTruthy()
        isOnNewPassword = true

        await page.context().clearCookies()
        if (originalJWT) {
            await page.context().addCookies([
                {
                    name: "nz-jwt",
                    value: originalJWT,
                    url: page.url() || "http://localhost:5173",
                },
            ])
        }
        await expectUnauthenticated(page)
    } finally {
        if (isOnNewPassword) {
            await page.context().clearCookies()
            await loginAs(page, { username: defaultAdmin.username, password: newPassword })
            const restoreResp = await csrfRequest(page, "post", "/api/v1/profile", {
                data: {
                    original_password: newPassword,
                    new_password: defaultAdmin.password,
                    new_username: defaultAdmin.username,
                    reject_password: false,
                },
            })
            expect(restoreResp.ok(), "password restore must succeed so other suites can still log in").toBeTruthy()
        }
    }
})
