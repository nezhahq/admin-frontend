import { FetcherMethod, fetcher } from "./api"

export interface ApiTokenView {
    id: number
    name: string
    scopes: string[]
    server_ids?: number[]
    expires_at?: string
    last_used_at?: string
    last_used_ip?: string
    created_at: string
}

export interface ApiTokenCreateRequest {
    name: string
    scopes: string[]
    server_ids?: number[]
    expires_in_days?: number
}

export interface ApiTokenCreateResponse {
    id: number
    name: string
    token: string
    scopes: string[]
    server_ids?: number[]
    expires_at?: string
}

export const listApiTokens = async (): Promise<ApiTokenView[]> => {
    const tokens = await fetcher<ApiTokenView[]>(FetcherMethod.GET, "/api/v1/api-tokens", null)
    // Go encodes an empty scope slice as JSON null; coerce so callers can map() safely.
    return (tokens ?? []).map((tok) => ({
        ...tok,
        scopes: Array.isArray(tok.scopes) ? tok.scopes : [],
    }))
}

export const createApiToken = async (
    data: ApiTokenCreateRequest,
): Promise<ApiTokenCreateResponse> => {
    return fetcher<ApiTokenCreateResponse>(FetcherMethod.POST, "/api/v1/api-tokens", data)
}

export const deleteApiToken = async (id: number): Promise<void> => {
    return fetcher<void>(FetcherMethod.DELETE, `/api/v1/api-tokens/${id}`, null)
}

export const SCOPE_OPTIONS = [
    { value: "nezha:server:read", label: "Server: read", desc: "List & inspect servers and files" },
    { value: "nezha:server:write", label: "Server: write", desc: "Edit servers, push files" },
    { value: "nezha:server:delete", label: "Server: delete", desc: "Delete servers, files" },
    { value: "nezha:server:exec", label: "Server: exec", desc: "Run shell commands on servers" },
    { value: "nezha:server:*", label: "Server: all", desc: "Every server permission (read+write+delete+exec)" },
    { value: "nezha:service:read", label: "Service monitor: read", desc: "List service monitors & history" },
    { value: "nezha:service:write", label: "Service monitor: write", desc: "Create / edit service monitors" },
    { value: "nezha:service:delete", label: "Service monitor: delete", desc: "Delete service monitors" },
    { value: "nezha:service:*", label: "Service monitor: all", desc: "Every service monitor permission" },
    { value: "nezha:alertrule:read", label: "Alert rule: read", desc: "List alert rules" },
    { value: "nezha:alertrule:write", label: "Alert rule: write", desc: "Create / edit alert rules" },
    { value: "nezha:alertrule:delete", label: "Alert rule: delete", desc: "Delete alert rules" },
    { value: "nezha:alertrule:*", label: "Alert rule: all", desc: "Every alert-rule permission" },
    { value: "nezha:cron:read", label: "Cron: read", desc: "List scheduled tasks" },
    { value: "nezha:cron:write", label: "Cron: write", desc: "Create / edit scheduled tasks" },
    { value: "nezha:cron:delete", label: "Cron: delete", desc: "Delete scheduled tasks" },
    { value: "nezha:cron:exec", label: "Cron: trigger", desc: "Manually trigger scheduled tasks" },
    { value: "nezha:cron:*", label: "Cron: all", desc: "Every cron permission" },
    { value: "nezha:notification:read", label: "Notification: read", desc: "List notifications" },
    { value: "nezha:notification:write", label: "Notification: write", desc: "Create / edit notifications" },
    { value: "nezha:notification:delete", label: "Notification: delete", desc: "Delete notifications" },
    { value: "nezha:notification:*", label: "Notification: all", desc: "Every notification permission" },
    { value: "nezha:notification-group:read", label: "Notification group: read", desc: "List notification groups" },
    { value: "nezha:notification-group:write", label: "Notification group: write", desc: "Create / edit groups" },
    { value: "nezha:notification-group:delete", label: "Notification group: delete", desc: "Delete groups" },
    { value: "nezha:notification-group:*", label: "Notification group: all", desc: "Every notification-group permission" },
    { value: "nezha:ddns:read", label: "DDNS: read", desc: "List DDNS profiles" },
    { value: "nezha:ddns:write", label: "DDNS: write", desc: "Create / edit DDNS profiles" },
    { value: "nezha:ddns:delete", label: "DDNS: delete", desc: "Delete DDNS profiles" },
    { value: "nezha:ddns:*", label: "DDNS: all", desc: "Every DDNS permission" },
    { value: "nezha:nat:read", label: "NAT: read", desc: "List NAT rules" },
    { value: "nezha:nat:write", label: "NAT: write", desc: "Create / edit NAT rules" },
    { value: "nezha:nat:delete", label: "NAT: delete", desc: "Delete NAT rules" },
    { value: "nezha:nat:*", label: "NAT: all", desc: "Every NAT permission" },
    { value: "nezha:transfer:read", label: "Transfer: read", desc: "Read server transfer state" },
    { value: "nezha:transfer:write", label: "Transfer: write", desc: "Cancel / retry transfers" },
    { value: "nezha:transfer:delete", label: "Transfer: delete", desc: "Delete server transfer records" },
    { value: "nezha:transfer:*", label: "Transfer: all", desc: "Every transfer permission" },
    { value: "nezha:admin:*", label: "Admin: all (admin only)", desc: "User / WAF / Setting / Online-user management" },
    { value: "nezha:*", label: "Everything (admin only)", desc: "Full access to all resources" },
] as const

export type Scope = (typeof SCOPE_OPTIONS)[number]["value"]

export type ParseServerIDsResult =
    | { ok: true; value: number[] | undefined }
    | { ok: false; error: string }

export type ParseExpiresInDaysResult =
    | { ok: true; value: number | undefined }
    | { ok: false; error: string }

// Validates the "expires in days" field before it is sent to the backend.
// The backend model field is `ExpiresInDays int`, so a fractional value would
// fail JSON binding; reject it locally. Blank and 0 both mean "never expires"
// (undefined), matching the create handler's `expires_in_days == 0` semantics.
export function parseExpiresInDaysInput(raw: string): ParseExpiresInDaysResult {
    const trimmed = raw.trim()
    if (trimmed === "") return { ok: true, value: undefined }
    if (!/^\d+$/.test(trimmed)) return { ok: false, error: `invalid expiry: ${raw}` }
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n < 0 || n > 3650) {
        return { ok: false, error: `invalid expiry: ${raw}` }
    }
    return { ok: true, value: n > 0 ? n : undefined }
}

export function parseServerIDsInput(raw: string): ParseServerIDsResult {
    const trimmed = raw.trim()
    if (trimmed === "") return { ok: true, value: undefined }
    const parts = trimmed.split(",").map((s) => s.trim())
    const out: number[] = []
    for (const p of parts) {
        if (p === "") return { ok: false, error: "empty server id" }
        if (!/^\d+$/.test(p)) return { ok: false, error: `invalid server id: ${p}` }
        const n = Number(p)
        if (!Number.isInteger(n) || n <= 0) return { ok: false, error: `invalid server id: ${p}` }
        out.push(n)
    }
    return { ok: true, value: out }
}
