import NATPage from "@/routes/nat"
import { ModelNAT } from "@/types"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
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

const firstProfile = {
    id: 1,
    name: "first-profile",
    enabled: true,
    server_id: 11,
    host: "192.0.2.1:80",
    domain: "first.example",
} as ModelNAT
const secondProfile = {
    id: 2,
    name: "second-profile",
    enabled: true,
    server_id: 22,
    host: "192.0.2.2:80",
    domain: "second.example",
} as ModelNAT

function serveProfiles(profiles: ModelNAT[]) {
    mocks.swr.mockReturnValue({ data: profiles, mutate: mocks.refresh, isLoading: false })
}

function rowOf(profileName: string) {
    const row = screen.getByText(profileName).closest("tr")
    if (!row) throw new Error("row not found for " + profileName)
    return within(row)
}

beforeEach(() => {
    vi.resetAllMocks()
})

afterEach(() => {
    cleanup()
})

test("edit dialog shows the surviving profile after the row above it is deleted", () => {
    serveProfiles([firstProfile, secondProfile])
    const { rerender } = render(<NATPage />)

    serveProfiles([secondProfile])
    rerender(<NATPage />)

    fireEvent.click(rowOf("second-profile").getAllByRole("button")[0])

    const dialog = within(screen.getByRole("dialog"))
    expect(dialog.getByPlaceholderText("My NAT Profile")).toHaveProperty("value", "second-profile")
    expect(dialog.getByPlaceholderText("router.app.yourdomain.com")).toHaveProperty(
        "value",
        "second.example",
    )
})

test("selection does not move to the next profile after the selected one is deleted", () => {
    serveProfiles([firstProfile, secondProfile])
    const { rerender } = render(<NATPage />)

    fireEvent.click(rowOf("first-profile").getByRole("checkbox"))
    expect(rowOf("first-profile").getByRole("checkbox").getAttribute("aria-checked")).toBe("true")

    serveProfiles([secondProfile])
    rerender(<NATPage />)

    expect(rowOf("second-profile").getByRole("checkbox").getAttribute("aria-checked")).toBe("false")
})

// The table's column definitions were rebuilt on every render. React saw a new
// cell component each time and remounted the whole row, so any data refresh
// (another user's edit, revalidation on focus) closed an edit dialog that was
// being filled in and threw the input away.
test("an open edit dialog survives a refresh of the list", () => {
    serveProfiles([firstProfile, secondProfile])
    const { rerender } = render(<NATPage />)

    fireEvent.click(rowOf("second-profile").getAllByRole("button")[0])
    const nameInput = within(screen.getByRole("dialog")).getByPlaceholderText("My NAT Profile")
    fireEvent.change(nameInput, { target: { value: "name being typed" } })

    serveProfiles([{ ...firstProfile, name: "first-renamed-elsewhere" }, { ...secondProfile }])
    rerender(<NATPage />)

    expect(screen.getByText("first-renamed-elsewhere")).toBeTruthy()
    const dialog = screen.queryByRole("dialog")
    expect(dialog, "the edit dialog was closed by the refresh").not.toBeNull()
    expect(within(dialog as HTMLElement).getByPlaceholderText("My NAT Profile")).toHaveProperty(
        "value",
        "name being typed",
    )
})

// The edit form now lives across refreshes, and a form only reads its initial
// values once. Reopening it has to show what the row holds now, otherwise the
// next save writes the values from before the previous edit back.
test("reopening the edit dialog shows the refreshed profile", () => {
    serveProfiles([firstProfile, secondProfile])
    const { rerender } = render(<NATPage />)

    fireEvent.click(rowOf("second-profile").getAllByRole("button")[0])
    expect(
        within(screen.getByRole("dialog")).getByPlaceholderText("My NAT Profile"),
    ).toHaveProperty("value", "second-profile")
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()

    serveProfiles([
        firstProfile,
        { ...secondProfile, name: "second-renamed", domain: "renamed.example" },
    ])
    rerender(<NATPage />)
    fireEvent.click(rowOf("second-renamed").getAllByRole("button")[0])

    const dialog = within(screen.getByRole("dialog"))
    expect(dialog.getByPlaceholderText("My NAT Profile")).toHaveProperty("value", "second-renamed")
    expect(dialog.getByPlaceholderText("router.app.yourdomain.com")).toHaveProperty(
        "value",
        "renamed.example",
    )
})
