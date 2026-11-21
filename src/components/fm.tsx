import { createFM } from "@/api/fm"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { virtualizedTableFeatures } from "@/lib/table"
import { copyToClipboard, fm, formatPath, fmWorker as worker } from "@/lib/utils"
import {
    FMEntry,
    FMIdentifier,
    FMOpcode,
    FMWorkerData,
    FMWorkerOpcode,
    ModelCreateFMResponse,
} from "@/types"
import { ColumnDef } from "@tanstack/react-table"
import { Row, flexRender } from "@tanstack/react-table"
import { File, Folder } from "lucide-react"
import { HTMLAttributes, JSX, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "./ui/button"
import { TableCell, TableRow } from "./ui/table"
import { Filepath } from "./xui/filepath"
import { IconButton } from "./xui/icon-button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "./xui/overlayless-sheet"
import { DataTable } from "./xui/virtulized-data-table"

interface FMProps {
    wsUrl: string
}

type VirtualizedTableRowProps = HTMLAttributes<HTMLTableRowElement> & {
    "data-index"?: number | string
}

const uploadBufferLimitBytes = 8 * 1048576

// agent 的错误帧是 4 字节标识加一条错误文本（路径、系统错误信息），远小于这个长度；
// 而文件分片除最后一片外都是 1MiB。
const maxErrorFrameBytes = 16 * 1024

const arraysEqual = (a: Uint8Array, b: Uint8Array) => {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

export const FMComponent: React.FC<FMProps & JSX.IntrinsicElements["div"]> = ({
    wsUrl,
    ...props
}) => {
    const { t } = useTranslation()
    const fmRef = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const tRef = useRef(t)
    tRef.current = t

    const [dOpen, setdOpen] = useState(false)
    const [uOpen, setuOpen] = useState(false)

    const columns: ColumnDef<typeof virtualizedTableFeatures, FMEntry>[] = [
        {
            id: "type",
            header: () => <span>{t("Type")}</span>,
            accessorFn: (row) => row.type,
            cell: ({ row }) => (row.original.type == 0 ? <File size={24} /> : <Folder size={24} />),
        },
        {
            header: () => <span>{t("Name")}</span>,
            id: "name",
            accessorFn: (row) => row.name,
            cell: ({ row }) => (
                <div className="max-w-48 text-sm whitespace-normal break-words">
                    {row.original.name}
                </div>
            ),
            size: 5000,
        },
        {
            header: () => <span>{t("Actions")}</span>,
            id: "download",
            cell: ({ row }) => {
                return row.original.type == 0 ? (
                    <IconButton
                        variant="ghost"
                        icon="download"
                        onClick={() => {
                            if (!dOpen) setdOpen(true)
                            downloadFile(row.original.name)
                        }}
                    />
                ) : (
                    <Button size="icon" variant="ghost" className="pointer-events-none" />
                )
            },
        },
    ]

    const tableRowComponent = (rows: Row<typeof virtualizedTableFeatures, FMEntry>[]) =>
        function getTableRow(props: VirtualizedTableRowProps) {
            const index = Number(props["data-index"])
            const row = rows[index]

            if (!row) return null

            return (
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => {
                        if (row.original.type === 1) {
                            setPath(`${currentPath}/${row.original.name}`)
                        }
                    }}
                    className={row.original.type === 1 ? "cursor-pointer" : "cursor-default"}
                    {...props}
                >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                    ))}
                </TableRow>
            )
        }

    const [fmEntires, setFMEntries] = useState<FMEntry[]>([])

    const firstChunk = useRef(true)
    const handleReady = useRef(false)
    const currentBasename = useRef("temp")
    // 下载协议的分片没有帧头，只能靠首帧声明的总长度判断哪些帧仍属于本次下载。
    const downloadRemainingBytes = useRef(0)
    const discardingDownloadChunks = useRef(false)
    const uploadAborted = useRef(false)

    const resetDownloadState = () => {
        firstChunk.current = true
        handleReady.current = false
        discardingDownloadChunks.current = false
        downloadRemainingBytes.current = 0
    }

    // Worker 写入失败后 agent 仍会把剩余分片发完：这些帧必须按长度丢弃，
    // 否则要么永远等待句柄就绪（弹窗关不掉），要么被当成目录列表解析。
    const failDownload = (description: string) => {
        if (downloadRemainingBytes.current > 0) {
            discardingDownloadChunks.current = true
            handleReady.current = false
        } else {
            resetDownloadState()
        }
        setdOpen(false)
        toast("FM" + " " + tRef.current("Error"), { description })
    }

    const waitForHandleReady = async () => {
        while (!handleReady.current) {
            if (firstChunk.current || discardingDownloadChunks.current) return false
            await new Promise((resolve) => setTimeout(resolve, 10))
        }
        return true
    }

    useEffect(() => {
        worker.onmessage = async (event: MessageEvent<FMWorkerData>) => {
            switch (event.data.type) {
                case FMWorkerOpcode.Error: {
                    console.error("Error from worker", event.data.error)
                    if (!firstChunk.current) {
                        failDownload(event.data.error || tRef.current("Results.UnExpectedError"))
                    }
                    break
                }
                case FMWorkerOpcode.Progress: {
                    handleReady.current = true
                    break
                }
                case FMWorkerOpcode.Result: {
                    handleReady.current = false

                    if (event.data.blob && event.data.fileName) {
                        const url = URL.createObjectURL(event.data.blob)
                        const anchor = document.createElement("a")
                        anchor.href = url
                        anchor.download = event.data.fileName
                        anchor.click()
                        URL.revokeObjectURL(url)
                    }

                    resetDownloadState()
                    setdOpen(false)
                    break
                }
            }
        }

        const handleBeforeUnload = () => {
            worker.postMessage({
                operation: 3,
            })
        }

        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const [currentPath, setPath] = useState("")
    const currentPathRef = useRef(currentPath)
    currentPathRef.current = currentPath

    const listFile = useCallback(() => {
        const prefix = new Int8Array([FMOpcode.List])
        const pathMsg = new TextEncoder().encode(currentPathRef.current)

        const msg = new Int8Array(prefix.length + pathMsg.length)
        msg.set(prefix)
        msg.set(pathMsg, prefix.length)

        wsRef.current?.send(msg)
    }, [])

    // The WebSocket initialization must not depend on listFile or currentPath,
    // otherwise navigating directories triggers a disconnect and reconnect.
    useEffect(() => {
        const url = new URL(wsUrl, window.location.origin)
        url.protocol = url.protocol.replace("http", "ws")
        const ws = new WebSocket(url)
        wsRef.current = ws
        ws.binaryType = "arraybuffer"
        ws.onopen = () => {
            listFile()
        }
        ws.onclose = (e) => {
            console.log("WebSocket connection closed:", e)
            // 连接断开后不会再有完成帧或剩余分片，进行中的传输必须在这里收尾。
            uploadAborted.current = true
            if (!firstChunk.current) {
                worker.postMessage({ operation: 4 })
                resetDownloadState()
            }
            setdOpen(false)
            setuOpen(false)
        }
        ws.onerror = (e) => {
            console.error(e)
            toast("Websocket" + " " + tRef.current("Error"), {
                description: tRef.current("Results.UnExpectedError"),
            })
        }
        ws.onmessage = async (e: MessageEvent<ArrayBufferLike>) => {
            try {
                // 文件末尾的分片可能不足 4 字节，直接取标识会抛 RangeError。
                const identifier = new Uint8Array(e.data, 0, Math.min(4, e.data.byteLength))
                // 文件内容是不带帧头的原始分片，分片开头完全可能恰好是错误标识的 4 个字节。
                // 下载进行中只能靠长度区分：agent 每次读满 1MiB 就发一片，最后一片正好是
                // 剩余字节数；错误帧则是“标识 + 一小段错误文本”。所以长度等于剩余字节数、
                // 或明显超过错误文本长度的帧是文件内容，不能当成错误中止下载。
                const isDownloadContent =
                    !firstChunk.current &&
                    downloadRemainingBytes.current > 0 &&
                    (e.data.byteLength === downloadRemainingBytes.current ||
                        e.data.byteLength > maxErrorFrameBytes)
                if (!isDownloadContent && arraysEqual(identifier, FMIdentifier.error)) {
                    const errBytes = e.data.slice(4)
                    const errMsg = new TextDecoder("utf-8").decode(errBytes)
                    throw new Error(errMsg)
                }
                if (firstChunk.current) {
                    if (arraysEqual(identifier, FMIdentifier.file)) {
                        const totalBytes = Number(new DataView(e.data).getBigUint64(4, false))
                        downloadRemainingBytes.current = totalBytes - (e.data.byteLength - 12)
                        discardingDownloadChunks.current = false
                        worker.postMessage({
                            operation: 1,
                            arrayBuffer: e.data,
                            fileName: currentBasename.current,
                        })
                        firstChunk.current = false
                    } else if (arraysEqual(identifier, FMIdentifier.fileName)) {
                        const { path, fmList } = await fm.parseFMList(e.data)
                        setPath(path)
                        setFMEntries(fmList)
                    } else if (arraysEqual(identifier, FMIdentifier.complete)) {
                        // Upload completed
                        setuOpen(false)
                        listFile()
                    } else {
                        throw new Error(tRef.current("Results.UnknownIdentifier"))
                    }
                } else {
                    downloadRemainingBytes.current -= e.data.byteLength
                    if (discardingDownloadChunks.current) {
                        if (downloadRemainingBytes.current <= 0) resetDownloadState()
                        return
                    }
                    if (!(await waitForHandleReady())) return
                    worker.postMessage({
                        operation: 2,
                        arrayBuffer: e.data,
                        fileName: currentBasename.current,
                    })
                }
            } catch (error) {
                console.error("Error processing received data:", error)
                toast("FM" + " " + tRef.current("Error"), {
                    description: tRef.current("Results.UnExpectedError"),
                })
                // agent 报错后不会再发剩余分片：不复位的话后续目录列表会被当成
                // 文件分片写进临时文件，上传循环也会继续发送无人接收的数据。
                uploadAborted.current = true
                if (!firstChunk.current) {
                    worker.postMessage({ operation: 4 })
                    resetDownloadState()
                }
                setdOpen(false)
                setuOpen(false)
            }
        }

        return () => {
            ws.close()
            if (wsRef.current === ws) {
                wsRef.current = null
            }
        }
    }, [listFile, wsUrl])

    useEffect(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            listFile()
        }
    }, [currentPath, listFile])

    const downloadFile = (basename: string) => {
        currentBasename.current = basename
        const prefix = new Int8Array([FMOpcode.Download])
        const filePathMessage = new TextEncoder().encode(`${currentPath}/${basename}`)

        const msg = new Int8Array(prefix.length + filePathMessage.length)
        msg.set(prefix)
        msg.set(filePathMessage, prefix.length)

        wsRef.current?.send(msg)
    }

    const uploadFile = async (file: File) => {
        const chunkSize = 1048576 // 1MB chunk
        let offset = 0

        // 连接断开后 send 只会静默丢数据，弹窗也永远等不到完成帧。
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            setuOpen(false)
            toast("FM" + " " + t("Error"), { description: t("Results.UnExpectedError") })
            return
        }
        uploadAborted.current = false

        // Send header
        const header = fm.buildUploadHeader({ path: currentPath, file: file })
        ws.send(header)

        // Send data chunks
        while (offset < file.size) {
            // 不看 bufferedAmount 会把整个文件堆进浏览器发送缓冲区。
            while (
                ws.bufferedAmount > uploadBufferLimitBytes &&
                ws.readyState === WebSocket.OPEN &&
                !uploadAborted.current
            ) {
                await new Promise((resolve) => setTimeout(resolve, 20))
            }
            if (uploadAborted.current || ws.readyState !== WebSocket.OPEN) {
                setuOpen(false)
                return
            }
            const chunk = file.slice(offset, offset + chunkSize)
            const arrayBuffer = await fm.readFileAsArrayBuffer(chunk)
            if (arrayBuffer) ws.send(arrayBuffer)
            offset += chunkSize
        }
    }

    const fileInputRef = useRef<HTMLInputElement>(null)

    const [gotoPath, setGotoPath] = useState("")
    return (
        <div ref={fmRef} {...props}>
            <div className="flex justify-center items-center gap-4">
                <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <IconButton variant="ghost" icon="menu" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={listFile}>{t("Refresh")}</DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={async () => {
                                    try {
                                        await copyToClipboard(formatPath(currentPath))
                                    } catch (error) {
                                        const description =
                                            error instanceof Error
                                                ? error.message
                                                : t("Results.UnExpectedError")
                                        toast("FM" + " " + t("Error"), {
                                            description,
                                        })
                                        console.error("copy error: ", error)
                                    }
                                }}
                            >
                                {t("CopyPath")}
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem>{t("Goto")}</DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t("Goto")}</AlertDialogTitle>
                            <AlertDialogDescription />
                        </AlertDialogHeader>
                        <Input
                            className="mb-1"
                            placeholder="Path"
                            value={gotoPath}
                            onChange={(e) => {
                                setGotoPath(e.target.value)
                            }}
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t("Close")}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    setPath(gotoPath)
                                }}
                            >
                                {t("Confirm")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <h1 className="text-base">{t("FileManager")}</h1>
                <div className="ml-auto">
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={async (e) => {
                            const files = e.target.files
                            if (files && files.length > 0) {
                                if (!uOpen) setuOpen(true)
                                await uploadFile(files[0])
                            }
                        }}
                    />
                    <IconButton
                        icon="upload"
                        variant="ghost"
                        onClick={() => {
                            if (fileInputRef.current) fileInputRef.current.click()
                        }}
                    />
                </div>
            </div>
            <Filepath path={currentPath} setPath={setPath} />
            <AlertDialog open={dOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("Downloading")}...</AlertDialogTitle>
                        <AlertDialogDescription />
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={uOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("Uploading")}...</AlertDialogTitle>
                        <AlertDialogDescription />
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>
            <DataTable columns={columns} data={fmEntires} rowComponent={tableRowComponent} />
        </div>
    )
}

