import { expect, test } from "vitest"

import { parseExpiresInDaysInput } from "../api/api-tokens"

test("parseExpiresInDaysInput treats blank as 'never expires' (undefined)", () => {
    expect(parseExpiresInDaysInput("")).toEqual({ ok: true, value: undefined })
    expect(parseExpiresInDaysInput("   ")).toEqual({ ok: true, value: undefined })
})

test("parseExpiresInDaysInput accepts whole-number days in range", () => {
    expect(parseExpiresInDaysInput("30")).toEqual({ ok: true, value: 30 })
    expect(parseExpiresInDaysInput(" 3650 ")).toEqual({ ok: true, value: 3650 })
})

test("parseExpiresInDaysInput maps 0 to undefined (never expires)", () => {
    expect(parseExpiresInDaysInput("0")).toEqual({ ok: true, value: undefined })
})

// Backend model field is `ExpiresInDays int` (nezha/model/api_token.go); a
// fractional value would fail JSON binding server-side, so the UI must reject
// it locally rather than send 1.5 and surface a confusing backend error.
test("parseExpiresInDaysInput rejects fractional days", () => {
    expect(parseExpiresInDaysInput("1.5").ok).toBe(false)
})

test("parseExpiresInDaysInput rejects out-of-range and non-numeric input", () => {
    expect(parseExpiresInDaysInput("-1").ok).toBe(false)
    expect(parseExpiresInDaysInput("3651").ok).toBe(false)
    expect(parseExpiresInDaysInput("abc").ok).toBe(false)
})
