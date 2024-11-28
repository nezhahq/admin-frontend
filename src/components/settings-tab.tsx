import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Link, useLocation } from "react-router-dom"

import { useTranslation } from "react-i18next";

export const SettingsTab = ({ className }: { className?: string }) => {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <Tabs defaultValue={location.pathname} className={className}>
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="/dashboard/settings" asChild>
                    <Link to="/dashboard/settings">{t("Settings")}</Link>
                </TabsTrigger>
                <TabsTrigger value="/dashboard/settings/user" asChild>
                    <Link to="/dashboard/settings/user">{t("User")}</Link>
                </TabsTrigger>
                <TabsTrigger value="/dashboard/settings/waf" asChild>
                    <Link to="/dashboard/settings/waf">{t("WAF")}</Link>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
