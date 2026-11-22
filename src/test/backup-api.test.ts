import {
    backupDownloadUrl,
    deleteBackups,
    formatBytes,
    listBackups,
    prepareRestoreUpload,
    restoreConfirmWord,
    secretRequired,
    updateBackupConfig,
    validateS3Endpoint,
    validateS3Prefix,
} from "@/api/backup"
import { passwordProblem } from "@/components/backup/password"
import { waitForRestart } from "@/components/backup/restart-overlay"
import {
    isRestoreTokenError,
    restoreErrorText,
    toCredential,
} from "@/components/backup/restore-dialog"
import { looksLikeCron6, parseRetention } from "@/components/backup/schedule-form"
import { afterEach, expect, test, vi } from "vitest"

const realFetch = globalThis.fetch
const realXHR = globalThis.XMLHttpRequest

afterEach(() => {
    globalThis.fetch = realFetch
    globalThis.XMLHttpRequest = realXHR
    document.cookie = "nz-csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
    vi.restoreAllMocks()
})

function captureFetch(data: unknown = null) {
    const calls: Array<{ url: string; method: string; body: unknown; headers: any }> = []
    globalThis.fetch = vi.fn(async (input: any, init?: any) => {
        calls.push({
            url: String(input),
            method: String(init?.method ?? "GET"),
            body: init?.body ? JSON.parse(init.body) : undefined,
            headers: init?.headers ?? {},
        })
        return new Response(JSON.stringify({ success: true, data }), { status: 200 })
    }) as unknown as typeof fetch
    return calls
}

test("secret is required when the target moves, not for other edits", () => {
    const saved = { endpoint: "https://s3.example.com", bucket: "b", secret_access_key_set: true }
    expect(secretRequired(saved, { endpoint: "https://s3.example.com", bucket: "b" })).toBe(false)
    expect(secretRequired(saved, { endpoint: " https://s3.example.com ", bucket: "b" })).toBe(false)
    expect(secretRequired(saved, { endpoint: "https://evil.example.com", bucket: "b" })).toBe(true)
    expect(secretRequired(saved, { endpoint: "https://s3.example.com", bucket: "other" })).toBe(
        true,
    )
    // Nothing saved yet: the first save always needs it.
    expect(
        secretRequired(
            { endpoint: "", bucket: "", secret_access_key_set: false },
            { endpoint: "https://s3.example.com", bucket: "b" },
        ),
    ).toBe(true)
})

test("client-side validation mirrors the server rules", () => {
    expect(validateS3Endpoint("https://x.r2.cloudflarestorage.com")).toBe(true)
    expect(validateS3Endpoint("http://127.0.0.1:9000")).toBe(false)
    expect(validateS3Endpoint("https://")).toBe(false)
    expect(validateS3Prefix("nezha-backup/panel_1/")).toBe(true)
    expect(validateS3Prefix("../x")).toBe(false)
    expect(validateS3Prefix("a b")).toBe(false)
    expect(passwordProblem("short", "short", 12)).toBe("Backup.Password.TooShort")
    expect(passwordProblem("long-enough-pw", "long-enough-pX", 12)).toBe("Backup.Password.Mismatch")
    expect(passwordProblem("long-enough-pw", "long-enough-pw", 12)).toBeNull()
    expect(looksLikeCron6("0 0 3 * * *")).toBe(true)
    expect(looksLikeCron6("0 3 * * *")).toBe(false)
    expect(parseRetention("7")).toBe(7)
    expect(parseRetention("0")).toBeNull()
    expect(parseRetention("101")).toBeNull()
    expect(parseRetention("1.5")).toBeNull()
})

test("helpers for names, sizes and credentials", () => {
    expect(restoreConfirmWord("nezha-backup-20261121-030000-schedule-a1b2c3", 6)).toBe("a1b2c3")
    expect(restoreConfirmWord(undefined, 6)).toBe("")
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(1536)).toBe("1.5 KiB")
    expect(backupDownloadUrl("a/../b")).toBe("/api/v1/backup/a%2F..%2Fb/download")
    expect(toCredential("password", " pw ")).toEqual({ password: " pw " })
    expect(toCredential("recovery_key", " AGE-SECRET-KEY-1X \n")).toEqual({
        recovery_key: "AGE-SECRET-KEY-1X",
    })
    // The flow keys on the fixed prefix only, never on the (translatable) text.
    expect(isRestoreTokenError("ApiErrorRestoreToken: 恢复令牌无效或已过期，请重新检查")).toBe(true)
    expect(isRestoreTokenError("ApiErrorRestoreToken")).toBe(true)
    expect(isRestoreTokenError("restore token is invalid or expired; run the check again")).toBe(
        false,
    )
    expect(restoreErrorText("ApiErrorRestoreToken: 恢复令牌无效或已过期")).toBe(
        "恢复令牌无效或已过期",
    )
    expect(restoreErrorText("ApiErrorRestoreToken")).toBe("ApiErrorRestoreToken")
    expect(restoreErrorText("wrong login password")).toBe("wrong login password")
    expect(isRestoreTokenError("wrong login password")).toBe(false)
})

