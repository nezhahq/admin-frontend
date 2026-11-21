import type { BackupConfigView } from "@/api/backup"
import { RecoveryKeyDialog, ResetBackupPasswordDialog } from "@/components/backup/password"
import { BackupStorageForm } from "@/components/backup/storage-form"
import BackupPage from "@/routes/backup"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    auth: { profile: { role: 0 } as { role: number } | undefined, loading: false },
    swr: vi.fn(),
    update: vi.fn(),
    test: vi.fn(),
    reset: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }))
vi.mock("@/components/settings-tab", () => ({ SettingsTab: () => null }))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
}))
vi.mock("sonner", () => ({
    toast: Object.assign(vi.fn(), { success: mocks.success, error: mocks.error }),
}))
vi.mock("swr", () => ({ default: mocks.swr }))
vi.mock("@/api/backup", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/api/backup")>()),
    updateBackupConfig: mocks.update,
    testBackupStorage: mocks.test,
    resetBackupPassword: mocks.reset,
}))

function makeConfig(over: Partial<BackupConfigView> = {}): BackupConfigView {
    return {
        configured: true,
        storage_configured: true,
        schedule: { enabled: true, cron: "0 0 3 * * *", retention: 7 },
        s3: {
            endpoint: "https://s3.example.com",
            bucket: "test-bucket",
            region: "auto",
            prefix: "nezha-backup/",
            use_path_style: true,
            access_key_id_masked: "****abcd",
            secret_access_key_set: true,
            env_locked: [],
        },
        encryption: { key_id: "0123456789abcdef", created_at: "2026-11-21T00:00:00Z" },
        upload_max_bytes: 256 << 20,
        password_min_length: 12,
        confirm_word_length: 6,
        reset_confirm_word: "RESET",
        ...over,
    }
}

let config: BackupConfigView

beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth = { profile: { role: 0 }, loading: false }
    config = makeConfig()
    mocks.swr.mockImplementation((key: string | null) => {
        if (key === "/api/v1/backup/config")
            return { data: config, mutate: vi.fn(), isLoading: false }
        if (key === "/api/v1/backup")
            return {
                data: [
                    {
                        name: "nezha-backup-20261121-030000-schedule-a1b2c3",
                        size: 2048,
                        sha256: "ab".repeat(32),
                        trigger: "schedule",
                        status: "success",
                        created_at: "2026-11-21T03:00:00Z",
                        nezha_version: "v1.0.0",
                        key_matches_current: false,
                    },
                    {
                        name: "nezha-backup-20261121-040000-manual-d4e5f6",
                        size: 0,
                        sha256: "",
                        trigger: "manual",
                        status: "running",
                        created_at: "2026-11-21T04:00:00Z",
                        key_matches_current: true,
                    },
                ],
                mutate: vi.fn(),
                isLoading: false,
            }
        return { data: undefined, mutate: vi.fn(), isLoading: false }
    })
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

function renderPage() {
    return render(
        <MemoryRouter>
            <BackupPage />
        </MemoryRouter>,
    )
}

test("members never fetch backup data", () => {
    mocks.auth = { profile: { role: 1 }, loading: false }
    renderPage()
    expect(screen.queryByText("Backup.Title")).toBeNull()
    for (const call of mocks.swr.mock.calls) expect(call[0]).toBeNull()
})

test("unconfigured dashboards are guided step by step and cannot back up", () => {
    config = makeConfig({
        configured: false,
        storage_configured: false,
        encryption: null,
        s3: {
            ...makeConfig().s3,
            endpoint: "",
            bucket: "",
            secret_access_key_set: false,
            access_key_id_masked: "",
        },
    })
    renderPage()
    expect(screen.getByTestId("backup-setup-step-1")).toBeTruthy()
    expect(screen.queryByText("Backup.List.BackupNow")).toBeNull()
    expect(screen.queryByText("Backup.Password.Set")).toBeNull()
    expect(screen.getByTestId("backup-missing-step").textContent).toContain(
        "Backup.Setup.BackupDisabled",
    )
    // the list is not requested before setup is complete
    expect(mocks.swr.mock.calls.some((c) => c[0] === "/api/v1/backup")).toBe(false)
    // a fresh dashboard can still restore from a local file
    fireEvent.click(screen.getByRole("button", { name: "Backup.Restore.FromUpload" }))
    expect(screen.getByText("Backup.Restore.TitleUpload")).toBeTruthy()
})

test("password step appears once storage is configured", () => {
    config = makeConfig({ configured: false, encryption: null })
    renderPage()
    expect(screen.getByText("Backup.Password.Set")).toBeTruthy()
})

test("list shows status, old-key badge and only offers download for finished backups", () => {
    renderPage()
    expect(screen.getByText("Backup.List.OldKey")).toBeTruthy()
    expect(screen.getByText("Backup.Status.Running")).toBeTruthy()
    const links = screen.getAllByRole("link", { name: "Backup.List.Download" })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toBe(
        "/api/v1/backup/nezha-backup-20261121-030000-schedule-a1b2c3/download",
    )
    expect(screen.getByText("abababab")).toBeTruthy()
    // polling is on while a backup is running
    const listCall = mocks.swr.mock.calls.find((c) => c[0] === "/api/v1/backup")
    const interval = listCall?.[2]?.refreshInterval as (d: unknown) => number
    expect(interval([{ status: "running" }])).toBeGreaterThan(0)
    expect(interval([{ status: "success" }])).toBe(0)
})

function renderStorage(cfg: BackupConfigView, requireTest = false) {
    const onSaved = vi.fn()
    render(<BackupStorageForm config={cfg} onSaved={onSaved} requireTest={requireTest} />)
    return onSaved
}

