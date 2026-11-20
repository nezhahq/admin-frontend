import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { FetcherMethod, fetcher } from "../api/api"

const realFetch = globalThis.fetch

beforeEach(() => {
    Object.defineProperty(document, "cookie", { value: "", configurable: true })
})

afterEach(() => {
    globalThis.fetch = realFetch
    vi.restoreAllMocks()
})

function respondWith(body: string, init: ResponseInit) {
    globalThis.fetch = vi.fn(async () => new Response(body, init)) as unknown as typeof fetch
}

test("a failed request surfaces the error message from the response body", async () => {
    respondWith(JSON.stringify({ success: false, error: "name already exists" }), {
        status: 400,
        statusText: "",
    })

    await expect(fetcher(FetcherMethod.POST, "/api/v1/nat", {})).rejects.toThrow(
        "name already exists",
    )
})

test("a failed request without a usable body falls back to the status text", async () => {
    respondWith("<html>bad gateway</html>", { status: 401, statusText: "Unauthorized" })

    await expect(fetcher(FetcherMethod.GET, "/api/v1/profile")).rejects.toThrow("Unauthorized")
})

test("a failed HTTP/2 request with no status text still reports the status code", async () => {
    respondWith("", { status: 502, statusText: "" })

    await expect(fetcher(FetcherMethod.GET, "/api/v1/profile")).rejects.toThrow("HTTP 502")
})
