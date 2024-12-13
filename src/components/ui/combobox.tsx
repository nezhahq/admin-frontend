"use client"

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronDown } from "lucide-react"
import * as React from "react"

interface ComboboxProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    options: {
        label: string
        value: string
    }[]

    placeholder?: string
    defaultValue?: string
    className?: string
    onValueChange: (value: string) => void
}

export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
    ({ options, placeholder, defaultValue, className, onValueChange, ...props }, ref) => {
        const [open, setOpen] = React.useState(false)
        const [value, setValue] = React.useState(defaultValue)

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={ref}
                        {...props}
                        role="combobox"
                        variant="outline"
                        aria-expanded={open}
                        className={cn("flex w-full justify-between hover:bg-inherit", className)}
                    >
                        {value ? (
                            (() => {
                                const val = options.find((option) => option.value === value)?.label
                                return val ? (
                                    <div>{val}</div>
                                ) : (
                                    <div className="text-muted-foreground">{placeholder}</div>
                                )
                            })()
                        ) : (
                            <div className="text-muted-foreground">{placeholder}</div>
                        )}
                        <ChevronDown className="ml-auto opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Command
                        filter={(value, search, keywords = []) => {
                            const extendValue = value + " " + keywords.join(" ")
                            if (extendValue.toLowerCase().includes(search.toLowerCase())) {
                                return 1
                            }
                            return 0
                        }}
                    >
                        <CommandInput placeholder={placeholder} className="h-9" />
                        <CommandList>
                            <CommandEmpty>No result found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        keywords={[option.label]}
                                        onSelect={(currentValue) => {
                                            setValue(currentValue === value ? "" : currentValue)
                                            onValueChange(
                                                currentValue === value ? "" : currentValue,
                                            )
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "justify-start",
                                                value === option.value
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                            )}
                                        />
                                        <span>{option.label}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        )
    },
)
