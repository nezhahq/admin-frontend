import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { FetcherMethod, fetcher } from "../api/api"

const realFetch = global.fetch

beforeEach(() => {
    // Avoid the auto refresh-token branch interfering with assertions.
    Object.defineProperty(document, "cookie", { value: "", configurable: true })
})

afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
})

// Regression: fetcher used to collapse GET and DELETE into the same HTTP GET,
// so DELETE callers (e.g. revoke API token) never actually hit the backend
// DELETE route. The wire-level method must match the requested FetcherMethod.
test("fetcher uses HTTP DELETE for FetcherMethod.DELETE", async () => {
    const seen: { url: string; init?: RequestInit }[] = []
    global.fetch = vi.fn(async (input: any, init?: RequestInit) => {
        seen.push({ url: String(input), init })
        return new Response(JSON.stringify({ success: true, data: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })
    }) as unknown as typeof fetch

    await fetcher(FetcherMethod.DELETE, "/api/v1/api-tokens/42")

    expect(seen).toHaveLength(1)
    expect(seen[0].init?.method).toBe("DELETE")
    expect(seen[0].url).toContain("/api/v1/api-tokens/42")
})
