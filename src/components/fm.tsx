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
import { HTMLAttributes, useEffect, useRef, useState } from "react"
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

const arraysEqual = (a: Uint8Array, b: Uint8Array) => {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

const FMComponent: React.FC<FMProps & JSX.IntrinsicElements["div"]> = ({ wsUrl, ...props }) => {
    const { t } = useTranslation()
    const fmRef = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WebSocket | null>(null)

    useEffect(() => {
        return () => {
            wsRef.current?.close()
        }
    }, [])

    const [dOpen, setdOpen] = useState(false)
    const [uOpen, setuOpen] = useState(false)

    const columns: ColumnDef<FMEntry>[] = [
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

    const tableRowComponent = (rows: Row<FMEntry>[]) =>
        function getTableRow(props: HTMLAttributes<HTMLTableRowElement>) {
            // @ts-expect-error data-index is a valid attribute
            const index = props["data-index"]
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

    const waitForHandleReady = async () => {
        while (!handleReady.current) {
            await new Promise((resolve) => setTimeout(resolve, 10))
        }
    }

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
        }
        ws.onerror = (e) => {
            console.error(e)
            toast("Websocket" + " " + t("Error"), {
                description: t("Results.UnExpectedError"),
            })
        }
        ws.onmessage = async (e: MessageEvent<ArrayBufferLike>) => {
            try {
                const identifier = new Uint8Array(e.data, 0, 4)
                if (arraysEqual(identifier, FMIdentifier.error)) {
                    const errBytes = e.data.slice(4)
                    const errMsg = new TextDecoder("utf-8").decode(errBytes)
                    throw new Error(errMsg)
                }

                if (firstChunk.current) {
                    if (arraysEqual(identifier, FMIdentifier.file)) {
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
                        throw new Error(t("Results.UnknownIdentifier"))
                    }
                } else {
                    await waitForHandleReady()
                    worker.postMessage({
                        operation: 2,
                        arrayBuffer: e.data,
                        fileName: currentBasename.current,
                    })
                }
            } catch (error) {
                console.error("Error processing received data:", error)
                toast("FM" + " " + t("Error"), {
                    description: t("Results.UnExpectedError"),
                })
                setdOpen(false)
                setuOpen(false)
            }
        }
    }, [wsUrl])

    useEffect(() => {
        worker.onmessage = async (event: MessageEvent<FMWorkerData>) => {
            switch (event.data.type) {
                case FMWorkerOpcode.Error: {
                    console.error("Error from worker", event.data.error)
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

                    firstChunk.current = true
                    if (dOpen) setdOpen(false)
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
    }, [worker, dOpen])

    const [currentPath, setPath] = useState("")
    useEffect(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            listFile()
        }
    }, [wsRef.current, currentPath])

    const listFile = () => {
        const prefix = new Int8Array([FMOpcode.List])
        const pathMsg = new TextEncoder().encode(currentPath)

        const msg = new Int8Array(prefix.length + pathMsg.length)
        msg.set(prefix)
        msg.set(pathMsg, prefix.length)

        wsRef.current?.send(msg)
    }

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

        // Send header
        const header = fm.buildUploadHeader({ path: currentPath, file: file })
        wsRef.current?.send(header)

        // Send data chunks
        while (offset < file.size) {
            const chunk = file.slice(offset, offset + chunkSize)
            const arrayBuffer = await fm.readFileAsArrayBuffer(chunk)
            if (arrayBuffer) wsRef.current?.send(arrayBuffer)
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
                                    } catch (error: any) {
                                        toast("FM" + " " + t("Error"), {
                                            description: error.message,
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
