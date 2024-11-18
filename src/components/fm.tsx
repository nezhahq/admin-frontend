import { useEffect, useState, useRef } from "react"
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "./xui/overlayless-sheet"
import { IconButton } from "./xui/icon-button"
import { createFM } from "@/api/fm"
import { ModelCreateFMResponse } from "@/types"
import useWebSocket from "react-use-websocket"
import { toast } from "sonner"

interface FMProps {
    wsUrl: string;
}

const FMComponent: React.FC<FMProps & JSX.IntrinsicElements["div"]> = ({ wsUrl, ...props }) => {
    const fmRef = useRef<HTMLDivElement>(null);

    const { sendMessage } = useWebSocket(wsUrl, {
        share: false,
        onOpen: () => {
            listFile();
        },
        onClose: (e) => {
            console.log('WebSocket connection closed:', e);
        },
        onError: (e) => {
            console.log(e);
            toast("Websocket error", {
                description: "View console for details.",
            })
        },
        onMessage: async (e) => {

        }
    });

    const currentPath = useRef('').current;

    const listFile = () => {
        const prefix = new Int8Array([0]);
        const resizeMessage = new TextEncoder().encode(currentPath);

        const msg = new Int8Array(prefix.length + resizeMessage.length);
        msg.set(prefix);
        msg.set(resizeMessage, prefix.length);

        sendMessage(msg);
    }

    return <div ref={fmRef} {...props} />;
}

export const FMCard = ({ id }: { id?: string }) => {
    const [open, setOpen] = useState(false);
    const [fm, setFM] = useState<ModelCreateFMResponse | null>(null);

    const fetchFM = async () => {
        if (id && !fm) {
            try {
                const createdFM = await createFM(id);
                setFM(createdFM);
            } catch (e) {
                toast("FM API Error", {
                    description: "View console for details.",
                })
                console.log("fetch error", e);
                return;
            }
        }
    }

    return (
        <Sheet modal={false} open={open} onOpenChange={(isOpen) => { if (isOpen) setOpen(true); }}>
            <SheetTrigger asChild>
                <IconButton icon="folder-closed" onClick={fetchFM} />
            </SheetTrigger>
            <SheetContent setOpen={setOpen}>
                <SheetHeader>
                    <SheetTitle>Pseudo File Manager</SheetTitle>
                    <SheetDescription />
                </SheetHeader>
                <div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
