import NotificationPage from "@/routes/notification"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    swr: vi.fn(),
    refresh: vi.fn(),
    notifierGroups: undefined as unknown,
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
vi.mock("@/hooks/useNotfication", () => ({
    useNotification: () => ({ notifierGroup: mocks.notifierGroups }),
}))
vi.mock("@/components/notification-tab", () => ({ NotificationTab: () => null }))

const notifier = { id: 7, name: "ops-webhook", url: "https://hooks.example/ops" }
const stableNotifiers = [notifier]

beforeEach(() => {
    vi.resetAllMocks()
    mocks.notifierGroups = undefined
    mocks.swr.mockReturnValue({ data: stableNotifiers, mutate: mocks.refresh, isLoading: false })
})

afterEach(() => {
    cleanup()
})

function openEditDialog() {
    const row = screen.getByText("ops-webhook").closest("tr")
    if (!row) throw new Error("row not found")
    for (const button of within(row).getAllByRole("button")) {
        fireEvent.click(button)
        const dialog = screen.queryByRole("dialog")
        if (dialog) return dialog
    }
    throw new Error("no button of the row opened the edit dialog")
}

// The notifier groups are fetched after the page is shown, and again on every
// route change. The column definitions depended on them, so their arrival
// rebuilt every row and closed an edit dialog that was already being filled in.
test("an open edit dialog survives the arrival of the notifier groups", () => {
    const { rerender } = render(<NotificationPage />)
    const nameInput = within(openEditDialog()).getAllByRole("textbox")[0] as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: "name being typed" } })

    mocks.notifierGroups = [{ group: { id: 4321, name: "on-call" }, notifications: [7] }]
    rerender(<NotificationPage />)

    const dialog = screen.queryByRole("dialog")
    expect(dialog, "the edit dialog was closed when the groups arrived").not.toBeNull()
    expect(
        (within(dialog as HTMLElement).getAllByRole("textbox")[0] as HTMLInputElement).value,
    ).toBe("name being typed")
    // The group column still picks up the groups that arrived.
    const row = screen.getByText("ops-webhook").closest("tr")
    expect(row?.textContent).toContain("4321")
})
