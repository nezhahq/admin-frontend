import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const toastCalls: Array<{ title: string; description: string }> = []
vi.mock("sonner", () => ({
    toast: (title: string, opts?: { description?: string }) => {
        toastCalls.push({ title, description: opts?.description ?? "" })
    },
}))

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
    Trans: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

const cancelServerTransfer = vi.fn()
const retryServerTransfer = vi.fn()
vi.mock("@/api/transfer", () => ({
    cancelServerTransfer: (...args: unknown[]) => cancelServerTransfer(...args),
    retryServerTransfer: (...args: unknown[]) => retryServerTransfer(...args),
}))

const swrFetcher = vi.fn()
vi.mock("@/api/api", () => ({
    swrFetcher: (...args: unknown[]) => swrFetcher(...args),
}))

vi.mock("swr", () => ({
    default: (_key: string, _fetcher: unknown) => ({
        data: mockedRows,
        mutate: vi.fn(),
        error: undefined,
    }),
}))

let mockProfile: { id: number; role: number } | undefined
vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: mockProfile }),
}))
vi.mock("@/hooks/useMainStore", () => ({
    useMainStore: (selector?: (s: { profile?: { id: number; role: number } }) => unknown) => {
        const store = { profile: mockProfile }
        return selector ? selector(store) : store
    },
}))

import type { ModelServerTransfer } from "@/types"

let mockedRows: ModelServerTransfer[] = []

beforeEach(() => {
    toastCalls.length = 0
    cancelServerTransfer.mockReset()
    retryServerTransfer.mockReset()
    mockedRows = []
    mockProfile = undefined
})

afterEach(() => {
    document.body.innerHTML = ""
})

function makeRow(overrides: Partial<ModelServerTransfer>): ModelServerTransfer {
    return {
        id: 1,
        server_id: 10,
        from_user_id: 100,
        to_user_id: 200,
        initiator_id: 100,
        status: 0,
        last_error: "",
        acked_at: "",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        ...overrides,
    } as ModelServerTransfer
}

async function renderPage() {
    const { default: TransferPage } = await import("@/routes/transfer")
    await act(async () => {
        render(<TransferPage />)
    })
    await waitFor(() => {
        expect(screen.getByText("Transfer.Title")).toBeTruthy()
    })
}

test("non-admin member who is the FromUserID sees Cancel for pending rows but NOT Retry for terminal rows", async () => {
    mockProfile = { id: 100, role: 1 }
    mockedRows = [
        makeRow({ id: 1, status: 0, from_user_id: 100 }),
        makeRow({ id: 2, status: 2, from_user_id: 100 }),
        makeRow({ id: 3, status: 4, from_user_id: 100 }),
    ]

    await renderPage()

    expect(screen.queryAllByRole("button", { name: "Cancel" }).length).toBeGreaterThan(0)
    expect(
        screen.queryAllByRole("button", { name: "Transfer.Retry" }),
        "Retry is admin-only on the backend; rendering it for members produces guaranteed permission_denied on click",
    ).toHaveLength(0)
})

test("non-admin member who is only the ToUserID or InitiatorID sees neither Cancel nor Retry", async () => {
    mockProfile = { id: 200, role: 1 }
    mockedRows = [
        makeRow({ id: 1, status: 0, from_user_id: 100, to_user_id: 200 }),
        makeRow({ id: 2, status: 3, from_user_id: 100, to_user_id: 200 }),
    ]

    await renderPage()

    expect(
        screen.queryAllByRole("button", { name: "Cancel" }),
        "backend cancelServerTransfer rejects non-admins that are not the FromUserID; UI must not pretend it works",
    ).toHaveLength(0)
    expect(
        screen.queryAllByRole("button", { name: "Transfer.Retry" }),
        "backend retryServerTransfer is admin-only; non-admin must not see the button",
    ).toHaveLength(0)
})

test("admin sees both Cancel for pending and Retry for terminal", async () => {
    mockProfile = { id: 1, role: 0 }
    mockedRows = [
        makeRow({ id: 1, status: 0 }),
        makeRow({ id: 2, status: 2 }),
    ]

    await renderPage()

    expect(screen.queryAllByRole("button", { name: "Cancel" }).length).toBe(1)
    expect(screen.queryAllByRole("button", { name: "Transfer.Retry" }).length).toBe(1)
})