test("changing the endpoint makes the secret required and blocks saving without it", async () => {
    renderStorage(makeConfig())
    expect(screen.queryByText("Backup.Storage.SecretRequiredMoved")).toBeNull()
    fireEvent.change(screen.getByLabelText("Backup.Storage.Endpoint"), {
        target: { value: "https://other.example.com" },
    })
    expect(screen.getByText("Backup.Storage.SecretRequiredMoved")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(mocks.update).not.toHaveBeenCalled()

    // Changing it back lifts the requirement.
    fireEvent.change(screen.getByLabelText("Backup.Storage.Endpoint"), {
        target: { value: "https://s3.example.com" },
    })
    expect(screen.queryByText("Backup.Storage.SecretRequiredMoved")).toBeNull()
})

test("saving sends only changed fields and never an empty secret", async () => {
    mocks.update.mockResolvedValue(makeConfig())
    const onSaved = renderStorage(makeConfig())
    const secret = screen.getByLabelText(/Backup.Storage.SecretAccessKey/) as HTMLInputElement
    expect(secret.value).toBe("")
    expect(secret.type).toBe("password")
    fireEvent.change(screen.getByLabelText("Backup.Storage.Prefix"), {
        target: { value: "panel-a/" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalled())
    expect(mocks.update).toHaveBeenCalledWith({ s3: { prefix: "panel-a/" } })
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
})

test("first-time setup requires a passing test of the current values before saving", async () => {
    mocks.test.mockResolvedValue(undefined)
    const cfg = makeConfig({
        configured: false,
        storage_configured: false,
        encryption: null,
        s3: {
            ...makeConfig().s3,
            endpoint: "",
            bucket: "",
            secret_access_key_set: false,
            access_key_id_masked: "",
        },
    })
    renderStorage(cfg, true)
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement
    fireEvent.change(screen.getByLabelText("Backup.Storage.Endpoint"), {
        target: { value: "https://s3.example.com" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Storage.Bucket"), { target: { value: "b" } })
    fireEvent.change(screen.getByLabelText("Backup.Storage.AccessKeyId"), {
        target: { value: "AKID" },
    })
    fireEvent.change(screen.getByLabelText(/Backup.Storage.SecretAccessKey/), {
        target: { value: "s3cr3t" },
    })
    expect(save.disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Backup.Storage.Test" }))
    await waitFor(() => expect(mocks.test).toHaveBeenCalled())
    expect(mocks.test.mock.calls[0][0]).toMatchObject({
        endpoint: "https://s3.example.com",
        bucket: "b",
        access_key_id: "AKID",
        secret_access_key: "s3cr3t",
    })
    await waitFor(() => expect(save.disabled).toBe(false))
    // editing after the test requires testing again
    fireEvent.change(screen.getByLabelText("Backup.Storage.Bucket"), { target: { value: "c" } })
    expect(save.disabled).toBe(true)
})

test("env-locked fields are read-only and a locked secret pins endpoint and bucket", () => {
    renderStorage(makeConfig({ s3: { ...makeConfig().s3, env_locked: ["secret_access_key"] } }))
    expect((screen.getByLabelText("Backup.Storage.Endpoint") as HTMLInputElement).disabled).toBe(
        true,
    )
    expect((screen.getByLabelText("Backup.Storage.Bucket") as HTMLInputElement).disabled).toBe(true)
    expect(
        (screen.getByLabelText(/Backup.Storage.SecretAccessKey/) as HTMLInputElement).disabled,
    ).toBe(true)
    expect((screen.getByLabelText("Backup.Storage.Prefix") as HTMLInputElement).disabled).toBe(
        false,
    )
})

test("the recovery key dialog cannot be closed until the user confirms it was saved", () => {
    const onClose = vi.fn()
    render(
        <RecoveryKeyDialog
            keyResponse={{
                recovery_key: "AGE-SECRET-KEY-1TESTONLY",
                key_id: "k",
                created_at: "2026-11-21T00:00:00Z",
            }}
            onClose={onClose}
        />,
    )
    expect(screen.getByTestId("backup-recovery-key").textContent).toBe("AGE-SECRET-KEY-1TESTONLY")
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull()
    const done = screen.getByRole("button", { name: "Done" }) as HTMLButtonElement
    expect(done.disabled).toBe(true)
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("checkbox", { name: "Backup.RecoveryKey.Saved" }))
    expect(done.disabled).toBe(false)
    fireEvent.click(done)
    expect(onClose).toHaveBeenCalledTimes(1)
})

test("reset requires the confirmation word and shows the warning", async () => {
    mocks.reset.mockResolvedValue({
        recovery_key: "AGE-SECRET-KEY-1NEW",
        key_id: "n",
        created_at: "",
    })
    const onReset = vi.fn()
    render(
        <ResetBackupPasswordDialog
            open
            onOpenChange={() => undefined}
            minLength={12}
            confirmWord="RESET"
            affectedBackups={3}
            onReset={onReset}
        />,
    )
    expect(screen.getByText("Backup.Password.ResetWarning")).toBeTruthy()
    const submit = screen.getByRole("button", {
        name: "Backup.Password.ResetSubmit",
    }) as HTMLButtonElement
    fireEvent.change(screen.getByLabelText("Backup.Password.New"), {
        target: { value: "a-new-long-password" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Password.Confirm"), {
        target: { value: "a-new-long-password" },
    })
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText("Backup.Password.ResetTypeWord"), {
        target: { value: "RESET" },
    })
    expect(submit.disabled).toBe(false)
    fireEvent.click(submit)
    await waitFor(() => expect(mocks.reset).toHaveBeenCalledWith("a-new-long-password", "RESET"))
    await waitFor(() => expect(onReset).toHaveBeenCalled())
})
