import { ModeToggle } from "@/components/mode-toggle"
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
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useAuth } from "@/hooks/useAuth"
import { useMainStore } from "@/hooks/useMainStore"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import i18next from "i18next"
import { LogOut, Settings, User2 } from "lucide-react"
import { DateTime } from "luxon"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { IconButton } from "./xui/icon-button"
import { NzNavigationMenuLink } from "./xui/navigation-menu"

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
    const { t } = useTranslation()
    const { logout } = useAuth()
    const profile = useMainStore((store) => store.profile)

    const location = useLocation()
    const isDesktop = useMediaQuery("(min-width: 890px)")

    const [open, setOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const navigate = useNavigate()

    // @ts-expect-error DisableAnimatedMan is a global variable
    const disableAnimatedMan = window.DisableAnimatedMan as boolean

    return isDesktop ? (
        <header className="flex pt-8 px-4 dark:bg-black/40 bg-muted border-b-[1px] overflow-visible">
            <NavigationMenu className="flex flex-col items-start relative max-w-5xl mx-auto">
                {!disableAnimatedMan && (
                    <img
                        className={cn(
                            "absolute right-0 z-[9999] top-11 w-20 scale-100 pointer-events-none",
                            {
                                hidden: location.pathname === "/dashboard/login",
                            },
                        )}
                        alt={"animated-man"}
                        src={"/dashboard/animated-man.webp"}
                    />
                )}
                <section className="w-full flex items-center  justify-between">
                    <div className="flex justify-between items-center w-full">
                        <NavigationMenuLink
                            asChild
                            className={
                                navigationMenuTriggerStyle() +
                                " !text-foreground hover:opacity-60 transition-opacity"
                            }
                        >
                            <Link to={profile ? "/dashboard" : "#"}>
                                <img className="h-7 mr-1" src="/dashboard/logo.svg" />
                                {t("nezha")}
                            </Link>
                        </NavigationMenuLink>

                        <div className="flex items-center gap-1">
                            <a
                                href={"/"}
                                rel="noopener noreferrer"
                                className="flex items-center text-nowrap gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
                            >
                                {t("BackToHome")}
                            </a>
                            <ModeToggle />
                            {profile && (
                                <>
                                    <DropdownMenu
                                        open={dropdownOpen}
                                        onOpenChange={setDropdownOpen}
                                    >
                                        <DropdownMenuTrigger asChild>
                                            <Avatar className="ml-1 h-8 w-8 cursor-pointer border-foreground border-[1px]">
                                                <AvatarImage
                                                    src={
                                                        "https://api.dicebear.com/7.x/notionists/svg?seed=" +
                                                        profile.username
                                                    }
                                                    alt={profile.username}
                                                />
                                                <AvatarFallback>{profile.username}</AvatarFallback>
                                            </Avatar>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-32">
                                            <DropdownMenuLabel className="break-all">
                                                {profile.username}
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuGroup>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setDropdownOpen(false)
                                                        navigate("/dashboard/profile")
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2 w-full">
                                                        <User2 />
                                                        {t("Profile")}
                                                    </div>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setDropdownOpen(false)
                                                        navigate("/dashboard/settings")
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2 w-full">
                                                        <Settings />
                                                        {t("Settings")}
                                                    </div>
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={logout}
                                                className="cursor-pointer"
                                            >
                                                <LogOut />
                                                {t("Logout")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </div>
                    </div>
                </section>
                <div className="flex mt-4 ml-4">
                    <Overview />
                </div>
                <div className="flex mt-4 list-none">
                    {profile && (
                        <>
                            <NavigationMenuItem>
                                <NzNavigationMenuLink
                                    asChild
                                    active={location.pathname === "/dashboard"}
                                    className={navigationMenuTriggerStyle()}
                                >
                                    <Link to="/dashboard">{t("Server")}</Link>
                                </NzNavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NzNavigationMenuLink
                                    asChild
                                    active={location.pathname === "/dashboard/service"}
                                    className={navigationMenuTriggerStyle()}
                                >
                                    <Link to="/dashboard/service">{t("Service")}</Link>
                                </NzNavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NzNavigationMenuLink
                                    asChild
                                    active={location.pathname === "/dashboard/cron"}
                                    className={navigationMenuTriggerStyle()}
                                >
                                    <Link to="/dashboard/cron">{t("Task")}</Link>
                                </NzNavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NzNavigationMenuLink
                                    asChild
                                    active={
                                        location.pathname === "/dashboard/notification" ||
                                        location.pathname === "/dashboard/alert-rule"
                                    }
                                    className={navigationMenuTriggerStyle()}
                                >
                                    <Link to="/dashboard/notification">{t("Notification")}</Link>
                                </NzNavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NzNavigationMenuLink
                                    asChild
                                    active={location.pathname === "/dashboard/ddns"}
                                    className={navigationMenuTriggerStyle()}
                                >
                                    <Link to="/dashboard/ddns">{t("DDNS")}</Link>
                                </NzNavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NzNavigationMenuLink
                                    asChild
                                    active={location.pathname === "/dashboard/nat"}
                                    className={navigationMenuTriggerStyle()}
                                >
                                    <Link to="/dashboard/nat">{t("NATT")}</Link>
                                </NzNavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NzNavigationMenuLink
                                    asChild
                                    active={
                                        location.pathname === "/dashboard/server-group" ||
                                        location.pathname === "/dashboard/notification-group"
                                    }
                                    className={navigationMenuTriggerStyle()}
                                >
                                    <Link to="/dashboard/server-group">{t("Group")}</Link>
                                </NzNavigationMenuLink>
                            </NavigationMenuItem>
                        </>
                    )}
                </div>
            </NavigationMenu>
        </header>
    ) : (
        <header className="flex dark:bg-black/40 bg-muted border-b-[1px] px-4 h-16">
            <div className="flex max-w-max flex-1 items-center justify-center gap-2">
                {profile && (
                    <Drawer open={open} onOpenChange={setOpen}>
                        <DrawerTrigger aria-label="Toggle Menu" asChild>
                            <IconButton icon="menu" variant="ghost" />
                        </DrawerTrigger>
                        <DrawerContent>
                            <DrawerHeader className="text-left">
                                <DrawerTitle>{t("NavigateTo")}</DrawerTitle>
                                <DrawerDescription>
                                    {t("SelectAPageToNavigateTo")}
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="grid gap-1 px-4">
                                {pages.slice(0).map((item, index) => (
                                    <Link
                                        key={index}
                                        to={item.href ? item.href : "#"}
                                        className="py-1 text-sm"
                                        onClick={() => {
                                            setOpen(false)
                                        }}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button variant="outline">{t("Close")}</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                )}
            </div>
            <Link
                className="mx-2 my-2 inline-flex w-full items-center"
                to={profile ? "/dashboard" : "#"}
            >
                <img className="h-7 mr-1" src="/dashboard/logo.svg" /> {t("nezha")}
            </Link>
            <div className="ml-auto flex items-center gap-1">
                <a
                    href={"/"}
                    rel="noopener noreferrer"
                    className="flex items-center text-nowrap gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
                >
                    {t("BackToHome")}
                </a>
                <ModeToggle />
                {profile && (
                    <>
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="ml-1 h-8 w-8 cursor-pointer border-foreground border-[1px]">
                                    <AvatarImage
                                        src={
                                            "https://api.dicebear.com/7.x/notionists/svg?seed=" +
                                            profile.username
                                        }
                                        alt={profile.username}
                                    />
                                    <AvatarFallback>{profile.username}</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuLabel>{profile.username}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setDropdownOpen(false)
                                            navigate("/dashboard/profile")
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <User2 />
                                            {t("Profile")}
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setDropdownOpen(false)
                                            navigate("/dashboard/settings")
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Settings />
                                            {t("Settings")}
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                                    <LogOut />
                                    {t("Logout")}
                                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                )}
            </div>
        </header>
    )
}

// https://github.com/streamich/react-use/blob/master/src/useInterval.ts
const useInterval = (callback: () => void, delay?: number | null) => {
    const savedCallback = useRef<() => void>(() => {})
    useEffect(() => {
        savedCallback.current = callback
    })
    useEffect(() => {
        if (delay !== null) {
            const interval = setInterval(() => savedCallback.current(), delay || 0)
            return () => clearInterval(interval)
        }
        return undefined
    }, [delay])
}

function Overview() {
    const { t } = useTranslation()
    const profile = useMainStore((store) => store.profile)
    const timeOption = DateTime.TIME_SIMPLE
    timeOption.hour12 = true
    const [timeString, setTimeString] = useState(
        DateTime.now().setLocale("en-US").toLocaleString(timeOption),
    )
    useInterval(() => {
        setTimeString(DateTime.now().setLocale("en-US").toLocaleString(timeOption))
    }, 1000)
    return (
        <section className={"flex flex-col"}>
            {profile && (
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-1.5 text-sm font-semibold">
                        👋 Hi, {profile?.username}
                        {profile?.login_ip && (
                            <p className="font-medium opacity-45">from {profile?.login_ip}</p>
                        )}
                    </div>
                </div>
            )}
            {!profile && <p className="text-sm font-semibold">{t("LoginFirst")}</p>}
            <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-medium opacity-50">{t("CurrentTime")}</p>
                <p className="opacity-1 text-[13px] font-medium">{timeString}</p>
            </div>
        </section>
    )
}