export const FMCard = ({ id }: { id?: string }) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [fm, setFM] = useState<ModelCreateFMResponse | null>(null)
    const [init, setInit] = useState(false)

    const isDesktop = useMediaQuery("(min-width: 640px)")

    const fetchFM = async () => {
        if (id) {
            try {
                setInit(false)
                const createdFM = await createFM(id)
                setFM(createdFM)
            } catch (e) {
                toast(t("Error"), {
                    description: t("Results.UnExpectedError"),
                })
                console.error("fetch error", e)
                return
            }
            setInit(true)
        }
    }

    return isDesktop ? (
        <Sheet
            modal={false}
            open={open}
            onOpenChange={(isOpen) => {
                if (isOpen) setOpen(true)
            }}
        >
            <SheetTrigger asChild>
                <IconButton icon="folder-closed" onClick={fetchFM} />
            </SheetTrigger>
            <SheetContent setOpen={setOpen} className="min-w-[35%]">
                <div className="overflow-auto">
                    <SheetTitle />
                    <SheetHeader className="pb-2">
                        <SheetDescription />
                    </SheetHeader>
                    {fm?.session_id && init ? (
                        <FMComponent
                            className="p-1 space-y-5"
                            wsUrl={`/api/v1/ws/file/${fm.session_id}`}
                        />
                    ) : (
                        <p>{t("Results.TheServerDoesNotOnline")}</p>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    ) : (
        <Drawer>
            <DrawerTrigger asChild>
                <IconButton icon="folder-closed" onClick={fetchFM} />
            </DrawerTrigger>
            <DrawerContent className="min-h-[60%] p-4">
                <div className="overflow-auto">
                    <DrawerTitle />
                    <DrawerHeader className="pb-2">
                        <SheetDescription />
                    </DrawerHeader>
                    {fm?.session_id && init ? (
                        <FMComponent
                            className="p-1 space-y-5"
                            wsUrl={`/api/v1/ws/file/${fm.session_id}`}
                        />
                    ) : (
                        <p>{t("Results.TheServerDoesNotOnline")}</p>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
