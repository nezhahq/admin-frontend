import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { ModeToggle } from "@/components/mode-toggle";
import { Card } from "./ui/card";
import { useMainStore } from "@/hooks/useMainStore";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { NzNavigationMenuLink } from "./xui/navigation-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";

export default function Header() {
    const { logout } = useAuth();
    const profile = useMainStore(store => store.profile);

    const location = useLocation();

    return <header className="h-16 flex items-center border-b-2 px-4 overflow-x-auto">
        <NavigationMenu className="sm:max-w-full">
            <NavigationMenuList>
                <Card>
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle() + ' !text-foreground'}>
                        <Link to="/dashboard"><img className="h-7 mr-1" src='/dashboard/logo.svg' /> 哪吒监控</Link>
                    </NavigationMenuLink>
                </Card>

                {
                    profile && <>
                        <NavigationMenuItem>
                            <NzNavigationMenuLink asChild active={location.pathname === "/dashboard"} className={navigationMenuTriggerStyle()}>
                                <Link to="/dashboard">Server</Link>
                            </NzNavigationMenuLink>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/service"} className={navigationMenuTriggerStyle()}>
                                <Link to="/dashboard/service">Service</Link>
                            </NzNavigationMenuLink>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/cron"} className={navigationMenuTriggerStyle()}>
                                <Link to="/dashboard/cron">Task</Link>
                            </NzNavigationMenuLink>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/notification" || location.pathname === "/dashboard/alert-rule"} className={navigationMenuTriggerStyle()}>
                                <Link to="/dashboard/notification">Notification</Link>
                            </NzNavigationMenuLink>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/ddns"} className={navigationMenuTriggerStyle()}>
                                <Link to="/dashboard/ddns">Dynamic DNS</Link>
                            </NzNavigationMenuLink>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/nat"} className={navigationMenuTriggerStyle()}>
                                <Link to="/dashboard/nat">NAT Traversal</Link>
                            </NzNavigationMenuLink>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/server-group" || location.pathname === "/dashboard/notification-group"} className={navigationMenuTriggerStyle()}>
                                <Link to="/dashboard/server-group">Group</Link>
                            </NzNavigationMenuLink>
                        </NavigationMenuItem>
                    </>
                }
            </NavigationMenuList>
            <div className="ml-auto flex items-center">
                <ModeToggle />
                {
                    profile && <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="ml-1 h-8 w-8 cursor-pointer border-foreground border-[1px]">
                                    <AvatarImage src={'https://api.dicebear.com/7.x/notionists/svg?seed=' + profile.username} alt={profile.username} />
                                    <AvatarFallback>{profile.username}</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuLabel>{profile.username}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                        <User />
                                        <span>Profile</span>
                                        <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout}>
                                    <LogOut />
                                    <span>Log out</span>
                                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            </div>
        </NavigationMenu>
    </header>
}
