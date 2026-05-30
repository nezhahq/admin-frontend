import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({ toast: () => {} }))

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (k: string) => k,
        i18n: { language: "en", changeLanguage: () => {} },
    }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
    Trans: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

let mockProfile: { id: number; role: number } | undefined
let mockLoading = false
vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: mockProfile, loading: mockLoading }),
}))

vi.mock("@/hooks/useSetting", () => ({
    default: () => ({ data: undefined, mutate: () => {} }),
}))

vi.mock("@/hooks/useNotfication", () => ({
    useNotification: () => ({ notifierGroup: [] }),
}))

vi.mock("@/api/settings", () => ({ updateSettings: vi.fn() }))

const navigateRenders: string[] = []
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<any>("react-router-dom")
    return {
        ...actual,
        Navigate: ({ to }: { to: string }) => {
            navigateRenders.push(to)
            return <div data-testid="nav-stub">redirect:{to}</div>
        },
    }
})

beforeEach(() => {
    navigateRenders.length = 0
    mockProfile = undefined
    mockLoading = true
})

afterEach(() => {
    document.body.innerHTML = ""
})

// SettingsPage 在 profile 还没 fetch 完成时不能就把用户当作非管理员重定向。
// useAuth.loading=true 表示请求未回来；此时必须按"加载中"渲染，不能 Navigate
// 到 /dashboard/settings/api-tokens，否则管理员每次直达 /dashboard/settings
// 都会先闪一下到 api-tokens 页。
test("SettingsPage waits for auth load before redirecting non-admin", async () => {
    const { default: SettingsPage } = await import("@/routes/settings")
    await act(async () => {
        render(<SettingsPage />)
    })
    expect(navigateRenders).toEqual([])
})

// 一旦 loading=false 且确认 profile 不是 admin，才允许跳转。
test("SettingsPage redirects to api-tokens once auth resolves and user is not admin", async () => {
    mockLoading = false
    mockProfile = { id: 1, role: 1 }
    const { default: SettingsPage } = await import("@/routes/settings")
    await act(async () => {
        render(<SettingsPage />)
    })
    expect(navigateRenders).toContain("/dashboard/settings/api-tokens")
})
