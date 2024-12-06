import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Terminal } from "@xterm/xterm";
import { AttachAddon } from "@xterm/addon-attach";
import { FitAddon } from '@xterm/addon-fit';
import { useRef, useEffect, useState } from "react";
import { sleep } from "@/lib/utils";
import { IconButton } from "./xui/icon-button";
import "@xterm/xterm/css/xterm.css";
import { createTerminal } from "@/api/terminal";
import { ModelCreateTerminalResponse } from "@/types";
import { useParams } from 'react-router-dom';
import { Button } from "./ui/button";
import { toast } from "sonner";
import { FMCard } from "./fm";

interface XtermProps {
    wsUrl: string;
    setClose: React.Dispatch<React.SetStateAction<boolean>>;
}

const XtermComponent: React.FC<XtermProps & JSX.IntrinsicElements["div"]> = ({ wsUrl, setClose, ...props }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.binaryType = "arraybuffer";
        ws.onopen = () => {
            onResize();
        }
        ws.onclose = () => {
            terminal.dispose();
            setClose(true);
        }
        ws.onerror = (e) => {
            console.error(e);
            toast("Websocket error", {
                description: "View console for details.",
            })
        }
    }, [wsUrl]);

    const terminal = useRef(
        new Terminal({
            cursorBlink: true,
            fontSize: 16,
        })
    ).current;

    const fitAddon = useRef(new FitAddon()).current;
    const sendResize = useRef(false);

    const doResize = () => {
        if (!terminalRef.current) return;

        fitAddon.fit();

        const dimensions = fitAddon.proposeDimensions();

        if (dimensions) {
            const prefix = new Int8Array([1]);
            const resizeMessage = new TextEncoder().encode(JSON.stringify({
                Rows: dimensions.rows,
                Cols: dimensions.cols,
            }));

            const msg = new Int8Array(prefix.length + resizeMessage.length);
            msg.set(prefix);
            msg.set(resizeMessage, prefix.length);

            wsRef.current?.send(msg);
        }
    };

    const onResize = async () => {
        if (sendResize.current) return;

        sendResize.current = true;
        try {
            await sleep(1500);
            doResize();
        } catch (error) {
            console.error('resize error', error);
        } finally {
            sendResize.current = false;
        }
    };

    useEffect(() => {
        if (!wsRef.current || !terminalRef.current) return;
        const attachAddon = new AttachAddon(wsRef.current);
        terminal.loadAddon(attachAddon);
        terminal.loadAddon(fitAddon);
        terminal.open(terminalRef.current);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [wsRef.current, terminal]);

    return <div ref={terminalRef} {...props} />;
};

export const TerminalPage = () => {
    const [terminal, setTerminal] = useState<ModelCreateTerminalResponse | null>(null);
    const [open, setOpen] = useState(false);

    const { id } = useParams<{ id: string }>();

    const fetchTerminal = async () => {
        if (id && !terminal) {
            try {
                const createdTerminal = await createTerminal(Number(id));
                setTerminal(createdTerminal);
            } catch (e) {
                toast("Terminal API Error", {
                    description: "View console for details.",
                })
                console.error("fetch error", e);
                return;
            }
        }
    }

    useEffect(() => {
        fetchTerminal();
    }, [id]);

    return (
        <div className="px-8">
            <div className="flex mt-6 mb-4">
                <h1 className="flex-1 text-3xl font-bold tracking-tight">
                    {`Terminal (${id})`}
                </h1>
                <div className="flex-2 flex ml-auto gap-2">
                    <FMCard id={id} />
                </div>
            </div>
            {terminal?.session_id
                ?
                <XtermComponent className="max-h-[60%] mb-5" wsUrl={`/api/v1/ws/terminal/${terminal.session_id}`} setClose={setOpen} />
                :
                <p>The server does not exist, or have not been connected yet.</p>
            }
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
                            <Button onClick={window.close}>
                                Close
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export const TerminalButton = ({ id }: { id: number }) => {
    const handleOpenNewTab = () => {
        window.open(`/dashboard/terminal/${id}`, '_blank');
    };

    return (
        <IconButton variant="outline" icon="terminal" onClick={handleOpenNewTab} />
    )
}
