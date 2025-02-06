import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import useTerminal from "@/hooks/useTerminal"
import { sleep } from "@/lib/utils"
import { AttachAddon } from "@xterm/addon-attach"
import { FitAddon } from "@xterm/addon-fit"
import { Terminal } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { FMCard } from "./fm"
import { Button } from "./ui/button"
import { IconButton } from "./xui/icon-button"

interface XtermProps {
    wsUrl: string
    setClose: React.Dispatch<React.SetStateAction<boolean>>
}

const XtermComponent = forwardRef<HTMLDivElement, XtermProps & JSX.IntrinsicElements["div"]>(
    ({ wsUrl, setClose, ...props }, ref) => {
        const terminalIdRef = useRef<HTMLDivElement>(null)
        const terminalRef = useRef<Terminal | null>(null)
        const wsRef = useRef<WebSocket | null>(null)

        useImperativeHandle(ref, () => {
            return {
                ...terminalIdRef.current!,
                async requestFullscreen() {
                    await terminalIdRef.current?.requestFullscreen()
                },
            }
        }, [])

        useEffect(() => {
            return () => {
                wsRef.current?.close()
                terminalRef.current?.dispose()
            }
        }, [])

        useEffect(() => {
            terminalRef.current = new Terminal({
                cursorBlink: true,
                fontSize: 16,
            })
            const url = new URL(wsUrl, window.location.origin)
            url.protocol = url.protocol.replace("http", "ws")
            const ws = new WebSocket(url)
            wsRef.current = ws
            ws.binaryType = "arraybuffer"
            ws.onopen = () => {
                onResize()
            }
            ws.onclose = () => {
                terminalRef.current?.dispose()
                setClose(true)
            }
            ws.onerror = (e) => {
                console.error(e)
                toast("Websocket error", {
                    description: "View console for details.",
                })
            }
        }, [wsUrl])

        const fitAddon = useRef(new FitAddon()).current
        const sendResize = useRef(false)

        const doResize = () => {
            if (!terminalIdRef.current) return

            fitAddon.fit()

            const dimensions = fitAddon.proposeDimensions()

            if (dimensions) {
                const prefix = new Int8Array([1])
                const resizeMessage = new TextEncoder().encode(
                    JSON.stringify({
                        Rows: dimensions.rows,
                        Cols: dimensions.cols,
                    }),
                )

                const msg = new Int8Array(prefix.length + resizeMessage.length)
                msg.set(prefix)
                msg.set(resizeMessage, prefix.length)

                wsRef.current?.send(msg)
            }
        }

        const onResize = async () => {
            if (sendResize.current) return

            sendResize.current = true
            try {
                await sleep(1500)
                doResize()
            } catch (error) {
                console.error("resize error", error)
            } finally {
                sendResize.current = false
            }
        }

        useEffect(() => {
            if (!wsRef.current || !terminalIdRef.current || !terminalRef.current) return
            const attachAddon = new AttachAddon(wsRef.current)
            terminalRef.current.loadAddon(attachAddon)
            terminalRef.current.loadAddon(fitAddon)
            terminalRef.current.open(terminalIdRef.current)
            window.addEventListener("resize", onResize)
            return () => {
                window.removeEventListener("resize", onResize)
                if (wsRef.current) {
                    wsRef.current.close()
                }
            }
        }, [wsRef.current, terminalRef.current, terminalIdRef.current])

        return <div ref={terminalIdRef} {...props} />
    },
)

export const TerminalPage = () => {
    const { id } = useParams<{ id: string }>()
    const [open, setOpen] = useState(false)
    const terminal = useTerminal(id ? parseInt(id) : undefined)
    const terminalIdRef = useRef<HTMLDivElement>(null)
    return (
        <div className="px-8">
            <div className="flex mt-6 mb-4">
                <h1 className="flex-1 text-3xl font-bold tracking-tight">{`Terminal (${id})`}</h1>
                <div className="flex-2 flex ml-auto gap-2">
                    <IconButton
                        icon="expand"
                        onClick={async () => {
                            await terminalIdRef.current?.requestFullscreen()
                        }}
                    />
                    <FMCard id={id} />
                </div>
            </div>
            {terminal?.session_id ? (
                <XtermComponent
                    ref={terminalIdRef}
                    className="max-h-[60%] mb-5 overflow-auto"
                    wsUrl={`/api/v1/ws/terminal/${terminal?.session_id}`}
                    setClose={setOpen}
                />
            ) : (
                <p>The server does not exist, or have not been connected yet.</p>
            )}
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent className="sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Session completed</AlertDialogTitle>
                        <AlertDialogDescription>
                            You may close this window now.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction asChild>
                            <Button onClick={window.close}>Close</Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export const TerminalButton = ({ id }: { id: number }) => {
    const handleOpenNewTab = () => {
        window.open(`/dashboard/terminal/${id}`, "_blank")
    }

    return <IconButton variant="outline" icon="terminal" onClick={handleOpenNewTab} />
}
