import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({
    toast: vi.fn(),
}))

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (k: string) => k,
        i18n: { language: "en", changeLanguage: vi.fn() },
    }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
    Trans: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: { id: 1, role: 0 }, loading: false }),
}))

vi.mock("@/hooks/useNotfication", () => ({
    useNotification: () => ({ notifierGroup: [] }),
}))

// h.data 可在每个用例中替换，覆盖"配置带/不带 online_stats_days"两种后端形态
const h = vi.hoisted(() => ({
    data: {
        config: {
            site_name: "Nezha",
            language: "zh-CN",
            user_template: "user-dist",
            cover: 1,
            ip_change_notification_group_id: 0,
            online_stats_days: 30,
        },
        frontend_templates: [] as unknown[],
    },
    updateSettings: vi.fn(),
}))

vi.mock("@/hooks/useSetting", () => ({
    default: () => ({ data: h.data, mutate: vi.fn() }),
}))

vi.mock("@/api/settings", () => ({
    updateSettings: (...args: unknown[]) => h.updateSettings(...args),
}))

beforeEach(() => {
    h.updateSettings.mockReset()
    h.updateSettings.mockResolvedValue(undefined)
    h.data.config.online_stats_days = 30
})

afterEach(() => {
    document.body.innerHTML = ""
})

async function renderSettings() {
    const { default: SettingsPage } = await import("@/routes/settings")
    await act(async () => {
        render(
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>,
        )
    })
}

async function submitWithDays(value: string) {
    const input = screen.getByPlaceholderText("7")
    await act(async () => {
        fireEvent.change(input, { target: { value } })
    })
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Confirm/i }))
    })
}

test.each(["6", "3651"])("rejects out-of-range online_stats_days (%s)", async (value) => {
    await renderSettings()
    await submitWithDays(value)
    expect(h.updateSettings).not.toHaveBeenCalled()
})

test("rejects non-integer online_stats_days", async () => {
    await renderSettings()
    await submitWithDays("7.5")
    expect(h.updateSettings).not.toHaveBeenCalled()
})

test("legacy backend without online_stats_days falls back to 7 and still submits", async () => {
    // 模拟旧后端：配置里没有该字段（delete 掉而非置 undefined 字面量）
    const legacy = h.data.config as Record<string, unknown>
    delete legacy.online_stats_days

    await renderSettings()

    // 初始化与 reset 后表单都应回退默认值，而不是把 undefined 交给必填校验
    const input = screen.getByPlaceholderText("7") as HTMLInputElement
    expect(input.value).toBe("7")

    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Confirm/i }))
    })
    await waitFor(() => expect(h.updateSettings).toHaveBeenCalled())

    const payload = h.updateSettings.mock.calls[0][0] as Record<string, unknown>
    expect(payload.online_stats_days).toBe(7)
})

test("valid submit carries the field in the payload", async () => {
    await renderSettings()
    await submitWithDays("90")
    await waitFor(() => expect(h.updateSettings).toHaveBeenCalled())
    expect(h.updateSettings.mock.calls[0][0]).toMatchObject({ online_stats_days: 90 })
})
