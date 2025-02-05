import { getServerConfig, setServerConfig } from "@/api/server"
import { Button, ButtonProps } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { IconButton } from "@/components/xui/icon-button"
import { asOptionalField } from "@/lib/utils"
import { ModelServerTaskResponse } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"

const agentConfigSchema = z.object({
    debug: asOptionalField(z.boolean()),
    disable_auto_update: asOptionalField(z.boolean()),
    disable_command_execute: asOptionalField(z.boolean()),
    disable_force_update: asOptionalField(z.boolean()),
    disable_nat: asOptionalField(z.boolean()),
    disable_send_query: asOptionalField(z.boolean()),
    gpu: asOptionalField(z.boolean()),
    hard_drive_partition_allowlist: asOptionalField(z.array(z.string())),
    hard_drive_partition_allowlist_raw: asOptionalField(
        z.string().refine(
            (val) => {
                try {
                    JSON.parse(val)
                    return true
                } catch (e) {
                    return false
                }
            },
            {
                message: "Invalid JSON string",
            },
        ),
    ),
    ip_report_period: asOptionalField(z.coerce.number().int().min(30)),
    nic_allowlist: asOptionalField(z.record(z.boolean())),
    nic_allowlist_raw: asOptionalField(
        z.string().refine(
            (val) => {
                try {
                    JSON.parse(val)
                    return true
                } catch (e) {
                    return false
                }
            },
            {
                message: "Invalid JSON string",
            },
        ),
    ),
    report_delay: asOptionalField(z.coerce.number().int().min(1).max(4)),
    skip_connection_count: asOptionalField(z.boolean()),
    skip_procs_count: asOptionalField(z.boolean()),
    temperature: asOptionalField(z.boolean()),
})

type AgentConfig = z.infer<typeof agentConfigSchema>

const boolFields: (keyof AgentConfig)[] = [
    "disable_auto_update",
    "disable_command_execute",
    "disable_force_update",
    "disable_nat",
    "disable_send_query",
    "gpu",
    "temperature",
    "skip_connection_count",
    "skip_procs_count",
    "debug",
]

const groupedBoolFields: (keyof AgentConfig)[][] = []
for (let i = 0; i < boolFields.length; i += 2) {
    groupedBoolFields.push(boolFields.slice(i, i + 2))
}

interface ServerConfigCardProps extends ButtonProps {
    sid: number
}

export const ServerConfigCard = ({ sid, ...props }: ServerConfigCardProps) => {
    const { t } = useTranslation()
    const [data, setData] = useState<AgentConfig | undefined>(undefined)
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getServerConfig(sid)
                setData(JSON.parse(result))
            } catch (error) {
                console.error(error)
                toast(t("Error"), {
                    description: (error as Error).message,
                })
                setOpen(false)
                return
            } finally {
                setLoading(false)
            }
        }
        if (open) fetchData()
    }, [open])

    const form = useForm<AgentConfig>({
        resolver: zodResolver(agentConfigSchema),
        defaultValues: {
            ...data,
            hard_drive_partition_allowlist_raw: JSON.stringify(
                data?.hard_drive_partition_allowlist,
            ),
            nic_allowlist_raw: JSON.stringify(data?.nic_allowlist),
        },
        resetOptions: {
            keepDefaultValues: false,
        },
    })

    useEffect(() => {
        if (data) {
            form.reset({
                ...data,
                hard_drive_partition_allowlist_raw: JSON.stringify(
                    data.hard_drive_partition_allowlist,
                ),
                nic_allowlist_raw: JSON.stringify(data.nic_allowlist),
            })
        }
    }, [data, form])

    const onSubmit = async (values: AgentConfig) => {
        let resp: ModelServerTaskResponse = {}
        try {
            values.nic_allowlist = values.nic_allowlist_raw
                ? JSON.parse(values.nic_allowlist_raw)
                : undefined
            values.hard_drive_partition_allowlist = values.hard_drive_partition_allowlist_raw
                ? JSON.parse(values.hard_drive_partition_allowlist_raw)
                : undefined
            resp = await setServerConfig({ config: JSON.stringify(values), servers: [sid] })
        } catch (e) {
            console.error(e)
            toast(t("Error"), {
                description: t("Results.UnExpectedError"),
            })
            return
        }
        toast(t("Done"), {
            description:
                t("Results.ForceUpdate") +
                (resp.success?.length ? t(`Success`) + ` [${resp.success.join(",")}]` : "") +
                (resp.failure?.length ? t(`Failure`) + ` [${resp.failure.join(",")}]` : "") +
                (resp.offline?.length ? t(`Offline`) + ` [${resp.offline.join(",")}]` : ""),
        })
        setOpen(false)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <IconButton {...props} icon="cog" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                {loading ? (
                    <div className="items-center mx-1">
                        <DialogHeader>
                            <DialogTitle>Loading...</DialogTitle>
                            <DialogDescription />
                        </DialogHeader>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[calc(100dvh-5rem)] p-3">
                        <div className="items-center mx-1">
                            <DialogHeader>
                                <DialogTitle>{t("EditServerConfig")}</DialogTitle>
                                <DialogDescription />
                            </DialogHeader>
                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    className="space-y-2 my-2"
                                >
                                    <FormField
                                        control={form.control}
                                        name="ip_report_period"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>ip_report_period</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="report_delay"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>report_delay</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="hard_drive_partition_allowlist_raw"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    hard_drive_partition_allowlist
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea className="resize-y" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="nic_allowlist_raw"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>nic_allowlist</FormLabel>
                                                <FormControl>
                                                    <Textarea className="resize-y" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {groupedBoolFields.map((group, idx) => (
                                        <div className="flex gap-8" key={idx}>
                                            {group.map((field) => (
                                                <FormField
                                                    key={field}
                                                    control={form.control}
                                                    name={field}
                                                    render={({ field: controllerField }) => (
                                                        <FormItem className="flex items-center w-full">
                                                            <FormControl>
                                                                <div className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={
                                                                            controllerField.value as boolean
                                                                        }
                                                                        onCheckedChange={
                                                                            controllerField.onChange
                                                                        }
                                                                    />
                                                                    <Label className="text-sm">
                                                                        {t(field)}
                                                                    </Label>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                    <DialogFooter className="justify-end">
                                        <DialogClose asChild>
                                            <Button
                                                type="button"
                                                className="my-2"
                                                variant="secondary"
                                            >
                                                {t("Close")}
                                            </Button>
                                        </DialogClose>
                                        <Button type="submit" className="my-2">
                                            {t("Submit")}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    )
}
