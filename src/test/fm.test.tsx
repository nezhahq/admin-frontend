import { fmWorker } from "@/lib/utils"
import { FMWorkerOpcode } from "@/types"
import { act, fireEvent, render, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { FMComponent } from "../components/fm"

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
        // Same layout as the real parser in src/lib/utils.ts.
        parseFMListPage: (buf: ArrayBufferLike) => {
            const view = new DataView(buf)
            const pathLength = view.getUint32(5, false)
            let offset = 9 + pathLength
            const entries: { type: number; name: string }[] = []
            while (offset < view.byteLength) {
                const nameLength = view.getUint16(offset + 1, false)
                entries.push({
                    type: view.getUint8(offset),
                    name: new TextDecoder().decode(new Uint8Array(buf, offset + 3, nameLength)),
                })
                offset += 3 + nameLength
            }
            return {
                path: new TextDecoder().decode(new Uint8Array(buf, 9, pathLength)),
                entries,
                isLastPage: (view.getUint8(4) & 1) !== 0,
            }
        },
        buildUploadHeader: () => new Uint8Array([2]).buffer,
        readFileAsArrayBuffer: async (blob: Blob) => blob.arrayBuffer(),
    },
    fmWorker: new Worker(""),
    formatPath: (path: string) => path,
}))

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
    readyState: 0 | 1 | 2 | 3 = MockWebSocket.CONNECTING
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
        await socket.onmessage?.call(
            socket,
            new MessageEvent("message", { data: encodeCompleteMessage() }),
        )
    })

    expect(webSockets).toHaveLength(1)
    expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/new/path")

    unmount()
    expect(socket.readyState).toBe(MockWebSocket.CLOSED)
})

const encodeDownloadHeader = (totalBytes: number) => {
    const payload = new Uint8Array(12)
    payload.set([0x4e, 0x5a, 0x54, 0x44], 0)
    new DataView(payload.buffer).setBigUint64(4, BigInt(totalBytes), false)
    return payload.buffer
}

const encodeErrorMessage = (message: string) => {
    const messageBytes = new TextEncoder().encode(message)
    const payload = new Uint8Array(4 + messageBytes.length)
    payload.set([0x4e, 0x45, 0x52, 0x52], 0)
    payload.set(messageBytes, 4)
    return payload.buffer
}

const receive = (socket: MockWebSocket, data: ArrayBufferLike) => {
    // Deliberately not awaited: a stuck handler must fail the assertion, not hang the test.
    void socket.onmessage?.call(socket, new MessageEvent("message", { data }))
}

const emitFromWorker = (data: { type: FMWorkerOpcode; error?: string }) => {
    fmWorker.onmessage?.call(fmWorker, new MessageEvent("message", { data }))
}

const openFileManager = async () => {
    const view = render(<FMComponent wsUrl="/ws/file/test" />)
    await waitFor(() => {
        expect(webSockets).toHaveLength(1)
    })
    const socket = webSockets[0]
    act(() => {
        socket.open()
    })
    socket.sent.length = 0
    return { socket, ...view }
}

test("a worker failure ends the download and later listings still work", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFileManager()

    act(() => {
        receive(socket, encodeDownloadHeader(6))
    })
    await waitFor(() => {
        expect(postToWorker).toHaveBeenLastCalledWith(expect.objectContaining({ operation: 1 }))
    })

    act(() => {
        emitFromWorker({ type: FMWorkerOpcode.Error, error: "storage unavailable" })
    })
    expect(toast).toHaveBeenLastCalledWith("FM Error", { description: "storage unavailable" })

    postToWorker.mockClear()
    act(() => {
        // The agent keeps streaming the rest of the file; it must be dropped, not written.
        receive(socket, new Uint8Array([1, 2, 3]).buffer)
        receive(socket, new Uint8Array([4, 5, 6]).buffer)
        receive(socket, encodeFileNameMessage("/after/failure"))
    })

    await waitFor(() => {
        expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/after/failure")
    })
    expect(postToWorker).not.toHaveBeenCalledWith(expect.objectContaining({ operation: 2 }))
    unmount()
})

