import WAFPage from "@/routes/waf"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    swr: vi.fn(),
    refresh: vi.fn(),
    // react-i18next hands out the same t between renders; a fresh function per
    // render would hide whether the page keeps its column definitions stable.
    translate: (key: string) => key,
}))

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: mocks.translate }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
}))
vi.mock("sonner", () => ({ toast: vi.fn() }))
vi.mock("swr", () => ({ default: mocks.swr }))
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { role: 0 } }) }))

function serveBlockedAddresses(counts: [string, number][]) {
    mocks.swr.mockReturnValue({
        data: {
            value: counts.map(([ip, count]) => ({ ip, count, block_identifier: 1 })),
            pagination: { offset: 0, limit: 10, total: counts.length },
        },
        mutate: mocks.refresh,
        isLoading: false,
    })
}

function renderPage() {
    return (
        <MemoryRouter>
            <WAFPage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
})

afterEach(() => {
    cleanup()
})

// The blocked address list changes all the time. Rebuilding the column
// definitions on every render remounted each row and closed the delete
// confirmation the administrator had just opened.
test("an open delete confirmation survives a refresh of the blocked address list", () => {
    serveBlockedAddresses([
        ["192.0.2.10", 3],
        ["192.0.2.20", 5],
    ])
    const { rerender } = render(renderPage())
    const row = screen.getByText("192.0.2.20").closest("tr")
    if (!row) throw new Error("row not found")
    const rowButtons = within(row).getAllByRole("button")
    fireEvent.click(rowButtons[rowButtons.length - 1])
    expect(
        screen.queryByRole("alertdialog"),
        "test setup: the confirmation must open",
    ).not.toBeNull()

    serveBlockedAddresses([
        ["192.0.2.10", 4],
        ["192.0.2.20", 5],
    ])
    rerender(renderPage())

    expect(
        screen.queryByRole("alertdialog"),
        "the confirmation was closed by the refresh",
    ).not.toBeNull()
})
