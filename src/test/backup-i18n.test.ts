import en from "@/locales/en/translation.json"
import zhCN from "@/locales/zh-CN/translation.json"
import { expect, test } from "vitest"

// Codes the dashboard returns from the restore check (pkg/backup/restore.go).
// A code without an entry falls back to the server's English message, so keep
// this list in step with the backend.
const CHECK_CODES = [
    "checksum",
    "decrypt",
    "payload",
    "origin",
    "version",
    "database_integrity",
    "admin_user",
]
const WARNING_CODES = [
    "origin_unverified",
    "pre_restore_skipped",
    "older_version",
    "version_unknown",
    "version_differs",
    "config_not_in_backup",
    "tsdb_not_restored",
    "agents_after_backup_offline",
    "revoked_credentials_revived",
    "sessions_cleared",
]

test.each([
    ["en", en],
    ["zh-CN", zhCN],
])("%s has text for every restore check and warning code", (_lang, dict) => {
    const backup = (dict as any).Backup
    for (const code of CHECK_CODES) expect(backup.Check[code], code).toBeTruthy()
    for (const code of WARNING_CODES) expect(backup.Warning[code], code).toBeTruthy()
})