test("an error frame during a download resets the transfer state", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFileManager()

    act(() => {
        receive(socket, encodeDownloadHeader(1024))
        emitFromWorker({ type: FMWorkerOpcode.Progress })
    })
    postToWorker.mockClear()

    act(() => {
        receive(socket, encodeErrorMessage("read failed"))
    })
    await waitFor(() => {
        expect(postToWorker).toHaveBeenCalledWith(expect.objectContaining({ operation: 4 }))
    })

    act(() => {
        receive(socket, encodeFileNameMessage("/after/error"))
    })
    await waitFor(() => {
        expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/after/error")
    })
    expect(postToWorker).not.toHaveBeenCalledWith(expect.objectContaining({ operation: 2 }))
    unmount()
})
// File content is sent as raw chunks with no frame header, so a chunk can begin
// with the same four bytes as an error frame. Such a file used to abort at that
// chunk. A chunk is told apart by its size: the agent sends full 1 MiB reads
// and then exactly the remainder, while an error frame is a short message.
test("file content that begins with the error marker is written, not treated as an error", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFileManager()
    const fullChunkBytes = 1024 * 1024
    const fullChunk = new Uint8Array(fullChunkBytes)
    fullChunk.set([0x4e, 0x45, 0x52, 0x52], 0)
    const lastChunk = new Uint8Array([0x4e, 0x45, 0x52, 0x52, 0x21])

    act(() => {
        receive(socket, encodeDownloadHeader(fullChunkBytes + lastChunk.byteLength))
        emitFromWorker({ type: FMWorkerOpcode.Progress })
    })
    postToWorker.mockClear()

    act(() => {
        receive(socket, fullChunk.buffer)
    })
    await waitFor(() => {
        expect(postToWorker).toHaveBeenCalledWith(
            expect.objectContaining({ operation: 2, arrayBuffer: fullChunk.buffer }),
        )
    })
    act(() => {
        receive(socket, lastChunk.buffer)
    })
    await waitFor(() => {
        expect(postToWorker).toHaveBeenCalledWith(
            expect.objectContaining({ operation: 2, arrayBuffer: lastChunk.buffer }),
        )
    })
    expect(postToWorker).not.toHaveBeenCalledWith(expect.objectContaining({ operation: 4 }))
    expect(toast).not.toHaveBeenCalledWith("FM Error", expect.anything())
    unmount()
})

// Chunks carry no offset, so the worker appends them in the order it is handed
// them. Chunks that arrive while the worker is still opening its temporary file
// used to wait in independent polling loops, and whichever loop woke first after
// the file was ready went first: the download had the right size and the wrong
// content.
test("chunks that arrive before the worker is ready are written in arrival order", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFileManager()
    const firstChunk = new Uint8Array([1, 1, 1]).buffer
    const secondChunk = new Uint8Array([2, 2, 2]).buffer
    const thirdChunk = new Uint8Array([3, 3, 3]).buffer

    vi.useFakeTimers()
    try {
        receive(socket, encodeDownloadHeader(9))
        receive(socket, firstChunk)
        await vi.advanceTimersByTimeAsync(4)
        receive(socket, secondChunk)
        await vi.advanceTimersByTimeAsync(3)
        receive(socket, thirdChunk)
        // The first chunk has polled once by now; the other two would poll sooner than its next turn.
        await vi.advanceTimersByTimeAsync(4)
        emitFromWorker({ type: FMWorkerOpcode.Progress })
        await vi.advanceTimersByTimeAsync(100)
    } finally {
        vi.useRealTimers()
    }

    const writtenChunks = postToWorker.mock.calls
        .map(([message]) => message as { operation: number; arrayBuffer: ArrayBuffer })
        .filter((message) => message.operation === 2)
        .map((message) => message.arrayBuffer)
    expect(writtenChunks).toHaveLength(3)
    expect(writtenChunks[0]).toBe(firstChunk)
    expect(writtenChunks[1]).toBe(secondChunk)
    expect(writtenChunks[2]).toBe(thirdChunk)
    unmount()
})

test("upload sends nothing once the websocket is closed", async () => {
    const { socket, container, unmount } = await openFileManager()
    socket.readyState = MockWebSocket.CLOSED

    const fileInput = container.querySelector('input[type="file"]')
    if (!fileInput) throw new Error("file input not found")
    await act(async () => {
        fireEvent.change(fileInput, {
            target: { files: [new File([new Uint8Array(16)], "upload.bin")] },
        })
    })

    expect(socket.sent).toHaveLength(0)
    expect(toast).toHaveBeenCalledWith("FM Error", expect.anything())
    unmount()
})

