import SettingsPage from "@/routes/settings"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({ toast: vi.fn() }))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: "en", changeLanguage: vi.fn() },
    }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
    Trans: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))
vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: { id: 1, role: 0 }, loading: false }),
}))
vi.mock("@/hooks/useNotfication", () => ({ useNotification: () => ({ notifierGroup: [] }) }))
const settings = vi.hoisted(() => ({
    data: {
        config: {
            site_name: "Nezha",
            language: "en",
            user_template: "user-dist",
            cover: 1,
            ip_change_notification_group_id: 0,
            dashboard_host: "panel.example.com",
            nat_member_domains: ["tunnel.example.com", "files.example.com"] as string[] | undefined,
        },
        frontend_templates: [],
    },
    update: vi.fn(),
}))
vi.mock("@/hooks/useSetting", () => ({ default: () => ({ data: settings.data, mutate: vi.fn() }) }))
vi.mock("@/api/settings", () => ({
    updateSettings: (...args: unknown[]) => settings.update(...args),
}))

beforeEach(() => {
    settings.update.mockReset().mockResolvedValue(undefined)
    settings.data.config.nat_member_domains = ["tunnel.example.com", "files.example.com"]
})
afterEach(cleanup)

async function openSettings() {
    await act(async () => {
        render(
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>,
        )
    })
    return screen.getByLabelText("NATMemberDomains") as HTMLTextAreaElement
}
async function saveDomains(input: HTMLTextAreaElement, value: string) {
    await act(async () => {
        fireEvent.change(input, { target: { value } })
    })
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Confirm/i }))
    })
    await waitFor(() => expect(settings.update).toHaveBeenCalledTimes(1))
    return settings.update.mock.calls[0][0]
}
test("displays the configured domains and submits trimmed individual entries", async () => {
    const input = await openSettings()
    expect(input.value).toBe("tunnel.example.com\nfiles.example.com")
    const payload = await saveDomains(input, "new.example.com\n files.example.com \n\n")
    expect(payload.nat_member_domains).toEqual(["new.example.com", "files.example.com"])
    expect(payload.dashboard_host).toBe("panel.example.com")
})
test("clearing the field sends an explicit empty list to disable member NAT", async () => {
    const input = await openSettings()
    const payload = await saveDomains(input, "")
    expect(payload).toHaveProperty("nat_member_domains", [])
})
test("an older backend without the field renders and saves with an empty list", async () => {
    delete settings.data.config.nat_member_domains
    const input = await openSettings()
    expect(input.value).toBe("")
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Confirm/i }))
    })
    await waitFor(() => expect(settings.update).toHaveBeenCalledTimes(1))
    expect(settings.update.mock.calls[0][0]).toHaveProperty("nat_member_domains", [])
})
