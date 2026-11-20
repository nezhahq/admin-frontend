import Root from "@/routes/root"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({ setting: vi.fn() }))

vi.mock("@/hooks/useSetting", () => ({ default: mocks.setting }))
vi.mock("@/components/header", () => ({ default: () => <div>header</div> }))
vi.mock("@/components/theme-provider", () => ({
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }))
vi.mock("react-router-dom", () => ({ Outlet: () => <div>page content</div> }))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
}))

afterEach(() => {
    cleanup()
    vi.resetAllMocks()
})

test("keeps the dashboard mounted when a background settings refresh fails", () => {
    mocks.setting.mockReturnValue({
        data: { config: { site_name: "demo" }, version: "v1" },
        error: new Error("Bad Gateway"),
    })

    render(<Root />)

    expect(screen.getByText("page content")).toBeTruthy()
})

test("still reports the failure when settings were never loaded", () => {
    mocks.setting.mockReturnValue({ data: undefined, error: new Error("Bad Gateway") })
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    expect(() => render(<Root />)).toThrow("Bad Gateway")
})
