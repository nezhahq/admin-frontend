import { expect, test } from "vitest"

import { parseServerIDsInput } from "../api/api-tokens"

test("parseServerIDsInput returns undefined for empty input", () => {
    expect(parseServerIDsInput("")).toEqual({ ok: true, value: undefined })
    expect(parseServerIDsInput("   ")).toEqual({ ok: true, value: undefined })
})

test("parseServerIDsInput parses valid comma-separated positive ints", () => {
    expect(parseServerIDsInput("1,2,3")).toEqual({ ok: true, value: [1, 2, 3] })
    expect(parseServerIDsInput(" 10 , 11 ")).toEqual({ ok: true, value: [10, 11] })
})

test("parseServerIDsInput rejects any non-numeric token rather than silently dropping it", () => {
    // 历史 UI 把 "1,abc" 静默裁剪为 [1] 再上送，等价于把"输入完整接受"骗给用户。
    // 这条契约要求：任一片段非法 → 整次解析失败，前端必须报错而不是吞掉。
    const r = parseServerIDsInput("1,abc")
    expect(r.ok).toBe(false)
})

test("parseServerIDsInput rejects non-positive ids", () => {
    expect(parseServerIDsInput("0").ok).toBe(false)
    expect(parseServerIDsInput("-3").ok).toBe(false)
    expect(parseServerIDsInput("1.5").ok).toBe(false)
})
