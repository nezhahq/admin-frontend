import BackupPage from "@/routes/backup"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { SWRConfig } from "swr"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const state = vi.hoisted(() => ({
    hasKey: false,
    restoreResult: null as null | { status: string; name: string; finished_at: string },
}))

vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: { role: 0, reject_password: false }, loading: false }),
}))
vi.mock("@/components/settings-tab", () => ({ SettingsTab: () => null }))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
}))
vi.mock("@/api/backup", async (importOriginal) => {
    const real = await importOriginal<typeof import("@/api/backup")>()
    const config = () => ({
        configured: state.hasKey,
        storage_configured: true,
        schedule: { enabled: false, cron: "0 0 3 * * *", retention: 7 },
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
        encryption: state.hasKey
            ? { key_id: "0123456789abcdef", created_at: "2026-11-21T00:00:00Z" }
            : null,
        upload_max_bytes: 256 << 20,
        password_min_length: 12,
        confirm_word_length: 6,
        reset_confirm_word: "RESET",
    })
    return {
        ...real,
        getBackupConfig: vi.fn(async () => config()),
        listBackups: vi.fn(async () => []),
        getRestoreStatus: vi.fn(async () => state.restoreResult),
        setBackupPassword: vi.fn(async () => {
            state.hasKey = true
            return {
                recovery_key: "AGE-SECRET-KEY-1EXAMPLEONLY",
                key_id: "0123456789abcdef",
                created_at: "2026-11-21T00:00:00Z",
            }
        }),
    }
})

beforeEach(() => {
    state.hasKey = false
    state.restoreResult = null
    localStorage.clear()
})
afterEach(cleanup)

function renderPage() {
    return render(
        <SWRConfig
            value={{ provider: () => new Map(), focusThrottleInterval: 0, dedupingInterval: 0 }}
        >
            <MemoryRouter>
                <BackupPage />
            </MemoryRouter>
        </SWRConfig>,
    )
}

// The recovery key is shown only once. Switching to a password manager and
// back revalidates the configuration (now "configured"), which used to unmount
// the setup form together with the dialog and lose the key.
test("the recovery key survives a revalidation on window focus", async () => {
    renderPage()
    fireEvent.change(await screen.findByLabelText("Backup.Password.New"), {
        target: { value: "correct horse battery" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Password.Confirm"), {
        target: { value: "correct horse battery" },
    })
    fireEvent.change(screen.getByLabelText("Backup.Password.LoginPassword"), {
        target: { value: "login password" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Backup.Password.Set" }))
    await screen.findByTestId("backup-recovery-key")

    await act(async () => {
        window.dispatchEvent(new Event("focus"))
        document.dispatchEvent(new Event("visibilitychange"))
        await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(await screen.findByText("Backup.List.Title")).toBeTruthy()
    expect(screen.getByTestId("backup-recovery-key").textContent).toBe(
        "AGE-SECRET-KEY-1EXAMPLEONLY",
    )
})

test("the last restore result can be dismissed and stays dismissed", async () => {
    state.restoreResult = {
        status: "success",
        name: "nezha-backup-x",
        finished_at: "2026-11-21T03:00:00Z",
    }
    const first = renderPage()
    expect(await screen.findByTestId("restore-status-banner")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Backup.RestoreStatus.Dismiss" }))
    expect(screen.queryByTestId("restore-status-banner")).toBeNull()
    first.unmount()

    renderPage()
    await screen.findByText("Backup.Title")
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(screen.queryByTestId("restore-status-banner")).toBeNull()

    // A newer restore shows its result again.
    cleanup()
    state.restoreResult = {
        status: "success",
        name: "nezha-backup-y",
        finished_at: "2026-11-22T03:00:00Z",
    }
    renderPage()
    expect(await screen.findByTestId("restore-status-banner")).toBeTruthy()
})
