import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { createApiToken, deleteApiToken, listApiTokens } from "../api/api-tokens"

const realFetch = global.fetch

function mockFetch(payload: unknown, ok = true, success = true) {
    global.fetch = vi.fn(async () => {
        return new Response(JSON.stringify({ success, error: success ? "" : "boom", data: payload }), {
            status: ok ? 200 : 500,
            headers: { "Content-Type": "application/json" },
        })
    }) as unknown as typeof fetch
}

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
    global.fetch = realFetch
    vi.restoreAllMocks()
})

test("listApiTokens GETs /api/v1/api-tokens and returns parsed array", async () => {
    const calls: Array<{ url: string; method: string }> = []
    global.fetch = vi.fn(async (input: any, init?: any) => {
        calls.push({ url: String(input), method: String(init?.method ?? "GET") })
        return new Response(
            JSON.stringify({
                success: true,
                data: [
                    {
                        id: 1,
                        name: "claude",
                        scopes: ["nezha:server:read"],
                        created_at: "2025-01-01T00:00:00Z",
                    },
                ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        )
    }) as unknown as typeof fetch

    const got = await listApiTokens()
    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe("GET")
    expect(calls[0].url).toContain("/api/v1/api-tokens")
    expect(got).toHaveLength(1)
    expect(got[0].name).toBe("claude")
    expect(got[0].scopes).toContain("nezha:server:read")
})

test("createApiToken POSTs /api/v1/api-tokens and serializes scopes / server_ids / expires_in_days", async () => {
    let captured: { url: string; method: string; body: any } | null = null
    global.fetch = vi.fn(async (input: any, init?: any) => {
        captured = {
            url: String(input),
            method: String(init?.method ?? ""),
            body: init?.body ? JSON.parse(init.body as string) : null,
        }
        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    id: 2,
                    name: "x",
                    token: "nzp_FAKEABC",
                    scopes: ["nezha:server:read", "nezha:server:write"],
                    server_ids: [10, 11],
                    expires_at: "2026-01-01T00:00:00Z",
                },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        )
    }) as unknown as typeof fetch

    const res = await createApiToken({
        name: "x",
        scopes: ["nezha:server:read", "nezha:server:write"],
        server_ids: [10, 11],
        expires_in_days: 30,
    })
    expect(res.token).toBe("nzp_FAKEABC")
    expect(captured).not.toBeNull()
    expect(captured!.method).toBe("POST")
    expect(captured!.url).toContain("/api/v1/api-tokens")
    expect(captured!.body.name).toBe("x")
    expect(captured!.body.scopes).toEqual(["nezha:server:read", "nezha:server:write"])
    expect(captured!.body.server_ids).toEqual([10, 11])
    expect(captured!.body.expires_in_days).toBe(30)
})

test("createApiToken surfaces server error via thrown Error", async () => {
    mockFetch(null, true, false)
    await expect(
        createApiToken({ name: "x", scopes: ["nezha:server:read"] }),
    ).rejects.toThrow("boom")
})

test("listApiTokens normalizes null scopes to an empty array so the table cannot crash", async () => {
    // Backend APIToken.Scopes() returns nil for ScopesCSV=="" which JSON-encodes
    // as null; migrated/legacy/hand-edited rows hit this. Without normalization
    // the list page does tok.scopes.map(...) on null and the whole page crashes.
    global.fetch = vi.fn(async () => {
        return new Response(
            JSON.stringify({
                success: true,
                data: [
                    { id: 1, name: "legacy", scopes: null, created_at: "2025-01-01T00:00:00Z" },
                ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        )
    }) as unknown as typeof fetch

    const got = await listApiTokens()
    expect(Array.isArray(got[0].scopes)).toBe(true)
    expect(got[0].scopes).toEqual([])
})

test("deleteApiToken DELETEs /api/v1/api-tokens/:id", async () => {
    const calls: Array<{ url: string; method: string }> = []
    global.fetch = vi.fn(async (input: any, init?: any) => {
        calls.push({ url: String(input), method: String(init?.method ?? "GET") })
        return new Response(JSON.stringify({ success: true, data: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })
    }) as unknown as typeof fetch

    await deleteApiToken(42)
    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe("DELETE")
    expect(calls[0].url).toContain("/api/v1/api-tokens/42")
})
