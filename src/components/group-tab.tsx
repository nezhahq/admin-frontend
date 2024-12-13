import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"

export const GroupTab = ({ className }: { className?: string }) => {
    const { t } = useTranslation()
    const location = useLocation()

    return (
        <Tabs defaultValue={location.pathname} className={className}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="/dashboard/server-group" asChild>
                    <Link to="/dashboard/server-group">{t("Server")}</Link>
                </TabsTrigger>
                <TabsTrigger value="/dashboard/notification-group" asChild>
                    <Link to="/dashboard/notification-group">{t("Notification")}</Link>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
