import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

export const SettingsTab = ({ className }: { className?: string }) => {
    const { t } = useTranslation()
    const { profile } = useAuth()
    const navigate = useNavigate()

    const isAdmin = profile?.role === 0

    const defaultTab = isAdmin ? "/dashboard/settings" : "/dashboard/settings/waf"

    // 如不为管理员，直接跳转到 WAF 页面
    useEffect(() => {
        if (!isAdmin) {
            navigate("/dashboard/settings/waf")
        }
    }, [isAdmin, navigate])

    return (
        <Tabs defaultValue={defaultTab} className={className}>
            <TabsList className="grid w-full grid-cols-3">
                {isAdmin && (
                    <>
                        <TabsTrigger value="/dashboard/settings" asChild>
                            <Link to="/dashboard/settings">{t("Settings")}</Link>
                        </TabsTrigger>
                        <TabsTrigger value="/dashboard/settings/user" asChild>
                            <Link to="/dashboard/settings/user">{t("User")}</Link>
                        </TabsTrigger>
                    </>
                )}
                <TabsTrigger value="/dashboard/settings/waf" asChild>
                    <Link to="/dashboard/settings/waf">{t("WAF")}</Link>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
