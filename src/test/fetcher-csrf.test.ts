import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { FetcherMethod, fetcher } from "../api/api"

const realFetch = globalThis.fetch

function setCookie(value: string) {
    Object.defineProperty(document, "cookie", { value, configurable: true })
}

beforeEach(() => {
    setCookie("")
})

afterEach(() => {
    globalThis.fetch = realFetch
    vi.restoreAllMocks()
})

function jsonOk() {
    return new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    })
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
    const h = init?.headers
    if (!h) return null
    if (h instanceof Headers) return h.get(name)
    const rec = h as Record<string, string>
    const key = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase())
    return key ? rec[key] : null
}

// Backend csrfMiddleware (nezha/cmd/dashboard/controller/csrf.go) enforces a
// double-submit cookie on every cookie-auth unsafe method: it rejects the
// request unless X-CSRF-Token header == nz-csrf cookie. The fetcher must mirror
// the cookie into the header for POST/PATCH/PUT/DELETE.
test("POST sends X-CSRF-Token mirrored from nz-csrf cookie", async () => {
    setCookie("nz-csrf=abc123; other=1")
    const seen: { init?: RequestInit }[] = []
    globalThis.fetch = vi.fn(async (_input: any, init?: RequestInit) => {
        seen.push({ init })
        return jsonOk()
    }) as unknown as typeof fetch

    await fetcher(FetcherMethod.POST, "/api/v1/api-tokens", { name: "x" })

    expect(headerOf(seen[0].init, "X-CSRF-Token")).toBe("abc123")
})

test("DELETE sends X-CSRF-Token mirrored from nz-csrf cookie", async () => {
    setCookie("nz-csrf=del-token")
    const seen: { init?: RequestInit }[] = []
    globalThis.fetch = vi.fn(async (_input: any, init?: RequestInit) => {
        seen.push({ init })
        return jsonOk()
    }) as unknown as typeof fetch

    await fetcher(FetcherMethod.DELETE, "/api/v1/api-tokens/7")

    expect(headerOf(seen[0].init, "X-CSRF-Token")).toBe("del-token")
})

test("auto refresh-token uses POST (backend route is POST)", async () => {
    vi.resetModules()
    const { FetcherMethod: M, fetcher: f } = await import("../api/api")
    setCookie("nz-jwt=sess; nz-csrf=c")
    const seen: { url: string; init?: RequestInit }[] = []
    globalThis.fetch = vi.fn(async (input: any, init?: RequestInit) => {
        seen.push({ url: String(input), init })
        return jsonOk()
    }) as unknown as typeof fetch

    await f(M.GET, "/api/v1/server")

    const refresh = seen.find((s) => s.url.includes("/api/v1/refresh-token"))
    expect(refresh, "auto refresh request should be issued").toBeTruthy()
    expect(refresh!.init?.method).toBe("POST")
})

// Revoke (DELETE) commonly returns 204 / empty body. The fetcher must not
// blow up on response.json() of an empty body and must resolve successfully.
test("DELETE tolerates an empty 204 response body", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch

    await expect(fetcher(FetcherMethod.DELETE, "/api/v1/api-tokens/9")).resolves.toBeUndefined()
})

test("empty 200 body does not throw", async () => {
    globalThis.fetch = vi.fn(
        async () => new Response("", { status: 200 }),
    ) as unknown as typeof fetch

    await expect(fetcher(FetcherMethod.DELETE, "/api/v1/api-tokens/9")).resolves.toBeUndefined()
})
