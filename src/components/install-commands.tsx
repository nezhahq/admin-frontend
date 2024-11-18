import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ButtonProps } from "@/components/ui/button"
import { forwardRef, useState } from "react"
import { IconButton } from "./xui/icon-button"

export const InstallCommandsMenu = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    const [copy, setCopy] = useState(false);

    const switchState = async () => {
        if (!copy) {
            setCopy(true);
            await navigator.clipboard.writeText("stub");
            setTimeout(() => {
                setCopy(false);
            }, 2 * 1000);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <IconButton {...props} ref={ref} variant="outline" size="icon" icon={
                    copy ? "check" : "clipboard"
                } />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={switchState}>Linux</DropdownMenuItem>
                <DropdownMenuItem onClick={switchState}>macOS</DropdownMenuItem>
                <DropdownMenuItem onClick={switchState}>Windows</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
})
