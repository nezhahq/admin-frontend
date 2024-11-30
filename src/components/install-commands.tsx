import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button, ButtonProps } from "@/components/ui/button"
import { forwardRef, useState } from "react"
import { Check, Clipboard } from "lucide-react"
import { t } from "i18next"

export const InstallCommandsMenu = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    const [copy, setCopy] = useState(false);

    const switchState = async () => {
        if (!copy) {
            setCopy(true);
            await navigator.clipboard.writeText("stub");
            setTimeout(() => {
                setCopy(false);
            }, 1000);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button {...props} ref={ref}>
                    {copy ? <Check /> : <Clipboard />}
                    {t("InstallCommands")}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={switchState}>Linux</DropdownMenuItem>
                <DropdownMenuItem onClick={switchState}>macOS</DropdownMenuItem>
                <DropdownMenuItem onClick={switchState}>Windows</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
})
