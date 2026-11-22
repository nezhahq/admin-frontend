import { FetcherMethod, csrfHeaders, fetcher } from "./api"

// Types mirror the dashboard swagger (pkg/backup + controller/backup.go).

export type BackupTrigger = "manual" | "schedule" | "pre-restore"
export type BackupStatus = "running" | "success" | "failed"

export interface BackupInfo {
    name: string
    size: number
    sha256: string
    trigger: BackupTrigger
    status: BackupStatus
    error?: string
    created_at: string
    nezha_version?: string
    key_id?: string
    key_matches_current: boolean
}

export interface BackupScheduleView {
    enabled: boolean
    cron: string
    retention: number
    next_run_at?: string
}

export type BackupS3Field =
    | "endpoint"
    | "bucket"
    | "region"
    | "prefix"
    | "use_path_style"
    | "access_key_id"
    | "secret_access_key"

export interface BackupS3View {
    endpoint: string
    bucket: string
    region: string
    prefix: string
    use_path_style: boolean
    access_key_id_masked: string
    secret_access_key_set: boolean
    env_locked: string[]
}

export interface BackupEncryptionView {
    key_id: string
    created_at: string
}

export interface BackupConfigView {
    configured: boolean
    storage_configured: boolean
    schedule: BackupScheduleView
    s3: BackupS3View
    encryption: BackupEncryptionView | null
    upload_max_bytes: number
    password_min_length: number
    confirm_word_length: number
    reset_confirm_word: string
}

export interface BackupS3Update {
    endpoint?: string
    bucket?: string
    region?: string
    prefix?: string
    use_path_style?: boolean
    access_key_id?: string
    secret_access_key?: string
}

export interface BackupScheduleUpdate {
    enabled?: boolean
    cron?: string
    retention?: number
}

export interface BackupConfigUpdate {
    schedule?: BackupScheduleUpdate
    s3?: BackupS3Update
}

export interface BackupKeyResponse {
    recovery_key: string
    key_id: string
    created_at: string
}

// Check and warning codes as declared by the dashboard swagger (enum values of
// backup.Check.code and backup.Warning.code). Regenerate from swagger when the
// backend adds a code; the i18n test then fails to type-check until text exists.
export type BackupCheckCode =
    "checksum" | "decrypt" | "payload" | "origin" | "version" | "database_integrity" | "admin_user"

export type BackupWarningCode =
    | "origin_unverified"
    | "pre_restore_skipped"
    | "older_version"
    | "version_unknown"
    | "version_differs"
    | "config_not_in_backup"
    | "tsdb_not_restored"
    | "agents_after_backup_offline"
    | "revoked_credentials_revived"
    | "sessions_cleared"

export interface BackupCheck {
    code: BackupCheckCode
    ok: boolean
    message?: string
}

export interface BackupWarning {
    code: BackupWarningCode
    message?: string
    require_ack: boolean
}

export interface BackupManifestView {
    name?: string
    created_at?: string
    trigger?: BackupTrigger
    nezha_version?: string
    key_id?: string
    tables?: Record<string, number>
    has_config?: boolean
}

export interface RestorePrepareResponse {
    restore_token?: string
    expires_at?: string
    source: "storage" | "upload" | string
    name?: string
    sha256?: string
    confirm_word_length: number
    manifest?: BackupManifestView
    checks: BackupCheck[]
    warnings: BackupWarning[]
    can_apply: boolean
    apply_requires: { login_password: boolean; reauth_needed: boolean }
}

export interface RestoreResult {
    status: "success" | "failed" | string
    name?: string
    sha256?: string
    applied_at?: string
    finished_at?: string
    rolled_back?: boolean
    error?: string
}

/** Either the backup password or the recovery key unlocks a backup. */
export type BackupCredential = { password: string } | { recovery_key: string }

export interface RestoreApplyRequest {
    restore_token: string
    confirm: string
    login_password?: string
    acknowledged: string[]
    password?: string
    recovery_key?: string
}

export const BACKUP_LIST_KEY = "/api/v1/backup"
export const BACKUP_CONFIG_KEY = "/api/v1/backup/config"
export const RESTORE_STATUS_KEY = "/api/v1/backup/restore/status"

export const getBackupConfig = () =>
    fetcher<BackupConfigView>(FetcherMethod.GET, BACKUP_CONFIG_KEY, null)

export const updateBackupConfig = (data: BackupConfigUpdate) =>
    fetcher<BackupConfigView>(FetcherMethod.PATCH, BACKUP_CONFIG_KEY, data)

export const testBackupStorage = (data: BackupS3Update) =>
    fetcher<void>(FetcherMethod.POST, "/api/v1/backup/config/test", data)

export const setBackupPassword = (password: string) =>
    fetcher<BackupKeyResponse>(FetcherMethod.POST, "/api/v1/backup/password", { password })

