import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Link, useLocation } from "react-router-dom"

export const GroupTab = () => {
    const location = useLocation();

    return (
        <Tabs defaultValue={location.pathname}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="/dashboard/server-group" asChild>
                    <Link to="/dashboard/server-group">Server</Link>
                </TabsTrigger>
                <TabsTrigger value="/dashboard/notification-group" asChild>
                    <Link to="/dashboard/notification-group">Notification</Link>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
