import MCPOAuthAuthorizePage from "@/routes/mcp-oauth-authorize"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const api = vi.hoisted(() => ({ get: vi.fn(), submit: vi.fn(), follow: vi.fn() }))
vi.mock("@/api/mcp-oauth", () => ({
    getMCPOAuthConsent: api.get,
    submitMCPOAuthConsent: api.submit,
}))
vi.mock("@/lib/mcp-oauth-navigation", () => ({ followMCPOAuthCallback: api.follow }))
vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: { id: 100, username: "alice", role: 1 } }),
}))
vi.mock("@/lib/i18n", () => ({ default: { t: (key: string) => key } }))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({
        client_name: "ChatGPT",
        redirect_uri: "https://chatgpt.com/callback",
        resource: "https://panel.example/mcp",
        scopes: ["nezha:inventory:read", "nezha:server:exec"],
        servers: [
            { id: 7, name: "alpha" },
            { id: 8, name: "beta" },
        ],
        consent_token: "server-signed-ticket",
    })
    api.submit.mockResolvedValue({ redirect_uri: "https://chatgpt.com/callback?code=approved" })
})
afterEach(cleanup)

async function openConsent() {
    render(
        <MemoryRouter
            initialEntries={["/dashboard/mcp/authorize?client_id=chatgpt&state=preserved"]}
        >
            <MCPOAuthAuthorizePage />
        </MemoryRouter>,
    )
    await screen.findByText("MCPOAuth.Permissions")
}

test("ordinary users explicitly select servers and dangerous scopes are not preselected", async () => {
    await openConsent()
    expect(api.get).toHaveBeenCalledWith("?client_id=chatgpt&state=preserved")
    const allow = screen.getByRole("button", { name: "MCPOAuth.Allow" }) as HTMLButtonElement
    expect(allow.disabled).toBe(true)
    expect((screen.getByLabelText("MCPOAuth.ExecuteCommands") as HTMLInputElement).checked).toBe(
        false,
    )
    expect((screen.getByLabelText("MCPOAuth.AllServers") as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByLabelText("alpha (#7)"))
    expect(allow.disabled).toBe(false)
    fireEvent.click(allow)
    await waitFor(() =>
        expect(api.submit).toHaveBeenCalledWith({
            consent_token: "server-signed-ticket",
            approve: true,
            scopes: ["nezha:inventory:read"],
            server_ids: [7],
            all_servers: false,
        }),
    )
    expect(api.follow).toHaveBeenCalledWith(
        "https://chatgpt.com/callback?code=approved",
        "https://chatgpt.com/callback",
    )
})

test("denial works without selecting any servers and never sends approve=true", async () => {
    await openConsent()
    fireEvent.click(screen.getByRole("button", { name: "MCPOAuth.Deny" }))
    await waitFor(() =>
        expect(api.submit).toHaveBeenCalledWith(
            expect.objectContaining({ approve: false, all_servers: false, server_ids: [] }),
        ),
    )
    expect(api.submit).toHaveBeenCalledTimes(1)
})

test("all-server access requires an explicit choice and clears the submitted whitelist", async () => {
    await openConsent()
    fireEvent.click(screen.getByLabelText("alpha (#7)"))
    fireEvent.click(screen.getByLabelText("MCPOAuth.AllServers"))
    fireEvent.click(screen.getByLabelText("MCPOAuth.ExecuteCommands"))
    fireEvent.click(screen.getByRole("button", { name: "MCPOAuth.Allow" }))
    await waitFor(() =>
        expect(api.submit).toHaveBeenCalledWith(
            expect.objectContaining({
                scopes: ["nezha:inventory:read", "nezha:server:exec"],
                server_ids: [],
                all_servers: true,
            }),
        ),
    )
})

test("failed consent stays on the page and reports the error", async () => {
    api.submit.mockRejectedValue(new Error("Consent expired"))
    await openConsent()
    fireEvent.click(screen.getByLabelText("alpha (#7)"))
    fireEvent.click(screen.getByRole("button", { name: "MCPOAuth.Allow" }))
    expect((await screen.findByRole("alert")).textContent).toBe("Consent expired")
    expect(api.follow).not.toHaveBeenCalled()
    expect(
        (screen.getByRole("button", { name: "MCPOAuth.Allow" }) as HTMLButtonElement).disabled,
    ).toBe(false)
})

test("untrusted or expired authorization requests expose no approval control", async () => {
    api.get.mockRejectedValue(new Error("Unknown client"))
    await act(async () => {
        render(
            <MemoryRouter>
                <MCPOAuthAuthorizePage />
            </MemoryRouter>,
        )
    })
    expect((await screen.findByRole("alert")).textContent).toBe("Unknown client")
    expect(screen.queryByRole("button", { name: "MCPOAuth.Allow" })).toBeNull()
    expect(api.submit).not.toHaveBeenCalled()
})
