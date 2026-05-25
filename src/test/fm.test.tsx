import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

type DivProps = React.ComponentPropsWithoutRef<"div"> & { asChild?: boolean }
type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
    asChild?: boolean
    size?: string
    variant?: string
}
type IconButtonProps = ButtonProps & { icon?: string }
type SentWebSocketData = string | ArrayBufferLike | Blob | ArrayBufferView

vi.mock("../components/ui/button", () => ({
    Button: (props: ButtonProps) => {
        const { asChild, size, variant, ...buttonProps } = props
        void asChild
        void size
        void variant
        return <button {...buttonProps} />
    },
}))
vi.mock("../components/ui/input", () => ({
    Input: (props: React.ComponentPropsWithoutRef<"input">) => <input {...props} />,
}))
vi.mock("../components/ui/table", () => ({
    Table: (props: React.ComponentPropsWithoutRef<"table">) => <table {...props} />,
    TableHeader: (props: React.ComponentPropsWithoutRef<"thead">) => <thead {...props} />,
    TableBody: (props: React.ComponentPropsWithoutRef<"tbody">) => <tbody {...props} />,
    TableRow: (props: React.ComponentPropsWithoutRef<"tr">) => <tr {...props} />,
    TableCell: (props: React.ComponentPropsWithoutRef<"td">) => <td {...props} />,
    TableHead: (props: React.ComponentPropsWithoutRef<"th">) => <th {...props} />,
}))
vi.mock("../components/ui/dropdown-menu", () => ({
    DropdownMenu: (props: DivProps) => <div {...props} />,
    DropdownMenuTrigger: (props: DivProps) => <div {...props} />,
    DropdownMenuContent: (props: DivProps) => <div {...props} />,
    DropdownMenuItem: (props: DivProps) => <div {...props} />,
}))
vi.mock("../components/ui/alert-dialog", () => ({
    AlertDialog: (props: DivProps) => <div {...props} />,
    AlertDialogTrigger: (props: DivProps) => <div {...props} />,
    AlertDialogContent: (props: DivProps) => <div {...props} />,
    AlertDialogHeader: (props: DivProps) => <div {...props} />,
    AlertDialogFooter: (props: DivProps) => <div {...props} />,
    AlertDialogTitle: (props: DivProps) => <div {...props} />,
    AlertDialogDescription: (props: DivProps) => <div {...props} />,
    AlertDialogCancel: (props: DivProps) => <div {...props} />,
    AlertDialogAction: (props: DivProps) => <div {...props} />,
}))
vi.mock("../components/ui/drawer", () => ({
    Drawer: (props: DivProps) => <div {...props} />,
    DrawerContent: (props: DivProps) => <div {...props} />,
    DrawerHeader: (props: DivProps) => <div {...props} />,
    DrawerTitle: (props: DivProps) => <div {...props} />,
    DrawerTrigger: (props: DivProps) => <div {...props} />,
}))
vi.mock("../components/xui/overlayless-sheet", () => ({
    Sheet: (props: DivProps) => <div {...props} />,
    SheetContent: (props: DivProps) => <div {...props} />,
    SheetDescription: (props: DivProps) => <div {...props} />,
    SheetHeader: (props: DivProps) => <div {...props} />,
    SheetTitle: (props: DivProps) => <div {...props} />,
    SheetTrigger: (props: DivProps) => <div {...props} />,
}))
vi.mock("../components/xui/filepath", () => ({
    Filepath: () => <div data-testid="filepath" />,
}))
vi.mock("../components/xui/icon-button", () => ({
    IconButton: (props: IconButtonProps) => {
        const { asChild, icon, size, variant, ...buttonProps } = props
        void asChild
        void icon
        void size
        void variant
        return <button {...buttonProps} />
    },
}))
vi.mock("../components/xui/virtulized-data-table", () => ({
    DataTable: () => <div data-testid="data-table" />,
}))
vi.mock("lucide-react", () => ({
    File: () => <div data-testid="file-icon" />,
    Folder: () => <div data-testid="folder-icon" />,
}))

