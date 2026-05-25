import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const toastCalls: Array<{ title: string; description: string }> = []
vi.mock("sonner", () => ({
    toast: (title: string, opts?: { description?: string }) => {
        toastCalls.push({ title, description: opts?.description ?? "" })
    },
}))

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, vars?: Record<string, unknown>) => {
            if (vars && typeof vars.count === "number") {
                return `${key}=${vars.count}`
            }
            return key
        },
    }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
    Trans: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

const batchMoveServer = vi.fn()
vi.mock("@/api/server", () => ({
    batchMoveServer: (...args: unknown[]) => batchMoveServer(...args),
}))

import { BatchMoveServerIcon } from "@/components/batch-move-server-icon"

beforeEach(() => {
    toastCalls.length = 0
    batchMoveServer.mockReset()
})

afterEach(() => {
    document.body.innerHTML = ""
})

async function openDialogAndSubmit(serverIds: number[], toUser: number) {
    render(<BatchMoveServerIcon serverIds={serverIds} />)
    await act(async () => {
        fireEvent.click(screen.getByRole("button"))
    })
    const userInput = await screen.findByPlaceholderText("User ID")
    await act(async () => {
        fireEvent.change(userInput, { target: { value: String(toUser) } })
    })
    const submit = screen.getByRole("button", { name: "Move" })
    await act(async () => {
        fireEvent.click(submit)
    })
    await waitFor(() => expect(toastCalls.length).toBeGreaterThan(0))
}

test("BatchMoveServer toast surfaces agent_too_old count so operator sees the failure", async () => {
    batchMoveServer.mockResolvedValueOnce([
        { server_id: 1, status: "agent_too_old", error: "agent build older than v1.18.0" },
        { server_id: 2, status: "pending", transfer_id: 99 },
    ])

    await openDialogAndSubmit([1, 2], 300)

    expect(batchMoveServer).toHaveBeenCalledOnce()
    const summary = toastCalls[toastCalls.length - 1]
    expect(summary, "submission must surface a toast").toBeDefined()
    expect(summary.description, "toast must include the agent_too_old count").toContain(
        "Transfer.AgentTooOldCount=1",
    )
    expect(summary.description).toContain("Transfer.PendingCount=1")
})

test("BatchMoveServer toast does not show Done fallback when every server is agent_too_old", async () => {
    batchMoveServer.mockResolvedValueOnce([
        { server_id: 1, status: "agent_too_old", error: "older than v1.18.0" },
        { server_id: 2, status: "agent_too_old", error: "older than v1.18.0" },
    ])

    await openDialogAndSubmit([1, 2], 300)

    const summary = toastCalls[toastCalls.length - 1]
    expect(summary).toBeDefined()
    expect(
        summary.description,
        "all-failed batch must NOT collapse to a generic Done label — operator would think it succeeded",
    ).toContain("Transfer.AgentTooOldCount=2")
    expect(summary.description).not.toBe("Done")
})
