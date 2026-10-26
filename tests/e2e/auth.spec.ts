import { expect } from "@playwright/test"

import {
    csrfRequest,
    defaultAdmin,
    expectAuthenticated,
    expectUnauthenticated,
    loginAs,
    test,
} from "./fixtures"

test("login persists session via cookie and getProfile succeeds", async ({ page }) => {
    await loginAs(page, defaultAdmin)
    await expectAuthenticated(page)
})

test("password change rotates TokenVersion and revokes existing session", async ({
    page,
    browser,
}) => {
    await loginAs(page, defaultAdmin)
    // Use an isolated account: the bootstrap password may be shorter than the
    // new password policy, so restoring admin/admin is no longer a valid update.
    const account = {
        username: `session-revocation-${Date.now().toString(36)}`,
        password: "session-original-password",
    }
    const created = await csrfRequest(page, "post", "/api/v1/user", {
        data: { ...account, role: 1 },
    })
    expect(created.ok()).toBe(true)
    const createdBody = await created.json()
    expect(createdBody.success).toBe(true)
    expect(createdBody.data).toBeGreaterThan(0)
    const memberContext = await browser.newContext()
    try {
        const memberPage = await memberContext.newPage()
        await loginAs(memberPage, account)
        const originalCookies = await memberContext.cookies()
        const originalJWT = originalCookies.find((cookie) => cookie.name === "nz-jwt")?.value
        expect(originalJWT, "login must set nz-jwt cookie").toBeTruthy()
        const newPassword = "session-replacement-password"
        const response = await csrfRequest(memberPage, "post", "/api/v1/profile", {
            data: {
                original_password: account.password,
                new_password: newPassword,
                new_username: account.username,
                reject_password: false,
            },
        })
        expect(response.ok()).toBe(true)
        expect((await response.json()).success, "the password change must actually commit").toBe(
            true,
        )
        await memberContext.clearCookies()
        await memberContext.addCookies([
            { name: "nz-jwt", value: originalJWT!, url: memberPage.url() },
        ])
        await expectUnauthenticated(memberPage)
        await memberContext.clearCookies()
        await loginAs(memberPage, { username: account.username, password: newPassword })
        await expectAuthenticated(memberPage)
    } finally {
        await memberContext.close()
        const deleted = await csrfRequest(page, "post", "/api/v1/batch-delete/user", {
            data: [createdBody.data],
        })
        expect(deleted.ok()).toBe(true)
        expect((await deleted.json()).success).toBe(true)
    }
})
