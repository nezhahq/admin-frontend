import type { BackupInfo, RestorePrepareResponse } from "@/api/backup"
import { RestoreDialog } from "@/components/backup/restore-dialog"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    prepare: vi.fn(),
    upload: vi.fn(),
    apply: vi.fn(),
    cancel: vi.fn(),
    logout: vi.fn(),
    error: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ logout: mocks.logout }) }))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
}))
vi.mock("sonner", () => ({
    toast: Object.assign(vi.fn(), { success: vi.fn(), error: mocks.error }),
}))
vi.mock("@/api/backup", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/api/backup")>()),
    prepareRestore: mocks.prepare,
    prepareRestoreUpload: mocks.upload,
    applyRestore: mocks.apply,
    cancelRestore: mocks.cancel,
}))

const NAME = "nezha-backup-20261121-030000-schedule-a1b2c3"
const backup: BackupInfo = {
    name: NAME,
    size: 2048,
    sha256: "ab".repeat(32),
    trigger: "schedule",
    status: "success",
    created_at: "2026-11-21T03:00:00Z",
    key_matches_current: true,
}

function prepared(over: Partial<RestorePrepareResponse> = {}): RestorePrepareResponse {
    return {
        restore_token: "tok-1",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        source: "storage",
        name: NAME,
        sha256: backup.sha256,
        confirm_word_length: 6,
        manifest: { created_at: "2026-11-21T03:00:00Z", tables: { users: 1 }, has_config: true },
        checks: [
            { code: "checksum", ok: true },
            { code: "decrypt", ok: true },
        ],
        warnings: [
            { code: "tsdb_not_restored", require_ack: false },
            { code: "origin_unverified", require_ack: true },
        ],
        can_apply: true,
        apply_requires: { login_password: true, reauth_needed: false },
        ...over,
    }
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.cancel.mockResolvedValue(undefined)
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

function renderDialog(
    source: Parameters<typeof RestoreDialog>[0]["source"] = { kind: "storage", backup },
) {
    const onClose = vi.fn()
    const onApplied = vi.fn()
    const utils = render(
        <RestoreDialog
            source={source}
            uploadMaxBytes={1024}
            onClose={onClose}
            onApplied={onApplied}
        />,
    )
    return { ...utils, onClose, onApplied }
}

async function runCheck(password = "backup-password-1") {
    fireEvent.change(screen.getByLabelText("Backup.Restore.BackupPassword"), {
        target: { value: password },
    })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Restore.Check" }))
    await screen.findByTestId("restore-check-result")
}

const next = () => screen.getByRole("button", { name: "Backup.Restore.Next" }) as HTMLButtonElement

test("check binds the selected backup by name and sha256", async () => {
    mocks.prepare.mockResolvedValue(prepared())
    renderDialog()
    await runCheck()
    expect(mocks.prepare).toHaveBeenCalledWith(NAME, backup.sha256, {
        password: "backup-password-1",
    })
})

test("warnings that need acknowledgement block the next step until checked", async () => {
    mocks.prepare.mockResolvedValue(prepared())
    renderDialog()
    await runCheck()
    expect(screen.getByText("Backup.Warning.tsdb_not_restored")).toBeTruthy()
    expect(next().disabled).toBe(true)
    fireEvent.click(screen.getByRole("checkbox", { name: "Backup.Restore.Acknowledge" }))
    expect(next().disabled).toBe(false)
})

test("a failed check cannot proceed", async () => {
    mocks.prepare.mockResolvedValue(
        prepared({
            restore_token: undefined,
            expires_at: undefined,
            can_apply: false,
            checks: [{ code: "origin", ok: false, message: "authentication code mismatch" }],
            warnings: [],
        }),
    )
    renderDialog()
    await runCheck()
    expect(screen.getByText("authentication code mismatch")).toBeTruthy()
    expect(screen.getByText("Backup.Restore.CannotApply")).toBeTruthy()
    expect(next().disabled).toBe(true)
})

test("apply needs credential, confirmation word and login password, then hands off", async () => {
    mocks.prepare.mockResolvedValue(prepared())
    mocks.apply.mockResolvedValue(undefined)
    const { onApplied } = renderDialog()
    await runCheck()
    fireEvent.click(screen.getByRole("checkbox", { name: "Backup.Restore.Acknowledge" }))
    fireEvent.click(next())

    const apply = screen.getByRole("button", { name: "Backup.Restore.Apply" }) as HTMLButtonElement
    expect(apply.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText("Backup.Restore.BackupPassword"), {
        target: { value: "backup-password-1" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Restore.ConfirmLabel"), {
        target: { value: "a1b2c" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Restore.LoginPassword"), {
        target: { value: "login-pw" },
    })
    expect(apply.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText("Backup.Restore.ConfirmLabel"), {
        target: { value: "a1b2c3" },
    })
    expect(apply.disabled).toBe(false)
    fireEvent.click(apply)
    await waitFor(() => expect(mocks.apply).toHaveBeenCalled())
    expect(mocks.apply).toHaveBeenCalledWith({
        restore_token: "tok-1",
        confirm: "a1b2c3",
        acknowledged: ["origin_unverified"],
        login_password: "login-pw",
        password: "backup-password-1",
    })
    await waitFor(() => expect(onApplied).toHaveBeenCalled())
    // the consumed token is not cancelled afterwards
    expect(mocks.cancel).not.toHaveBeenCalled()
})

test("OAuth-only administrators with an old session are sent to sign in again", async () => {
    mocks.prepare.mockResolvedValue(
        prepared({
            warnings: [],
            apply_requires: { login_password: false, reauth_needed: true },
        }),
    )
    renderDialog()
    await runCheck()
    fireEvent.click(next())
    expect(screen.queryByLabelText("Backup.Restore.LoginPassword")).toBeNull()
    fireEvent.change(screen.getByLabelText("Backup.Restore.BackupPassword"), {
        target: { value: "backup-password-1" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Restore.ConfirmLabel"), {
        target: { value: "a1b2c3" },
    })
    expect(
        (screen.getByRole("button", { name: "Backup.Restore.Apply" }) as HTMLButtonElement)
            .disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Backup.Restore.SignInAgain" }))
    expect(mocks.logout).toHaveBeenCalled()
    expect(mocks.cancel).toHaveBeenCalledWith("tok-1")
})

test("closing the dialog releases the staged restore", async () => {
    mocks.prepare.mockResolvedValue(prepared())
    const { onClose } = renderDialog()
    await runCheck()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(mocks.cancel).toHaveBeenCalledWith("tok-1")
    expect(onClose).toHaveBeenCalled()
})

test("an invalid token sends the user back to the check step", async () => {
    mocks.prepare.mockResolvedValue(prepared({ warnings: [] }))
    mocks.apply.mockRejectedValue(
        new Error("restore token is invalid or expired; run the check again"),
    )
    renderDialog()
    await runCheck()
    fireEvent.click(next())
    fireEvent.change(screen.getByLabelText("Backup.Restore.BackupPassword"), {
        target: { value: "backup-password-1" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Restore.ConfirmLabel"), {
        target: { value: "a1b2c3" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Restore.LoginPassword"), {
        target: { value: "login-pw" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Restore.Apply" }))
    await screen.findByRole("button", { name: "Backup.Restore.Check" })
    expect(screen.queryByTestId("restore-check-result")).toBeNull()
})

test("an expired check cannot continue", async () => {
    mocks.prepare.mockResolvedValue(
        prepared({ warnings: [], expires_at: new Date(Date.now() - 1000).toISOString() }),
    )
    renderDialog()
    await runCheck()
    expect(screen.getByText("Backup.Restore.Expired")).toBeTruthy()
    expect(next().disabled).toBe(true)
})

test("upload restore checks the size limit locally and sends the file with the recovery key", async () => {
    mocks.upload.mockResolvedValue(prepared({ source: "upload", warnings: [] }))
    renderDialog({ kind: "upload" })
    const input = screen.getByLabelText("Backup.Restore.File") as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(2048)], "big.nzbak")] } })
    fireEvent.click(screen.getByRole("radio", { name: "Backup.Restore.UseRecoveryKey" }))
    fireEvent.change(screen.getByLabelText("Backup.Restore.RecoveryKey"), {
        target: { value: "AGE-SECRET-KEY-1TESTONLY" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Restore.Check" }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(mocks.upload).not.toHaveBeenCalled()

    const small = new File([new Uint8Array(16)], "small.nzbak")
    fireEvent.change(input, { target: { files: [small] } })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Restore.Check" }))
    await screen.findByTestId("restore-check-result")
    expect(mocks.upload).toHaveBeenCalledWith(
        small,
        { recovery_key: "AGE-SECRET-KEY-1TESTONLY" },
        expect.any(Function),
    )
})

function deferred<T>() {
    let resolve!: (v: T) => void
    const promise = new Promise<T>((r) => (resolve = r))
    return { promise, resolve }
}

async function startUploadCheck(file: File) {
    fireEvent.change(screen.getByLabelText("Backup.Restore.File"), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText("Backup.Restore.BackupPassword"), {
        target: { value: "backup-password-1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Restore.Check" }))
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled())
}

test("a late check response for a replaced file is discarded and its staging released", async () => {
    const late = deferred<RestorePrepareResponse>()
    mocks.upload.mockReturnValueOnce(late.promise)
    renderDialog({ kind: "upload" })
    await startUploadCheck(new File([new Uint8Array(8)], "first.nzbak"))

    // Switch to another file while the first check is still running.
    fireEvent.change(screen.getByLabelText("Backup.Restore.File"), {
        target: { files: [new File([new Uint8Array(8)], "second.nzbak")] },
    })
    late.resolve(prepared({ restore_token: "stale-token", source: "upload", warnings: [] }))
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith("stale-token"))
    expect(screen.queryByTestId("restore-check-result")).toBeNull()
    expect(next().disabled).toBe(true)
    // The check button is usable again for the new file.
    expect(
        (screen.getByRole("button", { name: "Backup.Restore.Check" }) as HTMLButtonElement)
            .disabled,
    ).toBe(false)
})

test("a check that finishes after the dialog closed releases its staging", async () => {
    const late = deferred<RestorePrepareResponse>()
    mocks.upload.mockReturnValueOnce(late.promise)
    const { onClose } = renderDialog({ kind: "upload" })
    await startUploadCheck(new File([new Uint8Array(8)], "first.nzbak"))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalled()
    late.resolve(prepared({ restore_token: "late-token", source: "upload", warnings: [] }))
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith("late-token"))
    expect(screen.queryByTestId("restore-check-result")).toBeNull()
})

test("the apply step says whether a pre-restore backup will be taken", async () => {
    mocks.upload.mockResolvedValue(
        prepared({
            source: "upload",
            warnings: [{ code: "pre_restore_skipped", require_ack: true }],
        }),
    )
    renderDialog({ kind: "upload" })
    await startUploadCheck(new File([new Uint8Array(8)], "b.nzbak"))
    await screen.findByTestId("restore-check-result")
    expect(next().disabled).toBe(true)
    fireEvent.click(screen.getByRole("checkbox", { name: "Backup.Restore.Acknowledge" }))
    fireEvent.click(next())
    expect(screen.getByTestId("restore-pre-backup").textContent).toBe(
        "Backup.Restore.NoPreRestoreBackup",
    )
})

test("with storage configured the apply step announces the pre-restore backup", async () => {
    mocks.prepare.mockResolvedValue(prepared({ warnings: [] }))
    renderDialog()
    await runCheck()
    fireEvent.click(next())
    expect(screen.getByTestId("restore-pre-backup").textContent).toBe(
        "Backup.Restore.PreRestoreBackup",
    )
})
