import { Theme, useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

export function ModeToggle() {
    const { t } = useTranslation()
    const { setTheme } = useTheme()

    const toggleTheme = (theme: Theme) => {
        setTheme(theme)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="focus-visible:ring-0" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toggleTheme("light")}>
                    {t("theme.light")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleTheme("dark")}>
                    {t("theme.dark")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleTheme("system")}>
                    {t("theme.system")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
