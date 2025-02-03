import { Button, ButtonProps } from "@/components/ui/button"
import {
    BanIcon,
    Check,
    CircleArrowUp,
    Clipboard,
    CogIcon,
    Download,
    Edit2,
    Expand,
    FolderClosed,
    Menu,
    Minus,
    Play,
    Plus,
    Terminal,
    Trash2,
    Upload,
} from "lucide-react"
import { forwardRef } from "react"

export interface IconButtonProps extends ButtonProps {
    icon:
        | "clipboard"
        | "check"
        | "edit"
        | "trash"
        | "plus"
        | "terminal"
        | "update"
        | "folder-closed"
        | "play"
        | "download"
        | "upload"
        | "menu"
        | "ban"
        | "expand"
        | "cog"
        | "minus"
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => {
    return (
        <Button
            className="rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            {...props}
            ref={ref}
            size="icon"
        >
            {(() => {
                switch (props.icon) {
                    case "clipboard": {
                        return <Clipboard />
                    }
                    case "check": {
                        return <Check />
                    }
                    case "edit": {
                        return <Edit2 />
                    }
                    case "trash": {
                        return <Trash2 />
                    }
                    case "plus": {
                        return <Plus />
                    }
                    case "terminal": {
                        return <Terminal />
                    }
                    case "update": {
                        return <CircleArrowUp />
                    }
                    case "folder-closed": {
                        return <FolderClosed />
                    }
                    case "play": {
                        return <Play />
                    }
                    case "download": {
                        return <Download />
                    }
                    case "upload": {
                        return <Upload />
                    }
                    case "menu": {
                        return <Menu />
                    }
                    case "ban": {
                        return <BanIcon />
                    }
                    case "expand": {
                        return <Expand />
                    }
                    case "cog": {
                        return <CogIcon />
                    }
                    case "minus": {
                        return <Minus />
                    }
                }
            })()}
        </Button>
    )
})
