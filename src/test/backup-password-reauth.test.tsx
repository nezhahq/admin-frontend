import type { BackupConfigView } from "@/api/backup"
import {
    ResetBackupPasswordDialog,
    SetBackupPasswordForm,
    passwordProblem,
} from "@/components/backup/password"
import { RestoreDialog } from "@/components/backup/restore-dialog"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    auth: {
        profile: { role: 0, reject_password: false } as { role: number; reject_password: boolean },
    },
    set: vi.fn(),
    reset: vi.fn(),
    prepare: vi.fn(),
    cancel: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ ...mocks.auth, logout: vi.fn() }) }))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            options && "backup" in options
                ? `${key} [${options.backup} -> ${options.current}]`
                : key,
    }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/api/backup", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/api/backup")>()),
    setBackupPassword: mocks.set,
    resetBackupPassword: mocks.reset,
    prepareRestore: mocks.prepare,
    cancelRestore: mocks.cancel,
}))

const config = { password_min_length: 12 } as BackupConfigView

beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth = { profile: { role: 0, reject_password: false } }
    mocks.cancel.mockResolvedValue(undefined)
})
afterEach(cleanup)

// The dashboard counts characters (runes); String.length counts UTF-16 units,
// so six emoji passed the 12-character check here and failed on the server.
test("password length counts characters, not UTF-16 units", () => {
    const emoji = "\u{1F512}".repeat(6)
    expect(passwordProblem(emoji, emoji, 12)).toBe("Backup.Password.TooShort")
    const twelve = "\u{1F512}".repeat(12)
    expect(passwordProblem(twelve, twelve, 12)).toBeNull()
})

function fillNewPassword(prefix = "") {
    const fields = screen.getAllByLabelText("Backup.Password.New")
    fireEvent.change(fields[fields.length - 1], {
        target: { value: prefix + "correct horse battery" },
    })
    const confirms = screen.getAllByLabelText("Backup.Password.Confirm")
    fireEvent.change(confirms[confirms.length - 1], {
        target: { value: prefix + "correct horse battery" },
    })
}

test("setting the backup password sends the login password", async () => {
    mocks.set.mockResolvedValue({ recovery_key: "AGE-SECRET-KEY-1X", key_id: "k", created_at: "" })
    render(<SetBackupPasswordForm config={config} onKeyCreated={vi.fn()} />)
    fillNewPassword()
    fireEvent.click(screen.getByRole("button", { name: "Backup.Password.Set" }))
    expect(mocks.set).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Backup.Password.LoginPassword"), {
        target: { value: "login password" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Password.Set" }))
    await waitFor(() =>
        expect(mocks.set).toHaveBeenCalledWith("correct horse battery", "login password"),
    )
})

test("OAuth-only administrators are not asked for a login password", async () => {
    mocks.auth = { profile: { role: 0, reject_password: true } }
    mocks.set.mockResolvedValue({ recovery_key: "AGE-SECRET-KEY-1X", key_id: "k", created_at: "" })
    render(<SetBackupPasswordForm config={config} onKeyCreated={vi.fn()} />)
    expect(screen.queryByLabelText("Backup.Password.LoginPassword")).toBeNull()
    fillNewPassword()
    fireEvent.click(screen.getByRole("button", { name: "Backup.Password.Set" }))
    await waitFor(() => expect(mocks.set).toHaveBeenCalledWith("correct horse battery", undefined))
})

test("resetting the backup password sends the login password", async () => {
    mocks.reset.mockResolvedValue({
        recovery_key: "AGE-SECRET-KEY-1X",
        key_id: "k",
        created_at: "",
    })
    render(
        <ResetBackupPasswordDialog
            open
            onOpenChange={vi.fn()}
            minLength={12}
            confirmWord="RESET"
            affectedBackups={1}
            onReset={vi.fn()}
        />,
    )
    fillNewPassword()
    fireEvent.change(screen.getByLabelText("Backup.Password.ResetTypeWord"), {
        target: { value: "RESET" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Password.LoginPassword"), {
        target: { value: "login password" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Password.ResetSubmit" }))
    await waitFor(() =>
        expect(mocks.reset).toHaveBeenCalledWith(
            "correct horse battery",
            "RESET",
            "login password",
        ),
    )
})

test("version warnings show both versions", async () => {
    mocks.prepare.mockResolvedValue({
        restore_token: "tok-1",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        source: "storage",
        name: "nezha-backup-20261121-030000-schedule-a1b2c3",
        sha256: "ab".repeat(32),
        confirm_word_length: 6,
        checks: [{ code: "version", ok: true }],
        warnings: [
            {
                code: "older_version",
                require_ack: false,
                message: "The backup was made by v1.2.3; ...",
                backup_version: "v1.2.3",
                dashboard_version: "v1.3.0",
            },
        ],
        can_apply: true,
        apply_requires: { login_password: true, reauth_needed: false },
    })
    render(
        <RestoreDialog
            source={{
                kind: "storage",
                backup: {
                    name: "nezha-backup-20261121-030000-schedule-a1b2c3",
                    size: 1,
                    sha256: "ab".repeat(32),
                    trigger: "schedule",
                    status: "success",
                    created_at: "2026-11-21T03:00:00Z",
                    key_matches_current: true,
                },
            }}
            uploadMaxBytes={1 << 20}
            onClose={vi.fn()}
            onApplied={vi.fn()}
        />,
    )
    fireEvent.change(screen.getByLabelText("Backup.Restore.BackupPassword"), {
        target: { value: "correct horse battery" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Restore.Check" }))
    expect(await screen.findByText("Backup.Warning.older_version [v1.2.3 -> v1.3.0]")).toBeTruthy()
})