const translate = (key: string) => key

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: translate }),
    initReactI18next: { type: "3rdParty", init: () => {} },
}))

vi.mock("sonner", () => ({ toast: vi.fn() }))
vi.mock("@/lib/utils", () => ({
    copyToClipboard: vi.fn(),
    fm: {
        parseFMList: async (buf: ArrayBufferLike) => {
            const view = new DataView(buf)
            const pathLength = view.getUint32(4, false)
            const pathBytes = new Uint8Array(buf, 8, pathLength)

            return { path: new TextDecoder().decode(pathBytes), fmList: [] }
        },
    },
    fmWorker: new Worker(""),
    formatPath: (path: string) => path,
}))

import { FMComponent } from "../components/fm"

const webSockets: MockWebSocket[] = []

class MockWebSocket extends EventTarget implements WebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3

    readonly CONNECTING = MockWebSocket.CONNECTING
    readonly OPEN = MockWebSocket.OPEN
    readonly CLOSING = MockWebSocket.CLOSING
    readonly CLOSED = MockWebSocket.CLOSED
    readonly bufferedAmount = 0
    readonly extensions = ""
    readonly protocol = ""
    readonly url: string

    binaryType: BinaryType = "arraybuffer"
    onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null
    onerror: ((this: WebSocket, ev: Event) => unknown) | null = null
    onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null
    onopen: ((this: WebSocket, ev: Event) => unknown) | null = null
    readyState = MockWebSocket.CONNECTING
    sent: SentWebSocketData[] = []

    constructor(url: string | URL) {
        super()
        this.url = url.toString()
        webSockets.push(this)
    }

    addEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => unknown,
        options?: boolean | AddEventListenerOptions,
    ): void
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, listener, options)
    }

    removeEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => unknown,
        options?: boolean | EventListenerOptions,
    ): void
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
    ): void {
        super.removeEventListener(type, listener, options)
    }

    close(): void {
        this.readyState = MockWebSocket.CLOSED
    }

    open(): void {
        this.readyState = MockWebSocket.OPEN
        this.onopen?.call(this, new Event("open"))
    }

    send(data: SentWebSocketData): void {
        this.sent.push(data)
    }
}

beforeEach(() => {
    webSockets.length = 0
    globalThis.WebSocket = MockWebSocket
})

afterEach(() => {
    vi.clearAllMocks()
})

const encodeFileNameMessage = (path: string) => {
    const identifier = new Uint8Array([0x4e, 0x5a, 0x46, 0x4e])
    const pathBytes = new TextEncoder().encode(path)
    const payload = new Uint8Array(identifier.length + 4 + pathBytes.length)
    payload.set(identifier, 0)
    new DataView(payload.buffer).setUint32(identifier.length, pathBytes.length, false)
    payload.set(pathBytes, identifier.length + 4)
    return payload.buffer
}

const encodeCompleteMessage = () => new Uint8Array([0x4e, 0x5a, 0x55, 0x50]).buffer

const decodeListPath = (data: SentWebSocketData) => {
    if (!ArrayBuffer.isView(data)) return null

    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    if (bytes[0] !== 0) return null

    return new TextDecoder().decode(bytes.slice(1))
}

test("FM websocket lifecycle reuses the socket on path changes", async () => {
    const { unmount } = render(<FMComponent wsUrl="/ws/file/test" />)

    await waitFor(() => {
        expect(webSockets).toHaveLength(1)
    })

    const socket = webSockets[0]
    act(() => {
        socket.open()
    })

    await act(async () => {
        await socket.onmessage?.call(
            socket,
            new MessageEvent("message", { data: encodeFileNameMessage("/new/path") }),
        )
    })

    await waitFor(() => {
        expect(webSockets).toHaveLength(1)
        expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/new/path")
    })

    socket.sent.length = 0
    await act(async () => {
        await socket.onmessage?.call(socket, new MessageEvent("message", { data: encodeCompleteMessage() }))
    })

    expect(webSockets).toHaveLength(1)
    expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/new/path")

    unmount()
    expect(socket.readyState).toBe(MockWebSocket.CLOSED)
})
