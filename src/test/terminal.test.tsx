import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const terminalMocks = vi.hoisted(() => ({
    instances: [] as Array<{
        write: ReturnType<typeof vi.fn>
        paste: ReturnType<typeof vi.fn>
        focus: ReturnType<typeof vi.fn>
        dataHandler?: (data: string) => void
        binaryHandler?: (data: string) => void
    }>,
}))

const toastMock = vi.hoisted(() => vi.fn())
vi.mock("sonner", () => ({ toast: toastMock }))

vi.mock("@xterm/addon-fit", () => ({
    FitAddon: class {
        activate() {}
        dispose() {}
        fit() {}
    },
}))

vi.mock("@xterm/xterm", () => ({
    Terminal: class {
        cols = 80
        rows = 24
        element: HTMLElement | null = null
        write = vi.fn()
        focus = vi.fn()
        dataHandler?: (data: string) => void
        binaryHandler?: (data: string) => void
        paste = vi.fn((data: string) => this.dataHandler?.(data))

        constructor() {
            terminalMocks.instances.push(this)
        }

        loadAddon() {}
        open(container: HTMLElement) {
            this.element = document.createElement("div")
            container.appendChild(this.element)
        }
        dispose() {}
        onData(handler: (data: string) => void) {
            this.dataHandler = handler
            return { dispose() {} }
        }
        onBinary(handler: (data: string) => void) {
            this.binaryHandler = handler
            return { dispose() {} }
        }
    },
}))

class FakeWebSocket {
    static readonly OPEN = 1
    static instances: FakeWebSocket[] = []
    url: string
    binaryType = "arraybuffer"
    onopen: ((ev: Event) => unknown) | null = null
    onclose: ((ev: Event) => unknown) | null = null
    onerror: ((ev: Event) => unknown) | null = null
    onmessage: ((ev: MessageEvent) => unknown) | null = null
    readyState = 0
    closeCalls = 0
    send = vi.fn()

    constructor(url: string | URL) {
        this.url = url.toString()
        FakeWebSocket.instances.push(this)
    }

    open() {
        this.readyState = FakeWebSocket.OPEN
        this.onopen?.(new Event("open"))
    }

    close() {
        this.closeCalls += 1
        this.readyState = 3
    }
}

beforeEach(() => {
    FakeWebSocket.instances = []
    terminalMocks.instances = []
    toastMock.mockReset()
    ;(globalThis as { WebSocket: typeof WebSocket }).WebSocket =
        FakeWebSocket as unknown as typeof WebSocket
    vi.stubGlobal(
        "requestAnimationFrame",
        vi.fn(() => 1),
    )
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
})

afterEach(() => {
    vi.clearAllMocks()
})

test("XtermComponent closes the previous WebSocket and recreates xterm when wsUrl changes", async () => {
    const { XtermComponent } = await import("../components/terminal")
    const noop = () => undefined

    const { rerender } = render(
        <XtermComponent wsUrl="/api/v1/ws/terminal/session-1" setClose={noop} />,
    )

    expect(FakeWebSocket.instances).toHaveLength(1)
    const firstSocket = FakeWebSocket.instances[0]
    expect(terminalMocks.instances).toHaveLength(1)

    rerender(<XtermComponent wsUrl="/api/v1/ws/terminal/session-2" setClose={noop} />)

    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(firstSocket.closeCalls).toBeGreaterThanOrEqual(1)
    expect(terminalMocks.instances).toHaveLength(2)
})

test("mobile controls send text keys and preserve one-shot Ctrl across xterm paste", async () => {
    const { XtermComponent } = await import("../components/terminal")
    Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { readText: vi.fn().mockResolvedValue("first line\n第二行") },
    })
    render(<XtermComponent wsUrl="/api/v1/ws/terminal/mobile" setClose={() => undefined} />)
    const socket = FakeWebSocket.instances[0]
    act(() => socket.open())

    const control = screen.getByRole("button", { name: "Control modifier for next key" })
    fireEvent.click(control)
    fireEvent.click(screen.getByRole("button", { name: "Paste clipboard" }))

    const terminal = terminalMocks.instances[0]
    await waitFor(() => expect(terminal.paste).toHaveBeenCalledWith("first line\n第二行"))
    expect(control.getAttribute("aria-pressed")).toBe("true")
    expect(socket.send).toHaveBeenCalledWith("first line\n第二行")

    fireEvent.click(screen.getByRole("button", { name: "Left arrow" }))
    expect(socket.send).toHaveBeenLastCalledWith("\x1b[1;5D")
    expect(control.getAttribute("aria-pressed")).toBe("false")
})

test("xterm output and binary input remain byte-safe without AttachAddon", async () => {
    const { XtermComponent } = await import("../components/terminal")
    render(<XtermComponent wsUrl="/api/v1/ws/terminal/bytes" setClose={() => undefined} />)
    const socket = FakeWebSocket.instances[0]
    act(() => socket.open())
    const terminal = terminalMocks.instances[0]

    const output = new window.Uint8Array(new window.ArrayBuffer(16))
    output.set(new TextEncoder().encode("stream 中文"))
    act(() => socket.onmessage?.({ data: output.buffer } as MessageEvent))
    expect(terminal.write).toHaveBeenCalledWith(expect.any(Uint8Array))

    terminal.binaryHandler?.("\x00\xff")
    const binaryCall = socket.send.mock.calls.find(([data]) => ArrayBuffer.isView(data))?.[0]
    expect(Array.from(binaryCall as Uint8Array)).toEqual([0, 0, 255])

    fireEvent.click(screen.getByRole("button", { name: "Escape" }))
    expect(socket.send).toHaveBeenLastCalledWith("\x1b")
})
