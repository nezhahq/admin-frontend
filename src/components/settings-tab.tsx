import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

export const SettingsTab = ({ className }: { className?: string }) => {
    const { t } = useTranslation()
    const { profile } = useAuth()

    const isAdmin = profile?.role === 0

    return (
        <Tabs defaultValue={window.location.pathname} className={className}>
            <TabsList className="grid w-full grid-cols-4">
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
                <TabsTrigger value="/dashboard/settings/online-user" asChild>
                    <Link to="/dashboard/settings/online-user">{t("OnlineUser")}</Link>
                </TabsTrigger>
                <TabsTrigger value="/dashboard/settings/waf" asChild>
                    <Link to="/dashboard/settings/waf">{t("WAF")}</Link>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
