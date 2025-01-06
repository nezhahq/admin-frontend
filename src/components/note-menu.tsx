import { ButtonProps } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { copyToClipboard } from "@/lib/utils"
import { forwardRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { IconButton } from "./xui/icon-button"

interface NoteMenuProps extends ButtonProps {
    note: { private?: string; public?: string }
}

export const NoteMenu = forwardRef<HTMLButtonElement, NoteMenuProps>((props, ref) => {
    const { t } = useTranslation()
    const [copy, setCopy] = useState(false)

    const switchState = async (text?: string) => {
        if (!text) {
            toast("Warning", {
                description: t("EmptyNote"),
            })
            return
        }

        if (!copy) {
            setCopy(true)
            await copyToClipboard(text)
            setTimeout(() => {
                setCopy(false)
            }, 2 * 1000)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <IconButton
                    {...props}
                    ref={ref}
                    variant="outline"
                    size="icon"
                    icon={copy ? "check" : "clipboard"}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem
                    onClick={() => {
                        switchState(props.note.private)
                    }}
                >
                    {t("Private")}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => {
                        switchState(props.note.public)
                    }}
                >
                    {t("Public")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
})
