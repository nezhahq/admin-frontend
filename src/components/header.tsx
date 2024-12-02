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
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { LogOut, Settings, User2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "./ui/button";
import { IconButton } from "./xui/icon-button";
import { useState } from "react";

import { useTranslation } from "react-i18next";

import i18next from "i18next";
const pages = [
    { href: "/dashboard", label: i18next.t("Server") },
    { href: "/dashboard/service", label: i18next.t("Service") },
    { href: "/dashboard/cron", label: i18next.t("Task") },
    { href: "/dashboard/notification", label: i18next.t("Notification") },
    { href: "/dashboard/ddns", label: i18next.t("DDNS") },
    { href: "/dashboard/nat", label: i18next.t("NATT") },
    { href: "/dashboard/server-group", label: i18next.t("Group") },
]

export default function Header() {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const profile = useMainStore(store => store.profile);

    const location = useLocation();
    const isDesktop = useMediaQuery("(min-width: 890px)")

    const [open, setOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false);

    return (
        isDesktop ? (
            <header className="h-16 flex items-center border-b-2 px-4 overflow-x-auto">
                <NavigationMenu className="sm:max-w-full">
                    <NavigationMenuList>
                        <Card className="mr-1">
                            <NavigationMenuLink asChild className={navigationMenuTriggerStyle() + ' !text-foreground'}>
                                <Link to={profile ? "/dashboard" : '#'}><img className="h-7 mr-1" src='/dashboard/logo.svg' /> {t("nezha")}</Link>
                            </NavigationMenuLink>
                        </Card>

                        {
                            profile && (
                                <>
                                    <NavigationMenuItem>
                                        <NzNavigationMenuLink asChild active={location.pathname === "/dashboard"} className={navigationMenuTriggerStyle()}>
                                            <Link to="/dashboard">{t("Server")}</Link>
                                        </NzNavigationMenuLink>
                                    </NavigationMenuItem>
                                    <NavigationMenuItem>
                                        <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/service"} className={navigationMenuTriggerStyle()}>
                                            <Link to="/dashboard/service">{t("Service")}</Link>
                                        </NzNavigationMenuLink>
                                    </NavigationMenuItem>
                                    <NavigationMenuItem>
                                        <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/cron"} className={navigationMenuTriggerStyle()}>
                                            <Link to="/dashboard/cron">{t('Task')}</Link>
                                        </NzNavigationMenuLink>
                                    </NavigationMenuItem>
                                    <NavigationMenuItem>
                                        <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/notification" || location.pathname === "/dashboard/alert-rule"} className={navigationMenuTriggerStyle()}>
                                            <Link to="/dashboard/notification">{t('Notification')}</Link>
                                        </NzNavigationMenuLink>
                                    </NavigationMenuItem>
                                    <NavigationMenuItem>
                                        <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/ddns"} className={navigationMenuTriggerStyle()}>
                                            <Link to="/dashboard/ddns">{t('DDNS')}</Link>
                                        </NzNavigationMenuLink>
                                    </NavigationMenuItem>
                                    <NavigationMenuItem>
                                        <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/nat"} className={navigationMenuTriggerStyle()}>
                                            <Link to="/dashboard/nat">{t('NATT')}</Link>
                                        </NzNavigationMenuLink>
                                    </NavigationMenuItem>
                                    <NavigationMenuItem>
                                        <NzNavigationMenuLink asChild active={location.pathname === "/dashboard/server-group" || location.pathname === "/dashboard/notification-group"} className={navigationMenuTriggerStyle()}>
                                            <Link to="/dashboard/server-group">{t('Group')}</Link>
                                        </NzNavigationMenuLink>
                                    </NavigationMenuItem>
                                </>
                            )
                        }
                    </NavigationMenuList>
                    <div className="ml-auto flex items-center gap-1">
                        <ModeToggle />
                        {
                            profile && <>
                                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <Avatar className="ml-1 h-8 w-8 cursor-pointer border-foreground border-[1px]">
                                            <AvatarImage src={'https://api.dicebear.com/7.x/notionists/svg?seed=' + profile.username} alt={profile.username} />
                                            <AvatarFallback>{profile.username}</AvatarFallback>
                                        </Avatar>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-32">
                                        <DropdownMenuLabel>{profile.username}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem onClick={() => { setDropdownOpen(false) }}>
                                                <Link to="/dashboard/profile" className="flex items-center gap-2 w-full">
                                                    <User2 />
                                                    {t('Profile')}
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setDropdownOpen(false) }}>
                                                <Link to="/dashboard/settings" className="flex items-center gap-2 w-full">
                                                    <Settings />
                                                    {t('Settings')}
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={logout} className="cursor-pointer">
                                            <LogOut />
                                            {t('Logout')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        }
                    </div>
                </NavigationMenu>
            </header>
        )
            : (
                <header className="flex border-b-2 px-4 h-16">
                    <div className="flex max-w-max flex-1 items-center justify-center gap-2">
                        {profile &&
                            <Drawer open={open} onOpenChange={setOpen}>
                                <DrawerTrigger aria-label="Toggle Menu" asChild>
                                    <IconButton icon="menu" variant="ghost" />
                                </DrawerTrigger>
                                <DrawerContent>
                                    <DrawerHeader className="text-left">
                                        <DrawerTitle>{t('NavigateTo')}</DrawerTitle>
                                        <DrawerDescription>{t('SelectAPageToNavigateTo')}</DrawerDescription>
                                    </DrawerHeader>
                                    <div className="grid gap-1 px-4">
                                        {pages.slice(0).map((item, index) => (
                                            <Link
                                                key={index}
                                                to={item.href ? item.href : "#"}
                                                className="py-1 text-sm"
                                                onClick={() => { setOpen(false) }}
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                    <DrawerFooter>
                                        <DrawerClose asChild>
                                            <Button variant="outline">{t('Close')}</Button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </DrawerContent>
                            </Drawer>
                        }
                    </div>
                    <Card className="mx-2 my-2 flex justify-center items-center hover:bg-accent transition duration-200">
                        <Link className="inline-flex w-full items-center px-4 py-2" to={profile ? "/dashboard" : '#'}><img className="h-7 mr-1" src='/dashboard/logo.svg' /> NEZHA</Link>
                    </Card>
                    <div className="ml-auto flex items-center gap-1">
                        <ModeToggle />
                        {
                            profile && <>
                                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
                                            <DropdownMenuItem onClick={() => { setDropdownOpen(false) }}>
                                                <Link to="/dashboard/profile" className="flex items-center gap-2 w-full">
                                                    <User2 />
                                                    {t('Profile')}
                                                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setDropdownOpen(false) }}>
                                                <Link to="/dashboard/settings" className="flex items-center gap-2 w-full">
                                                    <Settings />
                                                    {t('Settings')}
                                                    <DropdownMenuShortcut>⇧⌘S</DropdownMenuShortcut>
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={logout} className="cursor-pointer">
                                            <LogOut />
                                            {t('Logout')}
                                            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        }
                    </div>
                </header>
            )
    )
}
