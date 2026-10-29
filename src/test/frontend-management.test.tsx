import FrontendsPage from "@/routes/frontends"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    auth: { profile: { role: 0 } as { role: number } | undefined, loading: false },
    query: vi.fn(),
    install: vi.fn(),
    activate: vi.fn(),
    remove: vi.fn(),
    refresh: vi.fn(),
    refreshSettings: vi.fn(),
    swr: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }))
vi.mock("@/components/settings-tab", () => ({ SettingsTab: () => null }))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
}))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))
vi.mock("@/api/frontends", () => ({
    listFrontendReleases: mocks.query,
    installFrontend: mocks.install,
    activateFrontend: mocks.activate,
    removeFrontend: mocks.remove,
}))
vi.mock("swr", () => ({ default: mocks.swr, mutate: mocks.refreshSettings }))

beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth = { profile: { role: 0 }, loading: false }
    mocks.swr.mockReturnValue({
        data: {
            user_template: "user-dist",
            admin_template: "admin-dist",
            templates: [
                {
                    path: "user-dist",
                    name: "Built-in user",
                    repository: "https://github.com/owner/site",
                    version: "v1",
                },
                {
                    path: "installed-user",
                    name: "Installed user",
                    repository: "https://github.com/owner/site",
                    version: "v2",
                    custom: true,
                },
                {
                    path: "admin-dist",
                    name: "Built-in admin",
                    repository: "https://github.com/owner/admin",
                    version: "v1",
                    is_admin: true,
                },
            ],
        },
        mutate: mocks.refresh,
    })
    mocks.query.mockResolvedValue({
        releases: [{ tag_name: "v2", name: "Release two", prerelease: false }],
        page: 1,
        has_more: true,
    })
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

function renderPage() {
    return render(
        <MemoryRouter>
            <FrontendsPage />
        </MemoryRouter>,
    )
}

async function queryReleases() {
    fireEvent.change(screen.getByLabelText("FrontendManager.Repository"), {
        target: { value: "https://github.com/owner/site" },
    })
    fireEvent.click(screen.getByRole("button", { name: "FrontendManager.LoadReleases" }))
    await screen.findByText("Release two")
}

test("waits for authentication and does not fetch administrator data for a member", () => {
    mocks.auth = { profile: undefined, loading: true }
    const { rerender } = renderPage()
    expect(screen.queryByText("FrontendManager.Title")).toBeNull()
    expect(mocks.swr).toHaveBeenLastCalledWith(null, expect.any(Function))
    mocks.auth = { profile: { role: 1 }, loading: false }
    rerender(
        <MemoryRouter>
            <FrontendsPage />
        </MemoryRouter>,
    )
    expect(screen.queryByText("FrontendManager.Title")).toBeNull()
    expect(mocks.swr).toHaveBeenLastCalledWith(null, expect.any(Function))
    expect(mocks.query).not.toHaveBeenCalled()
})

test("queries paginated releases and clears results when repository changes", async () => {
    renderPage()
    await queryReleases()
    expect(mocks.query).toHaveBeenCalledWith("https://github.com/owner/site", 1)
    expect(
        (screen.getByRole("button", { name: "FrontendManager.Previous" }) as HTMLButtonElement)
            .disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "FrontendManager.Next" }))
    await waitFor(() =>
        expect(mocks.query).toHaveBeenCalledWith("https://github.com/owner/site", 2),
    )
    await waitFor(() =>
        expect(
            (screen.getByLabelText("FrontendManager.Repository") as HTMLInputElement).disabled,
        ).toBe(false),
    )
    fireEvent.change(screen.getByLabelText("FrontendManager.Repository"), {
        target: { value: "https://gitee.com/owner/site" },
    })
    expect(screen.queryByText("Release two")).toBeNull()
})

test.each([false, true])(
    "installs the selected role without activating it (admin=%s)",
    async (admin) => {
        renderPage()
        fireEvent.change(screen.getByLabelText("FrontendManager.Target"), {
            target: { value: admin ? "admin" : "user" },
        })
        await queryReleases()
        fireEvent.click(screen.getByRole("button", { name: "FrontendManager.Install" }))
        await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("FrontendManager.Installed"))
        expect(mocks.install).toHaveBeenCalledWith("https://github.com/owner/site", "v2", admin)
        expect(mocks.refresh).toHaveBeenCalledOnce()
        expect(mocks.refreshSettings).toHaveBeenCalledWith("/api/v1/setting")
        expect(mocks.activate).not.toHaveBeenCalled()
    },
)

test("failed installation leaves selection and catalog unchanged", async () => {
    mocks.install.mockRejectedValue(new Error("Invalid distribution"))
    renderPage()
    await queryReleases()
    fireEvent.click(screen.getByRole("button", { name: "FrontendManager.Install" }))
    await waitFor(() =>
        expect(mocks.error).toHaveBeenCalledWith("Error", {
            description: "Error: Invalid distribution",
        }),
    )
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(mocks.activate).not.toHaveBeenCalled()
})

test("activates an installed user frontend and refreshes settings", async () => {
    renderPage()
    expect(screen.queryByText(/Built-in admin/)).toBeNull()
    expect(
        (screen.getByRole("button", { name: "FrontendManager.Active" }) as HTMLButtonElement)
            .disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "FrontendManager.Activate" }))
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("FrontendManager.Activated"))
    expect(mocks.activate).toHaveBeenCalledWith("installed-user", false)
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(mocks.refreshSettings).toHaveBeenCalledWith("/api/v1/setting")
})

test("failed activation is not reported as successful", async () => {
    mocks.activate.mockRejectedValue(new Error("Cannot save selection"))
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "FrontendManager.Activate" }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
})

test.each([false, true])(
    "removes only confirmed inactive custom frontends (admin=%s)",
    async (admin) => {
        const state = mocks.swr.getMockImplementation()!()
        state.data.templates[1].is_admin = admin
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
        renderPage()
        fireEvent.change(screen.getByLabelText("FrontendManager.Target"), {
            target: { value: admin ? "admin" : "user" },
        })
        const buttons = screen.getAllByRole("button", { name: "FrontendManager.Remove" })
        expect(buttons).toHaveLength(1)
        fireEvent.click(buttons[0])
        expect(confirm).toHaveBeenCalledWith("FrontendManager.ConfirmRemove")
        expect(mocks.remove).not.toHaveBeenCalled()
        confirm.mockReturnValue(true)
        fireEvent.click(buttons[0])
        await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("FrontendManager.Removed"))
        expect(mocks.remove).toHaveBeenCalledExactlyOnceWith("installed-user", admin)
        expect(mocks.refresh).toHaveBeenCalledOnce()
        expect(mocks.refreshSettings).toHaveBeenCalledWith("/api/v1/setting")
        expect(mocks.activate).not.toHaveBeenCalled()
    },
)

test("hides removal for active custom frontends", () => {
    const state = mocks.swr.getMockImplementation()!()
    state.data.user_template = "installed-user"
    renderPage()
    expect(screen.queryByRole("button", { name: "FrontendManager.Remove" })).toBeNull()
})

test("failed removal keeps the catalog and does not report success", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    mocks.remove.mockRejectedValue(new Error("Cannot delete frontend"))
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "FrontendManager.Remove" }))
    await waitFor(() =>
        expect(mocks.error).toHaveBeenCalledWith("Error", {
            description: "Error: Cannot delete frontend",
        }),
    )
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(screen.getByText(/Installed user/)).toBeTruthy()
})