test("list, delete and config calls use the agreed endpoints", async () => {
    let calls = captureFetch(null)
    expect(await listBackups()).toEqual([])
    expect(calls[0]).toMatchObject({ method: "GET" })
    expect(calls[0].url).toContain("/api/v1/backup")

    document.cookie = "nz-csrf=tok; path=/"
    calls = captureFetch(null)
    await deleteBackups(["n1", "n2"])
    expect(calls[0]).toMatchObject({
        url: "/api/v1/batch-delete/backup",
        method: "POST",
        body: ["n1", "n2"],
    })
    expect(calls[0].headers["X-CSRF-Token"]).toBe("tok")

    calls = captureFetch({})
    await updateBackupConfig({ s3: { bucket: "b" } })
    expect(calls[0]).toMatchObject({
        url: "/api/v1/backup/config",
        method: "PATCH",
        body: { s3: { bucket: "b" } },
    })
})

class FakeXHR {
    static last: FakeXHR | null = null
    method = ""
    url = ""
    headers: Record<string, string> = {}
    body: FormData | null = null
    status = 200
    statusText = "OK"
    responseText = ""
    upload: { onprogress: ((ev: any) => void) | null } = { onprogress: null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor() {
        FakeXHR.last = this
    }
    open(method: string, url: string) {
        this.method = method
        this.url = url
    }
    setRequestHeader(k: string, v: string) {
        this.headers[k] = v
    }
    send(body: FormData) {
        this.body = body
    }
}

test("upload restore sends multipart with CSRF and parses CommonResponse", async () => {
    document.cookie = "nz-csrf=tok; path=/"
    globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest
    const progress = vi.fn()
    const file = new File(["data"], "b.nzbak")
    const p = prepareRestoreUpload(file, { password: "example-password" }, progress)
    const xhr = FakeXHR.last as FakeXHR
    expect(xhr.method).toBe("POST")
    expect(xhr.url).toBe("/api/v1/backup/restore/prepare")
    expect(xhr.headers["X-CSRF-Token"]).toBe("tok")
    const keys = [...(xhr.body as FormData).keys()]
    // credential before the file so the server has it once the stream ends
    expect(keys).toEqual(["password", "file"])
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 4 })
    expect(progress).toHaveBeenCalledWith(2, 4)
    xhr.responseText = JSON.stringify({ success: true, data: { can_apply: true } })
    xhr.onload?.()
    await expect(p).resolves.toEqual({ can_apply: true })

    const p2 = prepareRestoreUpload(file, { recovery_key: "AGE-SECRET-KEY-1X" })
    const xhr2 = FakeXHR.last as FakeXHR
    expect([...(xhr2.body as FormData).keys()]).toEqual(["recovery_key", "file"])
    xhr2.status = 403
    xhr2.statusText = ""
    xhr2.responseText = JSON.stringify({ success: false, error: "csrf token mismatch" })
    xhr2.onload?.()
    await expect(p2).rejects.toThrow("csrf token mismatch")

    const p3 = prepareRestoreUpload(file, { password: "x" })
    const xhr3 = FakeXHR.last as FakeXHR
    xhr3.responseText = JSON.stringify({ success: false, error: "wrong backup password" })
    xhr3.onload?.()
    await expect(p3).rejects.toThrow("wrong backup password")
})

test("waitForRestart waits for the old process to go down, then for it to come back", async () => {
    const seq = [true, false, false, true]
    const probe = vi.fn(async () => seq.shift() ?? true)
    await expect(waitForRestart({ probe, intervalMs: 1, downGraceMs: 10000 })).resolves.toBe(true)
    expect(probe).toHaveBeenCalledTimes(4)

    // Never goes down within the grace period: assume it restarted already.
    const up = vi.fn(async () => true)
    await expect(waitForRestart({ probe: up, intervalMs: 1, downGraceMs: 0 })).resolves.toBe(true)

    const down = vi.fn(async () => false)
    await expect(
        waitForRestart({ probe: down, intervalMs: 1, downGraceMs: 0, timeoutMs: 20 }),
    ).resolves.toBe(false)
})