export const changeBackupPassword = (old_password: string, new_password: string) =>
    fetcher<void>(FetcherMethod.PATCH, "/api/v1/backup/password", { old_password, new_password })

export const resetBackupPassword = (new_password: string, confirm: string) =>
    fetcher<BackupKeyResponse>(FetcherMethod.POST, "/api/v1/backup/password/reset", {
        new_password,
        confirm,
    })

export const listBackups = async () =>
    (await fetcher<BackupInfo[] | null>(FetcherMethod.GET, BACKUP_LIST_KEY, null)) ?? []

export const createBackup = () => fetcher<BackupInfo>(FetcherMethod.POST, BACKUP_LIST_KEY)

export const deleteBackups = (names: string[]) =>
    fetcher<void>(FetcherMethod.POST, "/api/v1/batch-delete/backup", names)

/** Direct link: the browser downloads the encrypted file with the session cookie. */
export const backupDownloadUrl = (name: string) =>
    `/api/v1/backup/${encodeURIComponent(name)}/download`

export const prepareRestore = (name: string, sha256: string, credential: BackupCredential) =>
    fetcher<RestorePrepareResponse>(FetcherMethod.POST, "/api/v1/backup/restore/prepare", {
        name,
        sha256,
        ...credential,
    })

export const applyRestore = (data: RestoreApplyRequest) =>
    fetcher<void>(FetcherMethod.POST, "/api/v1/backup/restore/apply", data)

export const cancelRestore = (token: string) =>
    fetcher<void>(FetcherMethod.DELETE, `/api/v1/backup/restore/${encodeURIComponent(token)}`)

export const getRestoreStatus = () =>
    fetcher<RestoreResult | null>(FetcherMethod.GET, RESTORE_STATUS_KEY, null)

/**
 * Uploads a local .nzbak for a restore check. fetch() cannot report upload
 * progress, so this goes through XMLHttpRequest with the same CSRF header and
 * CommonResponse handling as fetcher().
 */
export function prepareRestoreUpload(
    file: File,
    credential: BackupCredential,
    onProgress?: (loaded: number, total: number) => void,
): Promise<RestorePrepareResponse> {
    const path = "/api/v1/backup/restore/prepare"
    const form = new FormData()
    // Credential fields first: the server reads parts in order and streams the
    // file straight to disk.
    if ("password" in credential) form.append("password", credential.password)
    else form.append("recovery_key", credential.recovery_key)
    form.append("file", file)

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", path)
        for (const [k, v] of Object.entries(csrfHeaders(FetcherMethod.POST, path))) {
            xhr.setRequestHeader(k, v)
        }
        xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) onProgress?.(ev.loaded, ev.total)
        }
        xhr.onerror = () => reject(new Error("network error"))
        xhr.onload = () => {
            let body: { success?: boolean; error?: string; data?: RestorePrepareResponse } | null =
                null
            try {
                body = JSON.parse(xhr.responseText)
            } catch {
                // not JSON (e.g. a proxy error page)
            }
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(body?.error || xhr.statusText || `HTTP ${xhr.status}`))
                return
            }
            if (!body) {
                reject(new Error("invalid server response"))
                return
            }
            if (!body.success) {
                reject(new Error(body.error || "request failed"))
                return
            }
            resolve(body.data as RestorePrepareResponse)
        }
        xhr.send(form)
    })
}

/** Characters the user must type to confirm a restore: the tail of the backup name. */
export function restoreConfirmWord(name: string | undefined, length: number): string {
    if (!name || length <= 0) return ""
    return name.slice(-length)
}

export function formatBytes(n: number | undefined): string {
    if (n === undefined || !Number.isFinite(n)) return "-"
    const units = ["B", "KiB", "MiB", "GiB"]
    let v = n
    let i = 0
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024
        i++
    }
    return `${i === 0 ? v : v.toFixed(1)} ${units[i]}`
}

const HTTPS_RE = /^https:\/\/[^\s/]+/i
const PREFIX_RE = /^[a-zA-Z0-9/_-]*$/

/** Client-side mirror of the server rules; the server remains authoritative. */
export function validateS3Endpoint(v: string): boolean {
    return HTTPS_RE.test(v.trim())
}

export function validateS3Prefix(v: string): boolean {
    return PREFIX_RE.test(v.trim())
}

/**
 * Moving the target (endpoint or bucket) must come with the secret again so
 * a hijacked session cannot point the saved credentials at another server.
 */
export function secretRequired(
    saved: Pick<BackupS3View, "endpoint" | "bucket" | "secret_access_key_set">,
    next: { endpoint: string; bucket: string },
): boolean {
    if (!saved.secret_access_key_set) return true
    const moved =
        (saved.endpoint !== "" && next.endpoint.trim() !== saved.endpoint) ||
        (saved.bucket !== "" && next.bucket.trim() !== saved.bucket)
    return moved
}
