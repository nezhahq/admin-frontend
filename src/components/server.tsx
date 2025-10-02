import { updateServer } from "@/api/server"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { IconButton } from "@/components/xui/icon-button"
import { conv } from "@/lib/utils"
import { asOptionalField } from "@/lib/utils"
import { ModelServer } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { KeyedMutator } from "swr"
import { z } from "zod"

interface ServerCardProps {
    data: ModelServer
    mutate: KeyedMutator<ModelServer[]>
}

const serverFormSchema = z.object({
    name: z.string().min(1),
    note: asOptionalField(z.string()),
    public_note: asOptionalField(z.string()),
    display_index: z.coerce.number().int(),
    hide_for_guest: asOptionalField(z.boolean()),
    enable_ddns: asOptionalField(z.boolean()),
    ddns_profiles: asOptionalField(z.array(z.number())),
    ddns_profiles_raw: asOptionalField(z.string()),
    override_ddns_domains: asOptionalField(z.record(z.string(), z.array(z.string()))),
    override_ddns_domains_raw: asOptionalField(
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
})

export const ServerCard: React.FC<ServerCardProps> = ({ data, mutate }) => {
    const { t } = useTranslation()
    const form = useForm({
        resolver: zodResolver(serverFormSchema) as any,
        defaultValues: {
            ...data,
            ddns_profiles_raw: data.ddns_profiles ? conv.arrToStr(data.ddns_profiles) : undefined,
            override_ddns_domains_raw: data.override_ddns_domains
                ? JSON.stringify(data.override_ddns_domains)
                : undefined,
        },
        resetOptions: {
            keepDefaultValues: false,
        },
    })

    const [open, setOpen] = useState(false)

    type PublicNote = {
        billingDataMod: {
            startDate: string
            endDate: string
            autoRenewal: string
            cycle: string
            amount: string
        }
        planDataMod: {
            bandwidth: string
            trafficVol: string
            trafficType: string
            IPv4: string
            IPv6: string
            networkRoute: string
            extra: string
        }
    }

    const defaultPublicNote: PublicNote = {
        billingDataMod: {
            startDate: "",
            endDate: "",
            autoRenewal: "",
            cycle: "",
            amount: "",
        },
        planDataMod: {
            bandwidth: "",
            trafficVol: "",
            trafficType: "",
            IPv4: "0",
            IPv6: "0",
            networkRoute: "",
            extra: "",
        },
    }

    const parsePublicNote = (s?: string): PublicNote => {
        if (!s) return defaultPublicNote
        try {
            const obj = JSON.parse(s)
            return {
                billingDataMod: {
                    startDate: obj?.billingDataMod?.startDate ?? "",
                    endDate: obj?.billingDataMod?.endDate ?? "",
                    autoRenewal: obj?.billingDataMod?.autoRenewal ?? "",
                    cycle: obj?.billingDataMod?.cycle ?? "",
                    amount: obj?.billingDataMod?.amount ?? "",
                },
                planDataMod: {
                    bandwidth: obj?.planDataMod?.bandwidth ?? "",
                    trafficVol: obj?.planDataMod?.trafficVol ?? "",
                    trafficType: obj?.planDataMod?.trafficType ?? "",
                    IPv4: obj?.planDataMod?.IPv4 === "1" ? "1" : "0",
                    IPv6: obj?.planDataMod?.IPv6 === "1" ? "1" : "0",
                    networkRoute: obj?.planDataMod?.networkRoute ?? "",
                    extra: obj?.planDataMod?.extra ?? "",
                },
            }
        } catch {
            return defaultPublicNote
        }
    }

    const [publicNoteObj, setPublicNoteObj] = useState<PublicNote>(
        parsePublicNote(data?.public_note),
    )
    const [publicNoteErrors, setPublicNoteErrors] = useState<
        Partial<
            Record<
                | "billing.startDate"
                | "billing.endDate"
                | "billing.autoRenewal"
                | "billing.cycle"
                | "billing.amount"
                | "plan.bandwidth"
                | "plan.trafficVol"
                | "plan.trafficType"
                | "plan.IPv4"
                | "plan.IPv6"
                | "plan.extra",
                string
            >
        >
    >({})

    const isValidISOLike = (v: string) => {
        if (!v) return true
        // special marker for "no expiry"
        if (v === "0000-00-00T23:59:59+08:00") return true
        const d = new Date(v)
        return !isNaN(d.getTime())
    }

    const validatePublicNote = (pn: PublicNote) => {
        const errs: Partial<Record<string, string>> = {}

        if (pn.billingDataMod.startDate && !isValidISOLike(pn.billingDataMod.startDate)) {
            errs["billing.startDate"] = t("Validation.InvalidDate")
        }
        if (pn.billingDataMod.endDate && !isValidISOLike(pn.billingDataMod.endDate)) {
            errs["billing.endDate"] = t("Validation.InvalidDate")
        }
        if (pn.billingDataMod.autoRenewal && !/^(0|1)$/.test(pn.billingDataMod.autoRenewal)) {
            errs["billing.autoRenewal"] = t("Validation.MustBe0Or1")
        }
        if (pn.billingDataMod.cycle && !/^(Day|Week|Month|Year)$/i.test(pn.billingDataMod.cycle)) {
            errs["billing.cycle"] = t("Validation.MustBeDayWeekMonthYear")
        }
        // amount 允许任意非空字符串或空
        if (pn.planDataMod.trafficType && !/^(1|2)$/.test(pn.planDataMod.trafficType)) {
            errs["plan.trafficType"] = t("Validation.MustBe1Or2")
        }
        if (!/^(0|1)$/.test(pn.planDataMod.IPv4)) {
            errs["plan.IPv4"] = t("Validation.MustBe0Or1")
        }
        if (!/^(0|1)$/.test(pn.planDataMod.IPv6)) {
            errs["plan.IPv6"] = t("Validation.MustBe0Or1")
        }

        return { errors: errs, valid: Object.keys(errs).length === 0 }
    }

    const onSubmit = async (values: any) => {
        try {
            values.ddns_profiles = values.ddns_profiles_raw
                ? conv.strToArr(values.ddns_profiles_raw).map(Number)
                : undefined
            values.override_ddns_domains = values.override_ddns_domains_raw
                ? JSON.parse(values.override_ddns_domains_raw)
                : undefined

            // validate structured fields
            const { errors, valid } = validatePublicNote(publicNoteObj)
            if (!valid) {
                setPublicNoteErrors(errors)
                toast(t("Error"), { description: t("Validation.InvalidForm") })
                return
            }
            setPublicNoteErrors({})

            // normalize datetime-local to ISO string if provided
            const normalizeISO = (v: string) => {
                if (!v) return v
                // keep special "no expiry" value as-is
                if (v === "0000-00-00T23:59:59+08:00") return v
                const date = new Date(v)
                return isNaN(date.getTime()) ? v : date.toISOString()
            }
            const pnNormalized: PublicNote = {
                billingDataMod: {
                    ...publicNoteObj.billingDataMod,
                    startDate: normalizeISO(publicNoteObj.billingDataMod.startDate),
                    endDate: normalizeISO(publicNoteObj.billingDataMod.endDate),
                    // keep others as-is
                },
                planDataMod: { ...publicNoteObj.planDataMod },
            }

            // serialize structured public note back to JSON string
            values.public_note = JSON.stringify(pnNormalized)
            await updateServer(data!.id!, values)
        } catch (e) {
            console.error(e)
            toast(t("Error"), {
                description: t("Results.UnExpectedError"),
            })
            return
        }
        setOpen(false)
        await mutate()
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <IconButton variant="outline" icon="edit" />
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-xl"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <ScrollArea className="max-h-[calc(100dvh-5rem)] p-3">
                    <div className="items-center mx-1">
                        <DialogHeader>
                            <DialogTitle>{t("EditServer")}</DialogTitle>
                            <DialogDescription />
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 my-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("Name")}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="My Server" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="display_index"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("Weight")}</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="0" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {form.watch("enable_ddns") ? (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="ddns_profiles_raw"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        {t("DDNSProfiles") + t("SeparateWithComma")}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="1,2,3" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="override_ddns_domains_raw"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        {t("OverrideDDNSDomains")}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea className="resize-y" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                ) : (
                                    <></>
                                )}

                                <FormField
                                    control={form.control}
                                    name="enable_ddns"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">
                                                        {t("EnableDDNS")}
                                                    </Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hide_for_guest"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">
                                                        {t("HideForGuest")}
                                                    </Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="note"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("Private") + t("Note")}</FormLabel>
                                            <FormControl>
                                                <Textarea className="resize-none" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Structured Public Note fields */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <FormLabel>{t("Public") + t("Note")}</FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                            {t("PublicNote.DropdownHint")}
                                        </p>
                                    </div>

                                    <div className="rounded-md border p-3 space-y-3">
                                        <div className="text-sm font-medium opacity-80">
                                            {t("PublicNote.Billing")}
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.StartDate")}
                                                </Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full justify-start text-left font-normal"
                                                        >
                                                            {publicNoteObj.billingDataMod.startDate
                                                                ? new Date(
                                                                      publicNoteObj.billingDataMod.startDate,
                                                                  ).toLocaleDateString()
                                                                : "YYYY-MM-DD"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="p-0 w-[300px] max-h-[60dvh] overflow-hidden"
                                                        align="start"
                                                    >
                                                        <div className="max-h-[500px] overflow-y-auto">
                                                            <Calendar
                                                                className="w-full min-h-[320px]"
                                                                mode="single"
                                                                captionLayout="dropdown"
                                                                startMonth={new Date(2000, 0)}
                                                                endMonth={new Date(2050, 11)}
                                                                selected={
                                                                    publicNoteObj.billingDataMod
                                                                        .startDate
                                                                        ? new Date(
                                                                              publicNoteObj.billingDataMod.startDate,
                                                                          )
                                                                        : undefined
                                                                }
                                                                onSelect={(d) => {
                                                                    if (!d) return
                                                                    setPublicNoteObj((prev) => {
                                                                        const prevDateStr =
                                                                            prev.billingDataMod
                                                                                .startDate
                                                                        if (prevDateStr) {
                                                                            const pd = new Date(
                                                                                prevDateStr,
                                                                            )
                                                                            // 仅在有效日期时复制时分秒
                                                                            if (
                                                                                !isNaN(pd.getTime())
                                                                            ) {
                                                                                d.setHours(
                                                                                    pd.getHours(),
                                                                                    pd.getMinutes(),
                                                                                    pd.getSeconds(),
                                                                                    0,
                                                                                )
                                                                            }
                                                                        }
                                                                        return {
                                                                            ...prev,
                                                                            billingDataMod: {
                                                                                ...prev.billingDataMod,
                                                                                startDate:
                                                                                    d.toISOString(),
                                                                            },
                                                                        }
                                                                    })
                                                                }}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                {publicNoteErrors["billing.startDate"] && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {publicNoteErrors["billing.startDate"]}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-xs">
                                                        {t("PublicNote.EndDate")}
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="text-xs px-2 py-0 h-auto bg-gray-200 dark:bg-gray-700"
                                                        onClick={() =>
                                                            setPublicNoteObj((prev) => ({
                                                                ...prev,
                                                                billingDataMod: {
                                                                    ...prev.billingDataMod,
                                                                    endDate:
                                                                        prev.billingDataMod
                                                                            .endDate ===
                                                                        "0000-00-00T23:59:59+08:00"
                                                                            ? ""
                                                                            : "0000-00-00T23:59:59+08:00",
                                                                },
                                                            }))
                                                        }
                                                    >
                                                        {publicNoteObj.billingDataMod.endDate ===
                                                        "0000-00-00T23:59:59+08:00"
                                                            ? t("PublicNote.CancelNoExpiry")
                                                            : t("PublicNote.SetNoExpiry")}
                                                    </Button>
                                                </div>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full justify-start text-left font-normal"
                                                        >
                                                            {publicNoteObj.billingDataMod.endDate
                                                                ? publicNoteObj.billingDataMod
                                                                      .endDate ===
                                                                  "0000-00-00T23:59:59+08:00"
                                                                    ? t("PublicNote.NoExpiry")
                                                                    : new Date(
                                                                          publicNoteObj.billingDataMod.endDate,
                                                                      ).toLocaleDateString()
                                                                : "YYYY-MM-DD"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="p-0 w-[300px] max-h-[60dvh] overflow-hidden"
                                                        align="start"
                                                    >
                                                        <div className="max-h-[500px] overflow-y-auto">
                                                            <Calendar
                                                                className="w-full min-h-[320px]"
                                                                mode="single"
                                                                captionLayout="dropdown"
                                                                startMonth={new Date(2000, 0)}
                                                                endMonth={new Date(2050, 11)}
                                                                selected={
                                                                    publicNoteObj.billingDataMod
                                                                        .endDate &&
                                                                    publicNoteObj.billingDataMod
                                                                        .endDate !==
                                                                        "0000-00-00T23:59:59+08:00"
                                                                        ? new Date(
                                                                              publicNoteObj.billingDataMod.endDate,
                                                                          )
                                                                        : undefined
                                                                }
                                                                onSelect={(d) => {
                                                                    if (!d) return
                                                                    setPublicNoteObj((prev) => {
                                                                        const prevDateStr =
                                                                            prev.billingDataMod
                                                                                .endDate
                                                                        if (prevDateStr) {
                                                                            const pd = new Date(
                                                                                prevDateStr,
                                                                            )
                                                                            // 仅在有效日期时复制时分秒（特殊“不过期”值不会影响）
                                                                            if (
                                                                                !isNaN(pd.getTime())
                                                                            ) {
                                                                                d.setHours(
                                                                                    pd.getHours(),
                                                                                    pd.getMinutes(),
                                                                                    pd.getSeconds(),
                                                                                    0,
                                                                                )
                                                                            }
                                                                        }
                                                                        return {
                                                                            ...prev,
                                                                            billingDataMod: {
                                                                                ...prev.billingDataMod,
                                                                                endDate:
                                                                                    d.toISOString(),
                                                                            },
                                                                        }
                                                                    })
                                                                }}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>

                                                {publicNoteErrors["billing.endDate"] && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {publicNoteErrors["billing.endDate"]}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.AutoRenewal")}
                                                </Label>
                                                <Select
                                                    onValueChange={(val) =>
                                                        setPublicNoteObj((prev) => ({
                                                            ...prev,
                                                            billingDataMod: {
                                                                ...prev.billingDataMod,
                                                                autoRenewal: val,
                                                            },
                                                        }))
                                                    }
                                                    defaultValue={
                                                        publicNoteObj.billingDataMod.autoRenewal ||
                                                        "0"
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">
                                                            {t("PublicNote.Enabled")}
                                                        </SelectItem>
                                                        <SelectItem value="0">
                                                            {t("PublicNote.Disabled")}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {publicNoteErrors["billing.autoRenewal"] && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {publicNoteErrors["billing.autoRenewal"]}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.Cycle")}
                                                </Label>
                                                <Select
                                                    onValueChange={(val) =>
                                                        setPublicNoteObj((prev) => ({
                                                            ...prev,
                                                            billingDataMod: {
                                                                ...prev.billingDataMod,
                                                                cycle: val,
                                                            },
                                                        }))
                                                    }
                                                    defaultValue={
                                                        publicNoteObj.billingDataMod.cycle ||
                                                        "Month"
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select cycle" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Day">
                                                            {t("PublicNote.Day")}
                                                        </SelectItem>
                                                        <SelectItem value="Week">
                                                            {t("PublicNote.Week")}
                                                        </SelectItem>
                                                        <SelectItem value="Month">
                                                            {t("PublicNote.Month")}
                                                        </SelectItem>
                                                        <SelectItem value="Year">
                                                            {t("PublicNote.Year")}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {publicNoteErrors["billing.cycle"] && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {publicNoteErrors["billing.cycle"]}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1 sm:col-span-2">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-xs">
                                                        {t("PublicNote.Amount")}
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="text-xs px-2 py-0 h-auto bg-gray-200 dark:bg-gray-700"
                                                        onClick={() =>
                                                            setPublicNoteObj((prev) => ({
                                                                ...prev,
                                                                billingDataMod: {
                                                                    ...prev.billingDataMod,
                                                                    amount: "0",
                                                                },
                                                            }))
                                                        }
                                                    >
                                                        {t("PublicNote.Free")}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="text-xs px-2 py-0 h-auto bg-gray-200 dark:bg-gray-700"
                                                        onClick={() =>
                                                            setPublicNoteObj((prev) => ({
                                                                ...prev,
                                                                billingDataMod: {
                                                                    ...prev.billingDataMod,
                                                                    amount: "-1",
                                                                },
                                                            }))
                                                        }
                                                    >
                                                        {t("PublicNote.PayAsYouGo")}
                                                    </Button>
                                                </div>
                                                <Input
                                                    placeholder="200EUR"
                                                    value={publicNoteObj.billingDataMod.amount}
                                                    onChange={(e) =>
                                                        setPublicNoteObj((prev) => ({
                                                            ...prev,
                                                            billingDataMod: {
                                                                ...prev.billingDataMod,
                                                                amount: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-md border p-3 space-y-3">
                                        <div className="text-sm font-medium opacity-80">
                                            {t("PublicNote.Plan")}
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.Bandwidth")}
                                                </Label>
                                                <Input
                                                    placeholder="30Mbps"
                                                    value={publicNoteObj.planDataMod.bandwidth}
                                                    onChange={(e) =>
                                                        setPublicNoteObj((prev) => ({
                                                            ...prev,
                                                            planDataMod: {
                                                                ...prev.planDataMod,
                                                                bandwidth: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.TrafficVolume")}
                                                </Label>
                                                <Input
                                                    placeholder="1TB/Month"
                                                    value={publicNoteObj.planDataMod.trafficVol}
                                                    onChange={(e) =>
                                                        setPublicNoteObj((prev) => ({
                                                            ...prev,
                                                            planDataMod: {
                                                                ...prev.planDataMod,
                                                                trafficVol: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.TrafficType")}
                                                </Label>
                                                <Select
                                                    onValueChange={(val) =>
                                                        setPublicNoteObj((prev) => ({
                                                            ...prev,
                                                            planDataMod: {
                                                                ...prev.planDataMod,
                                                                trafficType: val,
                                                            },
                                                        }))
                                                    }
                                                    defaultValue={
                                                        publicNoteObj.planDataMod.trafficType || "2"
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">
                                                            {t("PublicNote.Inbound")}
                                                        </SelectItem>
                                                        <SelectItem value="2">
                                                            {t("PublicNote.Both")}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {publicNoteErrors["plan.trafficType"] && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {publicNoteErrors["plan.trafficType"]}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.IPv4")}
                                                </Label>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs">
                                                        {t("PublicNote.None")}
                                                    </span>
                                                    <Switch
                                                        checked={
                                                            publicNoteObj.planDataMod.IPv4 === "1"
                                                        }
                                                        onCheckedChange={(checked) =>
                                                            setPublicNoteObj((prev) => ({
                                                                ...prev,
                                                                planDataMod: {
                                                                    ...prev.planDataMod,
                                                                    IPv4: checked ? "1" : "0",
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <span className="text-xs">
                                                        {t("PublicNote.Has")}
                                                    </span>
                                                </div>
                                                {publicNoteErrors["plan.IPv4"] && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {publicNoteErrors["plan.IPv4"]}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.IPv6")}
                                                </Label>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs">
                                                        {t("PublicNote.None")}
                                                    </span>
                                                    <Switch
                                                        checked={
                                                            publicNoteObj.planDataMod.IPv6 === "1"
                                                        }
                                                        onCheckedChange={(checked) =>
                                                            setPublicNoteObj((prev) => ({
                                                                ...prev,
                                                                planDataMod: {
                                                                    ...prev.planDataMod,
                                                                    IPv6: checked ? "1" : "0",
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <span className="text-xs">
                                                        {t("PublicNote.Has")}
                                                    </span>
                                                </div>
                                                {publicNoteErrors["plan.IPv6"] && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {publicNoteErrors["plan.IPv6"]}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    {t("PublicNote.NetworkRoute")}
                                                </Label>
                                                <Input
                                                    placeholder={t("PublicNote.CommaSeparated")}
                                                    value={publicNoteObj.planDataMod.networkRoute}
                                                    onChange={(e) =>
                                                        setPublicNoteObj((prev) => ({
                                                            ...prev,
                                                            planDataMod: {
                                                                ...prev.planDataMod,
                                                                networkRoute: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-1 sm:col-span-2">
                                                <Label className="text-xs">
                                                    {t("PublicNote.Extra")}
                                                </Label>
                                                <Input
                                                    placeholder={t("PublicNote.CommaSeparated")}
                                                    value={publicNoteObj.planDataMod.extra}
                                                    onChange={(e) =>
                                                        setPublicNoteObj((prev) => ({
                                                            ...prev,
                                                            planDataMod: {
                                                                ...prev.planDataMod,
                                                                extra: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter className="justify-end">
                                    <DialogClose asChild>
                                        <Button type="button" className="my-2" variant="secondary">
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
            </DialogContent>
        </Dialog>
    )
}
