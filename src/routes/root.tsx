import Header from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import useSetting from "@/hooks/useSetting"
import i18n from "@/lib/i18n"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Outlet } from "react-router-dom"

export default function Root() {
    const { t } = useTranslation()
    const { data: settingData, error } = useSetting()

    useEffect(() => {
        document.title = settingData?.site_name || "哪吒监控 Nezha Monitoring"
    }, [settingData])

    const InjectContext = useCallback((content: string) => {
        document.getElementById("nezha-custom-code")?.remove()
        const tempDiv = document.createElement("div")
        tempDiv.id = "nezha-custom-code"
        tempDiv.innerHTML = content
        document.body.appendChild(tempDiv)
    }, [])

    if (error) {
        throw error
    }

    if (!settingData) {
        return null
    }

    if (settingData?.language && !localStorage.getItem("language")) {
        i18n.changeLanguage(settingData?.language)
    }

    if (settingData?.custom_code_dashboard) {
        InjectContext(settingData?.custom_code_dashboard)
    }

    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <section className="text-sm mx-auto h-full flex flex-col justify-between">
                <div>
                    <Header />
                    <div className="max-w-5xl mx-auto">
                        <Outlet />
                    </div>
                </div>
                <footer className="mx-5 pb-5 text-foreground/50 font-light text-xs text-center">
                    &copy; 2019-2024 {t("nezha")} {settingData?.version}
                </footer>
            </section>
            <Toaster />
        </ThemeProvider>
    )
}
