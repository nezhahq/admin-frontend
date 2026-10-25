import MCPOAuthManagementPage from "@/routes/mcp-oauth-management"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { SWRConfig } from "swr"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    profile: { id: 100, role: 1 },
    loading: false,
    grants: vi.fn(),
    clients: vi.fn(),
    revoke: vi.fn(),
    disable: vi.fn(),
}))
vi.mock("@/api/mcp-oauth", () => ({
    listMCPOAuthGrants: mocks.grants,
    listMCPOAuthClients: mocks.clients,
    revokeMCPOAuthGrant: mocks.revoke,
    setMCPOAuthClientDisabled: mocks.disable,
}))
vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: mocks.profile, loading: mocks.loading }),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/lib/i18n", () => ({ default: { t: (key: string) => key } }))

const grant = {
    id: "alice-grant",
    client_id: "chatgpt-client",
    client_name: "ChatGPT",
    user_id: 100,
    username: "alice",
    scopes: ["nezha:server:read"],
    server_ids: [7],
    created_at: "2026-01-01T00:00:00Z",
    expires_at: "2026-01-31T00:00:00Z",
    status: "active",
}
const client = {
    id: "chatgpt-client",
    name: "ChatGPT",
    redirect_uris: ["https://chatgpt.com/callback"],
    disabled: false,
    last_used_at: "2026-01-01T00:00:00Z",
    grant_count: 2,
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.profile = { id: 100, role: 1 }
    mocks.loading = false
    mocks.grants.mockResolvedValue({ items: [grant], total: 1 })
    mocks.clients.mockResolvedValue({ items: [client], total: 1 })
    mocks.revoke.mockResolvedValue(undefined)
    mocks.disable.mockResolvedValue(undefined)
    vi.spyOn(window, "confirm").mockReturnValue(true)
})
afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

function openManagement() {
    const cache = new Map()
    function page() {
        return (
            <MemoryRouter>
                <SWRConfig
                    value={{
                        provider: () => cache,
                        dedupingInterval: 0,
                        shouldRetryOnError: false,
                    }}
                >
                    <MCPOAuthManagementPage />
                </SWRConfig>
            </MemoryRouter>
        )
    }
    const result = render(page())
    return () => result.rerender(page())
}

function selectTab(name: string) {
    fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false })
}

test("members see only their authorizations and confirm revocation", async () => {
    openManagement()
    await screen.findByText("ChatGPT")
    expect(mocks.grants).toHaveBeenCalledWith(false, 1)
    expect(screen.getByRole("tab", { name: "MCPOAuthManager.Title" }).getAttribute("href")).toBe(
        "/dashboard/settings/mcp-oauth",
    )
    expect(screen.queryByRole("tab", { name: "MCPOAuthManager.All" })).toBeNull()
    expect(screen.queryByRole("tab", { name: "MCPOAuthManager.Clients" })).toBeNull()
    expect(mocks.clients).not.toHaveBeenCalled()
    expect(screen.getByText("nezha:server:read")).toBeTruthy()
    expect(screen.getByText("7")).toBeTruthy()
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))
    expect(mocks.revoke).not.toHaveBeenCalled()
    mocks.grants.mockResolvedValue({ items: [], total: 0 })
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))
    await screen.findByText("NoResults")
    expect(mocks.revoke).toHaveBeenCalledExactlyOnceWith("alice-grant")
    expect(screen.queryByText("ChatGPT")).toBeNull()
})

test("administrators inspect all-user authorizations and disable and enable clients", async () => {
    mocks.profile.role = 0
    openManagement()
    await screen.findByText("ChatGPT")
    selectTab("MCPOAuthManager.All")
    await screen.findByText("alice (#100)")
    expect(mocks.grants).toHaveBeenCalledWith(true, 1)
    selectTab("MCPOAuthManager.Clients")
    await screen.findByText("https://chatgpt.com/callback")
    expect(mocks.clients).toHaveBeenCalledWith(1)
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole("button", { name: "MCPOAuthManager.Disable" }))
    expect(mocks.disable).not.toHaveBeenCalled()
    mocks.clients.mockResolvedValue({
        items: [{ ...client, disabled: true, grant_count: 0 }],
        total: 1,
    })
    fireEvent.click(screen.getByRole("button", { name: "MCPOAuthManager.Disable" }))
    const enable = await screen.findByRole("button", { name: "MCPOAuthManager.Enable" })
    await waitFor(() => expect((enable as HTMLButtonElement).disabled).toBe(false))
    expect(mocks.disable).toHaveBeenNthCalledWith(1, "chatgpt-client", true)
    expect(window.confirm).toHaveBeenCalledWith("MCPOAuthManager.ConfirmDisable")
    mocks.clients.mockResolvedValue({ items: [client], total: 1 })
    fireEvent.click(enable)
    await screen.findByRole("button", { name: "MCPOAuthManager.Disable" })
    expect(mocks.disable).toHaveBeenNthCalledWith(2, "chatgpt-client", false)
    expect(window.confirm).toHaveBeenCalledWith("MCPOAuthManager.ConfirmEnable")
})

test("failed revocation remains visible with an error and is not reported as removed", async () => {
    mocks.revoke.mockRejectedValue(new Error("Permission denied"))
    openManagement()
    await screen.findByText("ChatGPT")
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))
    expect((await screen.findByRole("alert")).textContent).toBe("Permission denied")
    expect(screen.getByText("ChatGPT")).toBeTruthy()
    expect((screen.getByRole("button", { name: "Revoke" }) as HTMLButtonElement).disabled).toBe(
        false,
    )
})

test("failed client update leaves its previous state visible", async () => {
    mocks.profile.role = 0
    mocks.disable.mockRejectedValue(new Error("Update rejected"))
    openManagement()
    selectTab("MCPOAuthManager.Clients")
    fireEvent.click(await screen.findByRole("button", { name: "MCPOAuthManager.Disable" }))
    expect((await screen.findByRole("alert")).textContent).toBe("Update rejected")
    expect(screen.getByText("MCPOAuthManager.Enabled")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "MCPOAuthManager.Enable" })).toBeNull()
})

test("loading auth fetches nothing and losing admin privileges removes client data", async () => {
    mocks.loading = true
    mocks.profile.role = 0
    const rerender = openManagement()
    expect(mocks.grants).not.toHaveBeenCalled()
    expect(mocks.clients).not.toHaveBeenCalled()
    mocks.loading = false
    rerender()
    selectTab("MCPOAuthManager.Clients")
    await screen.findByText("https://chatgpt.com/callback")
    mocks.profile = { id: 200, role: 1 }
    mocks.grants.mockResolvedValue({ items: [], total: 0 })
    rerender()
    expect(screen.queryByText("https://chatgpt.com/callback")).toBeNull()
    await screen.findByText("NoResults")
    expect(mocks.grants).toHaveBeenLastCalledWith(false, 1)
    expect(screen.queryByRole("tab", { name: "MCPOAuthManager.Clients" })).toBeNull()
})

test("pagination loads another page and list errors are visible", async () => {
    mocks.grants.mockResolvedValue({ items: [grant], total: 21 })
    openManagement()
    await screen.findByText("ChatGPT")
    mocks.grants.mockRejectedValue(new Error("List unavailable"))
    fireEvent.click(screen.getByRole("button", { name: "MCPOAuthManager.Next" }))
    expect((await screen.findByRole("alert")).textContent).toBe("List unavailable")
    expect(mocks.grants).toHaveBeenLastCalledWith(false, 2)
    expect(screen.queryByText("ChatGPT")).toBeNull()
})
