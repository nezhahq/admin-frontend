import { createAlertRule, updateAlertRule } from "@/api/alert-rule"
import { Button } from "@/components/ui/button"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { IconButton } from "@/components/xui/icon-button"
import { useNotification } from "@/hooks/useNotfication"
import { conv } from "@/lib/utils"
import { asOptionalField } from "@/lib/utils"
import { ModelAlertRule } from "@/types"
import { triggerModes } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { KeyedMutator } from "swr"
import { z } from "zod"

import { Combobox } from "./ui/combobox"
import { Textarea } from "./ui/textarea"

interface AlertRuleCardProps {
    data?: ModelAlertRule
    mutate: KeyedMutator<ModelAlertRule[]>
}

const ruleSchema = z.object({
    type: z.string(),
    min: asOptionalField(z.number()),
    max: asOptionalField(z.number()),
    cycle_start: asOptionalField(z.string()),
    cycle_interval: asOptionalField(z.number()),
    cycle_unit: asOptionalField(z.enum(["hour", "day", "week", "month", "year"])),
    duration: asOptionalField(z.number()),
    cover: z.number().int().min(0),
    ignore: asOptionalField(z.record(z.boolean())),
    next_transfer_at: asOptionalField(z.record(z.string())),
    last_cycle_status: asOptionalField(z.boolean()),
})

const alertRuleFormSchema = z.object({
    name: z.string().min(1),
    rules_raw: z.string().refine(
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
    rules: z.array(ruleSchema),
    fail_trigger_tasks: z.array(z.number()),
    recover_trigger_tasks: z.array(z.number()),
    notification_group_id: z.coerce.number().int(),
    trigger_mode: z.coerce.number().int().min(0),
    enable: asOptionalField(z.boolean()),
})

export const AlertRuleCard: React.FC<AlertRuleCardProps> = ({ data, mutate }) => {
    const { t } = useTranslation()
    const form = useForm<z.infer<typeof alertRuleFormSchema>>({
        resolver: zodResolver(alertRuleFormSchema),
        defaultValues: data
            ? {
                  ...data,
                  rules_raw: JSON.stringify(data.rules),
              }
            : {
                  name: "",
                  rules_raw: "",
                  rules: [],
                  fail_trigger_tasks: [],
                  recover_trigger_tasks: [],
                  notification_group_id: 0,
                  trigger_mode: 0,
              },
        resetOptions: {
            keepDefaultValues: false,
        },
    })

    const [open, setOpen] = useState(false)

    const onSubmit = async (values: z.infer<typeof alertRuleFormSchema>) => {
        values.rules = JSON.parse(values.rules_raw)
        const { rules_raw, ...requiredFields } = values
        data?.id
            ? await updateAlertRule(data.id, requiredFields)
            : await createAlertRule(requiredFields)
        setOpen(false)
        await mutate()
        form.reset()
    }

    const { notifierGroup } = useNotification()
    const ngroupList = notifierGroup?.map((ng) => ({
        value: `${ng.group.id}`,
        label: ng.group.name,
    })) || [{ value: "", label: "" }]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {data ? <IconButton variant="outline" icon="edit" /> : <IconButton icon="plus" />}
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <ScrollArea className="max-h-[calc(100dvh-5rem)] p-3">
                    <div className="items-center mx-1">
                        <DialogHeader>
                            <DialogTitle>
                                {data ? t("EditAlertRule") : t("CreateAlertRule")}
                            </DialogTitle>
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
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="rules_raw"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("Rules")}</FormLabel>
                                            <FormControl>
                                                <Textarea className="resize-y" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="notification_group_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("NotifierGroup")}</FormLabel>
                                            <FormControl>
                                                <Combobox
                                                    placeholder="Search..."
                                                    options={ngroupList}
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value.toString()}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="trigger_mode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("TriggerMode")}</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={`${field.value}`}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(triggerModes).map(([k, v]) => (
                                                        <SelectItem key={k} value={k}>
                                                            {v}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="fail_trigger_tasks"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("TasksToTriggerOnAlert") +
                                                    t("SeparateWithComma")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="1,2,3"
                                                    {...field}
                                                    value={conv.arrToStr(field.value ?? [])}
                                                    onChange={(e) => {
                                                        const arr = conv
                                                            .strToArr(e.target.value)
                                                            .map(Number)
                                                        field.onChange(arr)
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="recover_trigger_tasks"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("TasksToTriggerAfterRecovery") +
                                                    t("SeparateWithComma")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="1,2,3"
                                                    {...field}
                                                    value={conv.arrToStr(field.value ?? [])}
                                                    onChange={(e) => {
                                                        const arr = conv
                                                            .strToArr(e.target.value)
                                                            .map(Number)
                                                        field.onChange(arr)
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="enable"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">{t("Enable")}</Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter className="justify-end">
                                    <DialogClose asChild>
                                        <Button type="button" className="my-2" variant="secondary">
                                            {t("Close")}
                                        </Button>
                                    </DialogClose>
                                    <Button type="submit" className="my-2">
                                        {t("Confirm")}
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
