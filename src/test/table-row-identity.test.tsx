import NATPage from "@/routes/nat"
import { ModelNAT } from "@/types"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    swr: vi.fn(),
    refresh: vi.fn(),
}))

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
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