// Closing the connection resets the download. Chunks still waiting in the queue
// used to be handled afterwards as protocol frames, one error toast per chunk.
test("chunks still queued when the connection closes are dropped", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFileManager()

    vi.useFakeTimers()
    try {
        receive(socket, encodeDownloadHeader(6))
        receive(socket, new Uint8Array([1, 2, 3]).buffer)
        receive(socket, new Uint8Array([4, 5, 6]).buffer)
        await vi.advanceTimersByTimeAsync(5)
        postToWorker.mockClear()
        act(() => {
            socket.onclose?.call(socket, new CloseEvent("close"))
        })
        await vi.advanceTimersByTimeAsync(100)
    } finally {
        vi.useRealTimers()
    }

    expect(postToWorker).toHaveBeenCalledWith(expect.objectContaining({ operation: 4 }))
    expect(postToWorker).not.toHaveBeenCalledWith(expect.objectContaining({ operation: 2 }))
    expect(toast).not.toHaveBeenCalled()
    unmount()
})

// Once the last chunk is handed to the worker the download is over on the wire.
// A frame that arrives before the worker reports the finished file used to be
// sent to the worker as one more chunk.
test("a frame after the last chunk is a protocol frame even before the worker finishes", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFileManager()
    const onlyChunk = new Uint8Array([1, 2, 3]).buffer

    act(() => {
        receive(socket, encodeDownloadHeader(3))
        emitFromWorker({ type: FMWorkerOpcode.Progress })
        receive(socket, onlyChunk)
    })
    await waitFor(() => {
        expect(postToWorker).toHaveBeenCalledWith(
            expect.objectContaining({ operation: 2, arrayBuffer: onlyChunk }),
        )
    })
    postToWorker.mockClear()

    act(() => {
        receive(socket, encodeFileNameMessage("/listed/before/worker/result"))
    })
    await waitFor(() => {
        expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe(
            "/listed/before/worker/result",
        )
    })
    expect(postToWorker).not.toHaveBeenCalled()

    // A worker failure on the last write is still reported for this download.
    act(() => {
        emitFromWorker({ type: FMWorkerOpcode.Error, error: "disk full" })
    })
    expect(toast).toHaveBeenLastCalledWith("FM Error", { description: "disk full" })
    unmount()
})

const framedIdentifier = {
    hello: [0x4e, 0x5a, 0x48, 0x49],
    listingPage: [0x4e, 0x5a, 0x4c, 0x32],
    downloadChunk: [0x4e, 0x5a, 0x44, 0x43],
    downloadEnd: [0x4e, 0x5a, 0x44, 0x45],
}

const encodeListingPage = (path: string, names: [string, boolean][], isLastPage: boolean) => {
    const encoder = new TextEncoder()
    const pathBytes = encoder.encode(path)
    const parts: number[] = [...framedIdentifier.listingPage, isLastPage ? 1 : 0]
    parts.push(
        (pathBytes.length >>> 24) & 0xff,
        (pathBytes.length >>> 16) & 0xff,
        (pathBytes.length >>> 8) & 0xff,
        pathBytes.length & 0xff,
        ...pathBytes,
    )
    for (const [name, isDirectory] of names) {
        const nameBytes = encoder.encode(name)
        parts.push(isDirectory ? 1 : 0, (nameBytes.length >>> 8) & 0xff, nameBytes.length & 0xff)
        parts.push(...nameBytes)
    }
    return new Uint8Array(parts).buffer
}

const encodeDownloadEnd = (sentBytes: number) => {
    const frame = new Uint8Array(12)
    frame.set(framedIdentifier.downloadEnd, 0)
    new DataView(frame.buffer).setBigUint64(4, BigInt(sentBytes), false)
    return frame.buffer
}

const openFramedFileManager = async () => {
    const opened = await openFileManager()
    act(() => {
        receive(opened.socket, new Uint8Array([...framedIdentifier.hello, 2]).buffer)
    })
    return opened
}

test("the connection greets the Agent before it asks for the listing", async () => {
    const view = render(<FMComponent wsUrl="/ws/file/test" />)
    await waitFor(() => {
        expect(webSockets).toHaveLength(1)
    })
    const socket = webSockets[0]
    act(() => {
        socket.open()
    })

    expect(socket.sent).toHaveLength(2)
    expect(Array.from(socket.sent[0] as Uint8Array)).toEqual([3, 2])
    expect(decodeListPath(socket.sent[1])).toBe("")
    view.unmount()
})

test("the legacy protocol override keeps the connection from greeting", async () => {
    window.localStorage.setItem("nezha-fm-legacy-protocol", "1")
    try {
        const view = render(<FMComponent wsUrl="/ws/file/test" />)
        await waitFor(() => {
            expect(webSockets).toHaveLength(1)
        })
        const socket = webSockets[0]
        act(() => {
            socket.open()
        })

        expect(socket.sent).toHaveLength(1)
        expect(decodeListPath(socket.sent[0])).toBe("")
        view.unmount()
    } finally {
        window.localStorage.removeItem("nezha-fm-legacy-protocol")
    }
})

