import { Plus, Edit2, Trash2, Terminal, CircleArrowUp, Clipboard, Check, FolderClosed } from "lucide-react"
import { Button, ButtonProps } from "@/components/ui/button"
import { forwardRef } from "react";

export interface IconButtonProps extends ButtonProps {
    icon: "clipboard" | "check" | "edit" | "trash" | "plus" | "terminal" | "update" | "folder-closed";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => {
    return (
        <Button {...props} ref={ref} size="icon">
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
                }
            })()}
        </Button>
    );
})
