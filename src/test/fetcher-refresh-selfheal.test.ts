import { afterEach, beforeEach, expect, test, vi } from "vitest"

const realFetch = global.fetch

function setCookie(value: string) {
    Object.defineProperty(document, "cookie", { value, configurable: true })
}

function jsonOk() {
    return new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    })
}

beforeEach(() => {
    setCookie("")
    vi.resetModules()
})

afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
})

// Auto-refresh is a POST behind the CSRF gate. When the session still lacks the
// nz-csrf cookie (e.g. just upgraded), firing the refresh without a header only
// burns the 1h throttle window and 403s. The refresh must instead wait until a
// CSRF token is available so it can actually succeed once the cookie is seeded.
test("auto refresh is deferred while nz-csrf cookie is missing", async () => {
    const { FetcherMethod, fetcher } = await import("../api/api")
    setCookie("nz-jwt=session") // jwt present, but no nz-csrf yet
    const urls: string[] = []
    global.fetch = vi.fn(async (input: any) => {
        urls.push(String(input))
        return jsonOk()
    }) as unknown as typeof fetch

    await fetcher(FetcherMethod.GET, "/api/v1/server")

    expect(urls.some((u) => u.includes("/api/v1/refresh-token"))).toBe(false)
})

// Once the cookie exists, the next GET must be allowed to fire the refresh —
// proving the missing-cookie skip did not permanently consume the throttle.
test("auto refresh fires after nz-csrf cookie becomes available", async () => {
    const { FetcherMethod, fetcher } = await import("../api/api")
    const urls: string[] = []
    global.fetch = vi.fn(async (input: any) => {
        urls.push(String(input))
        return jsonOk()
    }) as unknown as typeof fetch

    setCookie("nz-jwt=session") // first GET: no csrf, refresh skipped
    await fetcher(FetcherMethod.GET, "/api/v1/server")
    expect(urls.some((u) => u.includes("/api/v1/refresh-token"))).toBe(false)

    setCookie("nz-jwt=session; nz-csrf=seeded") // backend seeded it
    await fetcher(FetcherMethod.GET, "/api/v1/server")
    expect(urls.some((u) => u.includes("/api/v1/refresh-token"))).toBe(true)
})
