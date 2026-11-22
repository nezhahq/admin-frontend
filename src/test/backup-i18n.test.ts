import type { BackupCheckCode, BackupWarningCode } from "@/api/backup"
import en from "@/locales/en/translation.json"
import zhCN from "@/locales/zh-CN/translation.json"
import zhTW from "@/locales/zh-TW/translation.json"
import { expect, test } from "vitest"

// Record<Code, true> makes the compiler require every code of the swagger
// enum: a code added by the backend fails type-checking here until it is
// listed, and the test below then demands text for it in each language.
const CHECK_CODES: Record<BackupCheckCode, true> = {
    checksum: true,
    decrypt: true,
    payload: true,
    origin: true,
    version: true,
    database_integrity: true,
    admin_user: true,
}
const WARNING_CODES: Record<BackupWarningCode, true> = {
    origin_unverified: true,
    pre_restore_skipped: true,
    older_version: true,
    version_unknown: true,
    version_differs: true,
    config_not_in_backup: true,
    tsdb_not_restored: true,
    agents_after_backup_offline: true,
    revoked_credentials_revived: true,
    sessions_cleared: true,
}

function leafKeys(o: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object"
            ? leafKeys(v as Record<string, unknown>, `${prefix}${k}.`)
            : [`${prefix}${k}`],
    )
}

test.each([
    ["en", en],
    ["zh-CN", zhCN],
    ["zh-TW", zhTW],
])("%s has text for every restore check and warning code", (_lang, dict) => {
    const backup = (dict as any).Backup
    for (const code of Object.keys(CHECK_CODES)) expect(backup.Check[code], code).toBeTruthy()
    for (const code of Object.keys(WARNING_CODES)) expect(backup.Warning[code], code).toBeTruthy()
})

test.each([
    ["zh-CN", zhCN],
    ["zh-TW", zhTW],
])("%s covers every backup text key of en", (_lang, dict) => {
    const want = leafKeys((en as any).Backup).sort()
    expect(leafKeys((dict as any).Backup).sort()).toEqual(want)
})
