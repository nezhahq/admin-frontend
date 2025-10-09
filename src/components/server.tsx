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
import {
    type PublicNote,
    PublicNoteSchema,
    applyPublicNoteDate,
    applyPublicNotePatch,
    detectPublicNoteMode,
    normalizeISO,
    parsePublicNote,
    toggleEndNoExpiry,
    validatePublicNote,
} from "@/lib/public-note"
import { conv } from "@/lib/utils"
import { asOptionalField } from "@/lib/utils"
import { ModelServer } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { HelpCircle } from "lucide-react"
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
    public_note: asOptionalField(
        z.string().refine(
            (val) => {
                const s = (val ?? "").trim()
                if (s.length === 0) return true
                try {
                    const obj = JSON.parse(s)
                    return PublicNoteSchema.safeParse(obj).success
                } catch {
                    // skip check if not JSON
                    return true
                }
            },
            { message: "Invalid Public Note JSON" },
        ),
    ),
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

    const [publicNoteMode, setPublicNoteMode] = useState<"structured" | "raw">(
        detectPublicNoteMode(data?.public_note),
    )
    const [publicNoteRaw, setPublicNoteRaw] = useState<string>(data?.public_note ?? "")

    const patchPublicNote = (path: string, value: string | undefined) => {
        setPublicNoteObj((prev) => applyPublicNotePatch(prev, path, value))
    }
    const patchPublicNoteDate = (
        path: "billingDataMod.startDate" | "billingDataMod.endDate",
        d: Date,
    ) => {
        setPublicNoteObj((prev) => applyPublicNoteDate(prev, path, d))
    }
    const toggleEndNoExpiryLocal = () => {
        setPublicNoteObj((prev) => toggleEndNoExpiry(prev))
    }

    const onSubmit = async (values: any) => {
        try {
            values.ddns_profiles = values.ddns_profiles_raw
                ? conv.strToArr(values.ddns_profiles_raw).map(Number)
                : undefined
            values.override_ddns_domains = values.override_ddns_domains_raw
                ? JSON.parse(values.override_ddns_domains_raw)
                : undefined

            if (publicNoteMode === "raw") {
                const raw = (publicNoteRaw ?? "").trim()
                if (raw.length === 0) {
                    values.public_note = undefined
                } else {
                    values.public_note = raw
                }
            } else {
                const { errors, valid } = validatePublicNote(publicNoteObj)
                if (!valid) {
                    setPublicNoteErrors(errors)
                    toast(t("Error"), { description: t("Validation.InvalidForm") })
                    return
                }
                setPublicNoteErrors({})

                const bd = publicNoteObj.billingDataMod
                const pd = publicNoteObj.planDataMod
                const pnNormalized: PublicNote = {
                    billingDataMod: bd && {
                        ...bd,
                        startDate: normalizeISO(bd.startDate),
                        endDate: normalizeISO(bd.endDate),
                    },
                    planDataMod: pd,
                }
                const jsonStr = JSON.stringify(pnNormalized)
                values.public_note = jsonStr.length > 2 ? jsonStr : undefined
            }

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
                                {/* Public Note controls (optional + dual mode) */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FormLabel>{t("PublicNote.Label")}</FormLabel>
                                                <a
                                                    href="https://nezha.wiki/guide/servers.html#%E5%85%AC%E5%BC%80%E5%A4%87%E6%B3%A8%E8%AE%BE%E7%BD%AE"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-muted-foreground hover:text-foreground"
                                                >
                                                    <HelpCircle className="h-4 w-4" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Toggle: when disabled, hide edit controls and submit an empty value */}
                                    <div className="flex items-center gap-4">
                                        {/* Mode switch: Raw text / Custom fields */}
                                        <div className="flex items-center gap-2">
                                            {/* Show 'structured' first, then 'raw' */}
                                            <Button
                                                type="button"
                                                variant={
                                                    publicNoteMode === "structured"
                                                        ? "default"
                                                        : "outline"
                                                }
                                                className="text-xs h-7"
                                                onClick={() => {
                                                    setPublicNoteMode("structured")
                                                    setPublicNoteObj(parsePublicNote(publicNoteRaw))
                                                }}
                                            >
                                                {t("PublicNote.CustomFields")}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={
                                                    publicNoteMode === "raw" ? "default" : "outline"
                                                }
                                                className="text-xs h-7"
                                                onClick={() => setPublicNoteMode("raw")}
                                            >
                                                {t("PublicNote.RawText")}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Raw text mode: shown by default; submission uses this string */}
                                    {publicNoteMode === "raw" && (
                                        <div>
                                            <Textarea
                                                className="resize-y"
                                                value={publicNoteRaw}
                                                onChange={(e) => setPublicNoteRaw(e.target.value)}
                                                rows={10}
                                            />
                                        </div>
                                    )}

                                    {/* Custom fields mode: keep structured editing; serialize to string on submit */}
                                    {publicNoteMode === "structured" && (
                                        <>
                                            <div className="rounded-md border p-3 space-y-3">
                                                <div className="text-sm font-medium opacity-80">
                                                    {t("PublicNote.Billing")}
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            {t("PublicNote.StartDate")}
                                                        </Label>
                                                        {/* Add 'Clear' button to allow removing the date */}
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="text-xs px-2 py-0 h-auto bg-gray-200 dark:bg-gray-700 ml-2"
                                                            onClick={() =>
                                                                patchPublicNote(
                                                                    "billingDataMod.startDate",
                                                                    undefined,
                                                                )
                                                            }
                                                        >
                                                            {t("PublicNote.ClearDate") ?? "Clear"}
                                                        </Button>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className="w-full justify-start text-left font-normal"
                                                                >
                                                                    {publicNoteObj.billingDataMod
                                                                        ?.startDate
                                                                        ? new Date(
                                                                              publicNoteObj.billingDataMod!.startDate!,
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
                                                                        startMonth={
                                                                            new Date(2000, 0)
                                                                        }
                                                                        endMonth={
                                                                            new Date(2050, 11)
                                                                        }
                                                                        selected={
                                                                            publicNoteObj
                                                                                .billingDataMod
                                                                                ?.startDate
                                                                                ? new Date(
                                                                                      publicNoteObj.billingDataMod!.startDate!,
                                                                                  )
                                                                                : undefined
                                                                        }
                                                                        onSelect={(d) => {
                                                                            if (!d) return
                                                                            patchPublicNoteDate(
                                                                                "billingDataMod.startDate",
                                                                                d,
                                                                            )
                                                                        }}
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                        {publicNoteErrors["billing.startDate"] && (
                                                            <p className="text-xs text-destructive mt-1">
                                                                {
                                                                    publicNoteErrors[
                                                                        "billing.startDate"
                                                                    ]
                                                                }
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
                                                                onClick={toggleEndNoExpiryLocal}
                                                            >
                                                                {publicNoteObj.billingDataMod
                                                                    ?.endDate ===
                                                                "0000-00-00T23:59:59+08:00"
                                                                    ? t("PublicNote.CancelNoExpiry")
                                                                    : t("PublicNote.SetNoExpiry")}
                                                            </Button>
                                                            {/* Add 'Clear' button to allow removing the date */}
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="text-xs px-2 py-0 h-auto bg-gray-200 dark:bg-gray-700"
                                                                onClick={() =>
                                                                    patchPublicNote(
                                                                        "billingDataMod.endDate",
                                                                        undefined,
                                                                    )
                                                                }
                                                            >
                                                                {t("PublicNote.ClearDate") ??
                                                                    "Clear"}
                                                            </Button>
                                                        </div>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className="w-full justify-start text-left font-normal"
                                                                >
                                                                    {publicNoteObj.billingDataMod
                                                                        ?.endDate
                                                                        ? publicNoteObj
                                                                              .billingDataMod
                                                                              ?.endDate ===
                                                                          "0000-00-00T23:59:59+08:00"
                                                                            ? t(
                                                                                  "PublicNote.NoExpiry",
                                                                              )
                                                                            : new Date(
                                                                                  publicNoteObj
                                                                                      .billingDataMod
                                                                                      ?.endDate as string,
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
                                                                        startMonth={
                                                                            new Date(2000, 0)
                                                                        }
                                                                        endMonth={
                                                                            new Date(2050, 11)
                                                                        }
                                                                        selected={
                                                                            publicNoteObj
                                                                                .billingDataMod
                                                                                ?.endDate &&
                                                                            publicNoteObj
                                                                                .billingDataMod
                                                                                ?.endDate !==
                                                                                "0000-00-00T23:59:59+08:00"
                                                                                ? new Date(
                                                                                      publicNoteObj
                                                                                          .billingDataMod
                                                                                          ?.endDate as string,
                                                                                  )
                                                                                : undefined
                                                                        }
                                                                        onSelect={(d) => {
                                                                            if (!d) return
                                                                            patchPublicNoteDate(
                                                                                "billingDataMod.endDate",
                                                                                d,
                                                                            )
                                                                        }}
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>

                                                        {publicNoteErrors["billing.endDate"] && (
                                                            <p className="text-xs text-destructive mt-1">
                                                                {
                                                                    publicNoteErrors[
                                                                        "billing.endDate"
                                                                    ]
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-xs">
                                                                {t("PublicNote.AutoRenewal")}
                                                            </Label>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <span className="text-xs">
                                                                {t("PublicNote.Disabled")}
                                                            </span>
                                                            <Switch
                                                                checked={
                                                                    publicNoteObj.billingDataMod
                                                                        ?.autoRenewal === "1"
                                                                }
                                                                onCheckedChange={(checked) =>
                                                                    patchPublicNote(
                                                                        "billingDataMod.autoRenewal",
                                                                        checked ? "1" : undefined,
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-xs">
                                                                {t("PublicNote.Enabled")}
                                                            </span>
                                                        </div>

                                                        {publicNoteErrors[
                                                            "billing.autoRenewal"
                                                        ] && (
                                                            <p className="text-xs text-destructive mt-1">
                                                                {
                                                                    publicNoteErrors[
                                                                        "billing.autoRenewal"
                                                                    ]
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-xs">
                                                                {t("PublicNote.Cycle")}
                                                            </Label>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="text-xs px-2 py-0 h-auto bg-gray-200 dark:bg-gray-700"
                                                                onClick={() =>
                                                                    patchPublicNote(
                                                                        "billingDataMod.cycle",
                                                                        undefined,
                                                                    )
                                                                }
                                                            >
                                                                {t("PublicNote.Clear") ?? "Clear"}
                                                            </Button>
                                                        </div>
                                                        <Select
                                                            onValueChange={(val) =>
                                                                patchPublicNote(
                                                                    "billingDataMod.cycle",
                                                                    val,
                                                                )
                                                            }
                                                            value={
                                                                publicNoteObj.billingDataMod?.cycle
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
                                                                    patchPublicNote(
                                                                        "billingDataMod.amount",
                                                                        "0",
                                                                    )
                                                                }
                                                            >
                                                                {t("PublicNote.Free")}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="text-xs px-2 py-0 h-auto bg-gray-200 dark:bg-gray-700"
                                                                onClick={() =>
                                                                    patchPublicNote(
                                                                        "billingDataMod.amount",
                                                                        "-1",
                                                                    )
                                                                }
                                                            >
                                                                {t("PublicNote.PayAsYouGo")}
                                                            </Button>
                                                        </div>
                                                        <Input
                                                            placeholder="200EUR"
                                                            value={
                                                                publicNoteObj.billingDataMod?.amount
                                                            }
                                                            onChange={(e) =>
                                                                patchPublicNote(
                                                                    "billingDataMod.amount",
                                                                    e.target.value,
                                                                )
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
                                                            value={
                                                                publicNoteObj.planDataMod?.bandwidth
                                                            }
                                                            onChange={(e) =>
                                                                patchPublicNote(
                                                                    "planDataMod.bandwidth",
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            {t("PublicNote.TrafficVolume")}
                                                        </Label>
                                                        <Input
                                                            placeholder="1TB/Month"
                                                            value={
                                                                publicNoteObj.planDataMod
                                                                    ?.trafficVol
                                                            }
                                                            onChange={(e) =>
                                                                patchPublicNote(
                                                                    "planDataMod.trafficVol",
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-xs">
                                                                {t("PublicNote.TrafficType")}
                                                            </Label>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="text-xs px-2 py-0 h-auto bg-gray-200 dark:bg-gray-700"
                                                                onClick={() =>
                                                                    patchPublicNote(
                                                                        "planDataMod.trafficType",
                                                                        undefined,
                                                                    )
                                                                }
                                                            >
                                                                {t("PublicNote.Clear") ?? "Clear"}
                                                            </Button>
                                                        </div>
                                                        <Select
                                                            onValueChange={(val) =>
                                                                patchPublicNote(
                                                                    "planDataMod.trafficType",
                                                                    val,
                                                                )
                                                            }
                                                            value={
                                                                publicNoteObj.planDataMod
                                                                    ?.trafficType ?? ""
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
                                                                {
                                                                    publicNoteErrors[
                                                                        "plan.trafficType"
                                                                    ]
                                                                }
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
                                                                    publicNoteObj.planDataMod
                                                                        ?.IPv4 === "1"
                                                                }
                                                                onCheckedChange={(checked) =>
                                                                    patchPublicNote(
                                                                        "planDataMod.IPv4",
                                                                        checked ? "1" : "0",
                                                                    )
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
                                                                    publicNoteObj.planDataMod
                                                                        ?.IPv6 === "1"
                                                                }
                                                                onCheckedChange={(checked) =>
                                                                    patchPublicNote(
                                                                        "planDataMod.IPv6",
                                                                        checked ? "1" : "0",
                                                                    )
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
                                                            placeholder={t(
                                                                "PublicNote.CommaSeparated",
                                                            )}
                                                            value={
                                                                publicNoteObj.planDataMod
                                                                    ?.networkRoute ?? ""
                                                            }
                                                            onChange={(e) =>
                                                                patchPublicNote(
                                                                    "planDataMod.networkRoute",
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1 sm:col-span-2">
                                                        <Label className="text-xs">
                                                            {t("PublicNote.Extra")}
                                                        </Label>
                                                        <Input
                                                            placeholder={t(
                                                                "PublicNote.CommaSeparated",
                                                            )}
                                                            value={
                                                                publicNoteObj.planDataMod?.extra ??
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                patchPublicNote(
                                                                    "planDataMod.extra",
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
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
