import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Link, useLocation } from "react-router-dom"

export const SettingsTab = ({ className }: { className?: string }) => {
    const location = useLocation();

    return (
        <Tabs defaultValue={location.pathname} className={className}>
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="/dashboard/settings" asChild>
                    <Link to="/dashboard/settings">Config</Link>
                </TabsTrigger>
                <TabsTrigger value="/dashboard/settings/user" asChild>
                    <Link to="/dashboard/settings/user">User</Link>
                </TabsTrigger>
                <TabsTrigger value="/dashboard/settings/waf" asChild>
                    <Link to="/dashboard/settings/waf">WAF</Link>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
