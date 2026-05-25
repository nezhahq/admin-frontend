import { render } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({ toast: () => undefined }))

vi.mock("@/lib/utils", () => ({
    sleep: () => Promise.resolve(),
    cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}))

const attachAddonInstances: { ws: WebSocket }[] = []
vi.mock("@xterm/addon-attach", () => ({
    AttachAddon: class {
        ws: WebSocket
        constructor(ws: WebSocket) {
            this.ws = ws
            attachAddonInstances.push(this)
        }
        activate() {}
        dispose() {}
    },
}))

vi.mock("@xterm/addon-fit", () => ({
    FitAddon: class {
        activate() {}
        dispose() {}
        fit() {}
        proposeDimensions() {
            return { rows: 24, cols: 80 }
        }
    },
}))

vi.mock("@xterm/xterm", () => ({
    Terminal: class {
        loadAddon() {}
        open() {}
        dispose() {}
    },
}))

class FakeWebSocket {
    static instances: FakeWebSocket[] = []
    url: string
    binaryType = "arraybuffer"
    onopen: ((ev: Event) => unknown) | null = null
    onclose: ((ev: Event) => unknown) | null = null
    onerror: ((ev: Event) => unknown) | null = null
    onmessage: ((ev: MessageEvent) => unknown) | null = null
    readyState = 0
    closeCalls = 0

    constructor(url: string | URL) {
        this.url = url.toString()
        FakeWebSocket.instances.push(this)
    }

    close() {
        this.closeCalls += 1
        this.readyState = 3
    }

    send() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
        return true
    }
}

beforeEach(() => {
    FakeWebSocket.instances = []
    attachAddonInstances.length = 0
    ;(globalThis as { WebSocket: typeof WebSocket }).WebSocket =
        FakeWebSocket as unknown as typeof WebSocket
})

afterEach(() => {
    vi.clearAllMocks()
})

test("XtermComponent closes the previous WebSocket and re-attaches xterm when wsUrl changes", async () => {
    const { XtermComponent } = await import("../components/terminal")
    const noop = () => undefined

    const { rerender } = render(
        <XtermComponent wsUrl="/api/v1/ws/terminal/session-1" setClose={noop} />,
    )

    expect(FakeWebSocket.instances).toHaveLength(1)
    const firstSocket = FakeWebSocket.instances[0]
    expect(attachAddonInstances).toHaveLength(1)
    expect(attachAddonInstances[0].ws).toBe(firstSocket as unknown as WebSocket)

    rerender(<XtermComponent wsUrl="/api/v1/ws/terminal/session-2" setClose={noop} />)

    expect(FakeWebSocket.instances).toHaveLength(2)
    const secondSocket = FakeWebSocket.instances[1]
    expect(firstSocket.closeCalls).toBeGreaterThanOrEqual(1)
    expect(attachAddonInstances).toHaveLength(2)
    expect(attachAddonInstances[1].ws).toBe(secondSocket as unknown as WebSocket)
})