// An Agent that does not know the greeting ignores it: its first frame is the
// old listing, and the connection keeps speaking the old protocol.
test("an Agent that ignores the greeting is spoken to in the old protocol", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFileManager()

    act(() => {
        receive(socket, encodeFileNameMessage("/from/an/old/agent"))
    })
    await waitFor(() => {
        expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/from/an/old/agent")
    })
    const unframedChunk = new Uint8Array([9, 8, 7]).buffer
    act(() => {
        receive(socket, encodeDownloadHeader(3))
        emitFromWorker({ type: FMWorkerOpcode.Progress })
        receive(socket, unframedChunk)
    })
    await waitFor(() => {
        expect(postToWorker).toHaveBeenCalledWith(
            expect.objectContaining({ operation: 2, arrayBuffer: unframedChunk }),
        )
    })
    expect(toast).not.toHaveBeenCalled()
    unmount()
})

test("a framed listing is shown once its last page has arrived", async () => {
    const { socket, unmount } = await openFramedFileManager()

    act(() => {
        receive(socket, encodeListingPage("/paged/listing", [["first.txt", false]], false))
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(socket.sent.map(decodeListPath)).not.toContain("/paged/listing")

    act(() => {
        receive(socket, encodeListingPage("/paged/listing", [["nested", true]], true))
    })
    await waitFor(() => {
        expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/paged/listing")
    })
    expect(toast).not.toHaveBeenCalled()
    unmount()
})

// With typed frames a short chunk that begins with the error marker is content,
// whatever its length, and the end frame closes the transfer.
test("framed download chunks are written without their marker and need no length guessing", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFramedFileManager()
    const contentStartingWithErrorMarker = [0x4e, 0x45, 0x52, 0x52, 0x21, 0x21, 0x21]
    const chunk = new Uint8Array([
        ...framedIdentifier.downloadChunk,
        ...contentStartingWithErrorMarker,
    ])

    act(() => {
        receive(socket, encodeDownloadHeader(contentStartingWithErrorMarker.length + 100))
        emitFromWorker({ type: FMWorkerOpcode.Progress })
        receive(socket, chunk.buffer)
    })
    await waitFor(() => {
        expect(postToWorker).toHaveBeenCalledWith(expect.objectContaining({ operation: 2 }))
    })
    const written = postToWorker.mock.calls
        .map(([message]) => message as { operation: number; arrayBuffer: ArrayBuffer })
        .filter((message) => message.operation === 2)
    expect(written).toHaveLength(1)
    expect(Array.from(new Uint8Array(written[0].arrayBuffer))).toEqual(
        contentStartingWithErrorMarker,
    )
    expect(toast).not.toHaveBeenCalled()
    expect(postToWorker).not.toHaveBeenCalledWith(expect.objectContaining({ operation: 4 }))
    unmount()
})

test("a framed download that ends short of its announced size is reported", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFramedFileManager()

    act(() => {
        receive(socket, encodeDownloadHeader(10))
        emitFromWorker({ type: FMWorkerOpcode.Progress })
        receive(socket, new Uint8Array([...framedIdentifier.downloadChunk, 1, 2, 3]).buffer)
        receive(socket, encodeDownloadEnd(3))
    })

    await waitFor(() => {
        expect(postToWorker).toHaveBeenCalledWith(expect.objectContaining({ operation: 4 }))
    })
    expect(toast).toHaveBeenCalledWith("FM Error", expect.anything())

    // The connection is ready for the next request.
    act(() => {
        receive(socket, encodeListingPage("/after/short/download", [], true))
    })
    await waitFor(() => {
        expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/after/short/download")
    })
    unmount()
})

test("a framed download of the announced size ends without an error", async () => {
    const postToWorker = vi.spyOn(fmWorker, "postMessage")
    const { socket, unmount } = await openFramedFileManager()

    act(() => {
        receive(socket, encodeDownloadHeader(3))
        emitFromWorker({ type: FMWorkerOpcode.Progress })
        receive(socket, new Uint8Array([...framedIdentifier.downloadChunk, 1, 2, 3]).buffer)
        receive(socket, encodeDownloadEnd(3))
        receive(socket, encodeListingPage("/after/complete/download", [], true))
    })

    await waitFor(() => {
        expect(decodeListPath(socket.sent[socket.sent.length - 1])).toBe("/after/complete/download")
    })
    expect(toast).not.toHaveBeenCalled()
    expect(postToWorker).not.toHaveBeenCalledWith(expect.objectContaining({ operation: 4 }))
    unmount()
})
