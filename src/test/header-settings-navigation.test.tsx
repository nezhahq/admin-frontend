import Header from "@/components/header"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, expect, test, vi } from "vitest"

const auth = vi.hoisted(() => ({
    desktop: true,
    profile: { id: 100, username: "alice", role: 1 } as
        { id: number; username: string; role: number } | undefined,
}))
vi.mock("@/hooks/useMainStore", () => ({
    useMainStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}))
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ logout: vi.fn() }) }))
vi.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: () => auth.desktop }))
vi.mock("@/components/mode-toggle", () => ({ ModeToggle: () => null }))
vi.mock("@/lib/i18n", () => ({ default: { t: (key: string) => key } }))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)

test.each([true, false])(
    "members can reach settings from the account menu (desktop=%s)",
    async (desktop) => {
        auth.desktop = desktop
        auth.profile = { id: 100, username: "alice", role: 1 }
        render(
            <MemoryRouter>
                <Routes>
                    <Route path="/" element={<Header />} />
                    <Route path="/dashboard/settings" element={<p>settings destination</p>} />
                </Routes>
            </MemoryRouter>,
        )
        const accountMenu = document.querySelector<HTMLElement>('[aria-haspopup="menu"]')
        expect(accountMenu).not.toBeNull()
        fireEvent.keyDown(accountMenu!, { key: "Enter" })
        fireEvent.click(await screen.findByRole("menuitem", { name: "Settings" }))
        expect(await screen.findByText("settings destination")).toBeTruthy()
    },
)

test.each([true, false])(
    "anonymous visitors have no account settings menu (desktop=%s)",
    (desktop) => {
        auth.desktop = desktop
        auth.profile = undefined
        render(
            <MemoryRouter>
                <Header />
            </MemoryRouter>,
        )
        expect(document.querySelector('[aria-haspopup="menu"]')).toBeNull()
        expect(screen.queryByRole("menuitem", { name: "Settings" })).toBeNull()
    },
)
