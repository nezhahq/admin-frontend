import {
    NavigationMenuLinkProps,
    NavigationMenuTriggerProps,
} from "@radix-ui/react-navigation-menu"
import { motion } from "framer-motion"

import {
    NavigationMenuLink,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "../ui/navigation-menu"

export const NzNavigationMenuLink = (
    props: NavigationMenuLinkProps & React.RefAttributes<HTMLAnchorElement>,
) => {
    return (
        <div className="relative">
            <NavigationMenuLink
                {...props}
                className={
                    navigationMenuTriggerStyle() +
                    " hover:bg-inherit data-[active]:bg-inherit transition-colors text-foreground/60 data-[active]:text-foreground hover:text-foreground/90"
                }
            />
            {props.active && (
                <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white"
                />
            )}
        </div>
    )
}

export const NzNavigationMenuTrigger = (
    props: Omit<NavigationMenuTriggerProps & React.RefAttributes<HTMLButtonElement>, "ref"> &
        React.RefAttributes<HTMLButtonElement>,
) => {
    return (
        <NavigationMenuTrigger
            {...props}
            className={
                navigationMenuTriggerStyle() +
                " hover:bg-inherit data-[active]:bg-inherit transition-colors text-foreground/60 data-[active]:text-foreground hover:text-foreground/90"
            }
        />
    )
}
