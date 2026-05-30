import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const toastCalls: string[] = []
vi.mock("sonner", () => ({
    toast: (msg: string) => {
        toastCalls.push(msg)
    },
}))

const changeLanguageCalls: string[] = []
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (k: string) => k,
        i18n: {
            language: "en",
            changeLanguage: (lng: string) => {
                changeLanguageCalls.push(lng)
            },
        },
    }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
    Trans: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: { id: 1, role: 0 }, loading: false }),
}))

const validConfig = {
    config: {
        site_name: "Nezha",
        language: "zh-CN",
        user_template: "user-dist",
        cover: 1,
        ip_change_notification_group_id: 0,
    },
    frontend_templates: [],
}
vi.mock("@/hooks/useSetting", () => ({
    default: () => ({ data: validConfig, mutate: vi.fn() }),
}))

vi.mock("@/hooks/useNotfication", () => ({
    useNotification: () => ({ notifierGroup: [] }),
}))

const updateSettings = vi.fn()
vi.mock("@/api/settings", () => ({ updateSettings: (...args: unknown[]) => updateSettings(...args) }))

beforeEach(() => {
    toastCalls.length = 0
    changeLanguageCalls.length = 0
    updateSettings.mockReset()
})

afterEach(() => {
    document.body.innerHTML = ""
})

test("SettingsPage does not toast Success when updateSettings rejects", async () => {
    updateSettings.mockRejectedValue(new Error("boom"))
    const { default: SettingsPage } = await import("@/routes/settings")

    await act(async () => {
        render(
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>,
        )
    })

    const submit = screen.getByRole("button", { name: /Confirm|Submit|Save/i })
    await act(async () => {
        fireEvent.click(submit)
    })

    await waitFor(() => expect(updateSettings).toHaveBeenCalled())

    expect(toastCalls).toContain("Error")
    expect(toastCalls).not.toContain("Success")
    expect(changeLanguageCalls).toEqual([])
})

test("SettingsPage toasts Success when updateSettings resolves", async () => {
    updateSettings.mockResolvedValue(undefined)
    const { default: SettingsPage } = await import("@/routes/settings")

    await act(async () => {
        render(
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>,
        )
    })

    const submit = screen.getByRole("button", { name: /Confirm|Submit|Save/i })
    await act(async () => {
        fireEvent.click(submit)
    })

    await waitFor(() => expect(updateSettings).toHaveBeenCalled())

    expect(toastCalls).toContain("Success")
    expect(toastCalls).not.toContain("Error")
})
