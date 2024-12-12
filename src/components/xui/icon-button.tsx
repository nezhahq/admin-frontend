import {
    Plus,
    Edit2,
    Trash2,
    Terminal,
    CircleArrowUp,
    Clipboard,
    Check,
    FolderClosed,
    Play,
    Download,
    Upload,
    Menu,
} from "lucide-react"
import { Button, ButtonProps } from "@/components/ui/button"
import { forwardRef } from "react";

export interface IconButtonProps extends ButtonProps {
    icon:
    "clipboard" |
    "check" |
    "edit" |
    "trash" |
    "plus" |
    "terminal" |
    "update" |
    "folder-closed" |
    "play" |
    "download" |
    "upload" |
    "menu";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => {
    return (
        <Button className="rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" {...props} ref={ref} size="icon">
            {(() => {
                switch (props.icon) {
                case "clipboard": {
                    return <Clipboard />;
                }
                case "check": {
                    return <Check />;
                }
                case "edit": {
                    return <Edit2 />;
                }
                case "trash": {
                    return <Trash2 />;
                }
                case "plus": {
                    return <Plus />;
                }
                case "terminal": {
                    return <Terminal />;
                }
                case "update": {
                    return <CircleArrowUp />;
                }
                case "folder-closed": {
                    return <FolderClosed />;
                }
                case "play": {
                    return <Play />;
                }
                case "download": {
                    return <Download />;
                }
                case "upload": {
                    return <Upload />;
                }
                case "menu": {
                    return <Menu />;
                }
                }
            })()}
        </Button>
    );
})
