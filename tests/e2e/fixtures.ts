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
    // Block until the signed nz-csrf cookie is readable. csrfHeaders() reads it
    // synchronously; without this wait a mutating request fired right after
    // login can race the Set-Cookie and send no token, getting a 403.
    await expect
        .poll(async () => (await page.context().cookies()).some((c) => c.name === "nz-csrf"), {
            timeout: 10_000,
        })
        .toBe(true)
}

export async function logout(page: Page) {
    await page.context().clearCookies()
}

// csrfHeaders mirrors the signed nz-csrf cookie into the X-CSRF-Token header.
// The backend's double-submit CSRF gate rejects unsafe methods unless the two
// match; the SPA does this in api.ts, but page.request bypasses that JS, so
// E2E mutating calls must replicate it or every POST/PATCH/DELETE gets 403.
export async function csrfHeaders(page: Page): Promise<Record<string, string>> {
    let value = ""
    await expect
        .poll(
            async () => {
                value = (await page.context().cookies()).find((c) => c.name === "nz-csrf")?.value ?? ""
                return value
            },
            { timeout: 10_000 },
        )
        .not.toBe("")
    return { "X-CSRF-Token": value }
}

// csrfRequest issues a mutating request with the X-CSRF-Token header, retrying
// once if the backend re-mints the nz-csrf cookie between read and send. A
// password change triggers a refresh-token that rotates the cookie, so a single
// read can race the new value and 403; re-reading on 403 closes that window.
export async function csrfRequest(
    page: Page,
    method: "post" | "patch" | "delete" | "put",
    url: string,
    options: { data?: unknown; failOnStatusCode?: boolean } = {},
): Promise<import("@playwright/test").APIResponse> {
    let resp = await page.request[method](url, {
        ...options,
        headers: await csrfHeaders(page),
    })
    if (resp.status() === 403) {
        resp = await page.request[method](url, {
            ...options,
            headers: await csrfHeaders(page),
        })
    }
    return resp
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
