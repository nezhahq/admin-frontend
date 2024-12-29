"use client"

import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatPath } from "@/lib/utils"
import * as React from "react"

const ITEMS_TO_DISPLAY = 3

interface FilepathProps {
    path: string
    setPath: React.Dispatch<React.SetStateAction<string>>
}

function pathToItems(path: string) {
    const segments = path.split("/").filter(Boolean)

    const result: { href: string; label: string }[] = []

    let currentPath = ""
    segments.forEach((segment) => {
        currentPath += `/${segment}`
        result.push({ href: currentPath, label: segment })
    })

    return result
}

export const Filepath: React.FC<FilepathProps> = ({ path, setPath }) => {
    const [open, setOpen] = React.useState(false)
    const items = pathToItems(formatPath(path))

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <p
                        className="cursor-pointer hover:text-white transition"
                        onClick={() => {
                            setPath("/")
                        }}
                    >
                        /
                    </p>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {items.length > ITEMS_TO_DISPLAY ? (
                    <>
                        <BreadcrumbItem>
                            {
                                <DropdownMenu open={open} onOpenChange={setOpen}>
                                    <DropdownMenuTrigger
                                        className="flex items-center gap-1"
                                        aria-label="Toggle menu"
                                    >
                                        <BreadcrumbEllipsis className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {items.slice(0, -ITEMS_TO_DISPLAY).map((item, index) => (
                                            <DropdownMenuItem key={index}>
                                                <p
                                                    onClick={() => {
                                                        setPath(item.href)
                                                    }}
                                                >
                                                    {item.label}
                                                </p>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            }
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                    </>
                ) : null}
                {items.slice(-ITEMS_TO_DISPLAY).map((item, index, slicedItems) => (
                    <React.Fragment key={index}>
                        <BreadcrumbItem className="overflow-auto">
                            {item.href ? (
                                <>
                                    <p
                                        className="max-w-20 truncate md:max-w-none cursor-pointer hover:text-white transition"
                                        onClick={() => {
                                            setPath(item.href)
                                        }}
                                    >
                                        {item.label}
                                    </p>
                                </>
                            ) : (
                                <BreadcrumbPage className="max-w-20 truncate md:max-w-none">
                                    {item.label}
                                </BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                        {index !== slicedItems.length - 1 ? <BreadcrumbSeparator /> : null}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
