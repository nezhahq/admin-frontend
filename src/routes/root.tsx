import Header from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import useSetting from "@/hooks/useSetting"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Outlet } from "react-router-dom"

export default function Root() {
    const { t } = useTranslation()
    const settings = useSetting()

    useEffect(() => {
        document.title = settings?.site_name || "哪吒监控 Nezha Monitoring"
    }, [settings])

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <section className="text-sm mx-auto h-full flex flex-col justify-between">
                <div>
                    <Header />
                    <div className="max-w-5xl mx-auto">
                        <Outlet />
                    </div>
                </div>
                <footer className="mx-5 pb-5 text-foreground/50 font-light text-xs text-center">
                    &copy; 2019-2024 {t("nezha")} {settings?.version}
                </footer>
            </section>
            <Toaster />
        </ThemeProvider>
    )
}
