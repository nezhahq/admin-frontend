import {
    clearMCPOAuthReturn,
    consumeMCPOAuthReturn,
    followMCPOAuthCallback,
    rememberMCPOAuthReturn,
} from "@/lib/mcp-oauth-navigation"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.useRealTimers())

test("restores the full MCP authorization query once after login", () => {
    const path =
        "/dashboard/mcp/authorize?client_id=chatgpt&state=state%2Bvalue&resource=https%3A%2F%2Fpanel.example%2Fmcp"
    rememberMCPOAuthReturn(path)
    expect(consumeMCPOAuthReturn()).toBe(path)
    expect(consumeMCPOAuthReturn()).toBe("/dashboard")
})

test.each([
    "https://attacker.example/dashboard/mcp/authorize?x=1",
    "//attacker.example/dashboard/mcp/authorize?x=1",
    "/dashboard/mcp/authorize/../login?x=1",
    "/dashboard?redirect=https://attacker.example",
    "javascript:alert(1)",
])("does not persist unsafe return target %s", (path) => {
    rememberMCPOAuthReturn(path)
    expect(consumeMCPOAuthReturn()).toBe("/dashboard")
})

test("expired and explicitly cleared authorization returns cannot affect a later login", () => {
    vi.useFakeTimers()
    rememberMCPOAuthReturn("/dashboard/mcp/authorize?state=expired")
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(consumeMCPOAuthReturn()).toBe("/dashboard")
    rememberMCPOAuthReturn("/dashboard/mcp/authorize?state=cleared")
    clearMCPOAuthReturn()
    expect(consumeMCPOAuthReturn()).toBe("/dashboard")
})

test("callback navigation rejects altered origin, path, credentials and schemes", () => {
    for (const callback of [
        "javascript:alert(1)",
        "https://attacker.example/callback",
        "https://chatgpt.com/other",
        "https://evil@chatgpt.com/callback",
        "https://chatgpt.com/callback#secret",
    ]) {
        expect(() => followMCPOAuthCallback(callback, "https://chatgpt.com/callback")).toThrow()
    }
})
