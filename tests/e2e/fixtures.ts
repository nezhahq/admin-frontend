import { Page, Request, expect, test as base } from "@playwright/test"

export type LoginContext = {
    username: string
    password: string
}

export const defaultAdmin: LoginContext = {
    username: process.env.E2E_ADMIN_USER || "admin",
    password: process.env.E2E_ADMIN_PASS || "admin",
}

export async function loginAs(page: Page, creds: LoginContext) {
    await page.goto("/dashboard/login")
    await page.locator('input[autocomplete="username"]').fill(creds.username)
    await page.locator('input[autocomplete="current-password"]').fill(creds.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/dashboard\/?(?:$|\?|#)/, { timeout: 10_000 })
}

export async function logout(page: Page) {
    await page.context().clearCookies()
}

export async function expectAuthenticated(page: Page) {
    const resp = await page.request.get("/api/v1/profile")
    expect(resp.status(), "profile must respond 2xx while authenticated").toBeLessThan(400)
    const body = await resp.json()
    expect(body.success, "profile.success must be true").toBe(true)
    expect(body.data?.id, "profile.data.id must be present").toBeTruthy()
}

export async function expectUnauthenticated(page: Page) {
    const resp = await page.request.get("/api/v1/profile")
    const body = await resp.json()
    expect(body.success, "profile must NOT be authorized after revoke").not.toBe(true)
    expect(body.error, "profile must surface an error after revoke").toBeTruthy()
}

export async function findRequest(
    page: Page,
    matcher: (req: Request) => boolean,
    trigger: () => Promise<void>,
    timeoutMs = 5000,
): Promise<Request> {
    const waiter = page.waitForRequest(matcher, { timeout: timeoutMs })
    await trigger()
    return await waiter
}

export const test = base.extend<{ adminPage: Page }>({
    adminPage: async ({ page }, use) => {
        await loginAs(page, defaultAdmin)
        await use(page)
    },
})
