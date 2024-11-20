import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Link, useLocation } from "react-router-dom"

export const NotificationTab = ({ className }: { className?: string }) => {
    const location = useLocation();

    return (
        <Tabs defaultValue={location.pathname} className={className}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="/dashboard/notification" asChild>
                    <Link to="/dashboard/notification">Notifier</Link>
                </TabsTrigger>
                <TabsTrigger value="/dashboard/alert-rule" asChild>
                    <Link to="/dashboard/alert-rule">Alert Rule</Link>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
