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
import { ModelAlertRule } from "@/types"
import { triggerModes } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
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
    min: z.number().optional(),
    max: z.number().optional(),
    cycle_start: z.string().optional(),
    cycle_interval: z.number().optional(),
    cycle_unit: z.enum(["hour", "day", "week", "month", "year"]).optional(),
    duration: z.number().optional(),
    cover: z.number().int().min(0),
    ignore: z.record(z.string(), z.boolean()).optional(),
    next_transfer_at: z.record(z.string(), z.string()).optional(),
    last_cycle_status: z.boolean().optional(),
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
    fail_trigger_tasks_raw: z.string(),
    recover_trigger_tasks: z.array(z.number()),
    recover_trigger_tasks_raw: z.string(),
    notification_group_id: z.coerce.number().int(),
    trigger_mode: z.coerce.number().int().min(0),
    enable: z.boolean().optional(),
})

export const AlertRuleCard: React.FC<AlertRuleCardProps> = ({ data, mutate }) => {
    const { t } = useTranslation()

    type AlertRuleFormData = z.infer<typeof alertRuleFormSchema>

    const form = useForm({
        resolver: zodResolver(alertRuleFormSchema) as any,
        defaultValues: data
            ? {
                  ...data,
                  rules_raw: JSON.stringify(data.rules),
                  fail_trigger_tasks_raw: conv.arrToStr(data.fail_trigger_tasks),
                  recover_trigger_tasks_raw: conv.arrToStr(data.recover_trigger_tasks),
              }
            : {
                  name: "",
                  rules_raw: "",
                  rules: [],
                  fail_trigger_tasks: [],
                  fail_trigger_tasks_raw: "",
                  recover_trigger_tasks: [],
                  recover_trigger_tasks_raw: "",
                  notification_group_id: 0,
                  trigger_mode: 0,
              },
        resetOptions: {
            keepDefaultValues: false,
        },
    })

    const [open, setOpen] = useState(false)

    // 结构化规则编辑状态：从已有数据或 rules_raw 初始化
    const initialRules = (() => {
        try {
            if (data?.rules) return data.rules as any[]
            const raw = form.getValues("rules_raw")
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    })()
    const [rulesUI, setRulesUI] = useState<any[]>(initialRules)

    // 同步到 rules_raw（提交仍走 JSON 字符串）
    useEffect(() => {
        try {
            form.setValue("rules_raw", JSON.stringify(rulesUI), { shouldDirty: true })
        } catch {
            // ignore
        }
    }, [rulesUI])

    const onSubmit = async (values: AlertRuleFormData) => {
        values.rules = JSON.parse(values.rules_raw)
        values.fail_trigger_tasks = conv.strToArr(values.fail_trigger_tasks_raw).map(Number)
        values.recover_trigger_tasks = conv.strToArr(values.recover_trigger_tasks_raw).map(Number)
        const { rules_raw, ...requiredFields } = values
        try {
            data?.id
                ? await updateAlertRule(data.id, requiredFields)
                : await createAlertRule(requiredFields)
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
                            <form
                                onSubmit={form.handleSubmit(onSubmit as any)}
                                className="space-y-2 my-2"
                            >
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
                                {/* 结构化规则编辑器 */}
                                <FormItem>
                                    <FormLabel>{t("Rules")}</FormLabel>
                                    <div className="space-y-3">
                                        {rulesUI.map((r, idx) => {
                                            const isCycle =
                                                typeof r.type === "string" &&
                                                r.type.endsWith("_cycle")
                                            const isOffline = r.type === "offline"
                                            return (
                                                <div
                                                    key={idx}
                                                    className="rounded-md border p-3 space-y-2"
                                                >
                                                    {/* 类型选择 */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div>
                                                            <Label className="text-sm">
                                                                {t("Type")}
                                                            </Label>
                                                            <Select
                                                                onValueChange={(val) => {
                                                                    const next = [...rulesUI]
                                                                    next[idx] = {
                                                                        ...next[idx],
                                                                        type: val,
                                                                    }
                                                                    // 切换类型时，若不是周期型，清理周期字段
                                                                    if (!val.endsWith("_cycle")) {
                                                                        delete next[idx].cycle_start
                                                                        delete next[idx]
                                                                            .cycle_interval
                                                                        delete next[idx].cycle_unit
                                                                    }
                                                                    setRulesUI(next)
                                                                }}
                                                                defaultValue={r.type || ""}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue
                                                                        placeholder={t("Select")}
                                                                    />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {/* 资源类 */}
                                                                    <SelectItem value="cpu">
                                                                        cpu
                                                                    </SelectItem>
                                                                    <SelectItem value="gpu">
                                                                        gpu
                                                                    </SelectItem>
                                                                    <SelectItem value="memory">
                                                                        memory
                                                                    </SelectItem>
                                                                    <SelectItem value="swap">
                                                                        swap
                                                                    </SelectItem>
                                                                    <SelectItem value="disk">
                                                                        disk
                                                                    </SelectItem>
                                                                    {/* 网络类 */}
                                                                    <SelectItem value="net_in_speed">
                                                                        net_in_speed
                                                                    </SelectItem>
                                                                    <SelectItem value="net_out_speed">
                                                                        net_out_speed
                                                                    </SelectItem>
                                                                    <SelectItem value="net_all_speed">
                                                                        net_all_speed
                                                                    </SelectItem>
                                                                    <SelectItem value="transfer_in">
                                                                        transfer_in
                                                                    </SelectItem>
                                                                    <SelectItem value="transfer_out">
                                                                        transfer_out
                                                                    </SelectItem>
                                                                    <SelectItem value="transfer_all">
                                                                        transfer_all
                                                                    </SelectItem>
                                                                    {/* 系统类 */}
                                                                    <SelectItem value="offline">
                                                                        offline
                                                                    </SelectItem>
                                                                    <SelectItem value="load1">
                                                                        load1
                                                                    </SelectItem>
                                                                    <SelectItem value="load5">
                                                                        load5
                                                                    </SelectItem>
                                                                    <SelectItem value="load15">
                                                                        load15
                                                                    </SelectItem>
                                                                    <SelectItem value="process_count">
                                                                        process_count
                                                                    </SelectItem>
                                                                    {/* 连接数 */}
                                                                    <SelectItem value="tcp_conn_count">
                                                                        tcp_conn_count
                                                                    </SelectItem>
                                                                    <SelectItem value="udp_conn_count">
                                                                        udp_conn_count
                                                                    </SelectItem>
                                                                    {/* 温度 */}
                                                                    <SelectItem value="temperature_max">
                                                                        temperature_max
                                                                    </SelectItem>
                                                                    {/* 特殊：周期流量 */}
                                                                    <SelectItem value="transfer_in_cycle">
                                                                        transfer_in_cycle
                                                                    </SelectItem>
                                                                    <SelectItem value="transfer_out_cycle">
                                                                        transfer_out_cycle
                                                                    </SelectItem>
                                                                    <SelectItem value="transfer_all_cycle">
                                                                        transfer_all_cycle
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-sm">
                                                                duration
                                                            </Label>
                                                            <Input
                                                                type="number"
                                                                value={r.duration ?? ""}
                                                                onChange={(e) => {
                                                                    const next = [...rulesUI]
                                                                    next[idx] = {
                                                                        ...next[idx],
                                                                        duration: e.target.value
                                                                            ? Number(e.target.value)
                                                                            : undefined,
                                                                    }
                                                                    setRulesUI(next)
                                                                }}
                                                                placeholder="10"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* 阈值：offline 不需要 min/max */}
                                                    {!isOffline && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <div>
                                                                <Label className="text-sm">
                                                                    min
                                                                </Label>
                                                                <Input
                                                                    type="number"
                                                                    value={r.min ?? ""}
                                                                    onChange={(e) => {
                                                                        const next = [...rulesUI]
                                                                        next[idx] = {
                                                                            ...next[idx],
                                                                            min: e.target.value
                                                                                ? Number(
                                                                                      e.target
                                                                                          .value,
                                                                                  )
                                                                                : undefined,
                                                                        }
                                                                        setRulesUI(next)
                                                                    }}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-sm">
                                                                    max
                                                                </Label>
                                                                <Input
                                                                    type="number"
                                                                    value={r.max ?? ""}
                                                                    onChange={(e) => {
                                                                        const next = [...rulesUI]
                                                                        next[idx] = {
                                                                            ...next[idx],
                                                                            max: e.target.value
                                                                                ? Number(
                                                                                      e.target
                                                                                          .value,
                                                                                  )
                                                                                : undefined,
                                                                        }
                                                                        setRulesUI(next)
                                                                    }}
                                                                    placeholder="100"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 覆盖/忽略 */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div>
                                                            <Label className="text-sm">cover</Label>
                                                            <Select
                                                                onValueChange={(val) => {
                                                                    const next = [...rulesUI]
                                                                    next[idx] = {
                                                                        ...next[idx],
                                                                        cover: Number(val),
                                                                    }
                                                                    setRulesUI(next)
                                                                }}
                                                                defaultValue={(
                                                                    r.cover ?? 0
                                                                ).toString()}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="0">
                                                                        0（
                                                                        {t(
                                                                            "AlertRules.CoverAllServers",
                                                                        )}
                                                                        ）
                                                                    </SelectItem>
                                                                    <SelectItem value="1">
                                                                        1（
                                                                        {t(
                                                                            "AlertRules.IgnoreAllSelectSpecific",
                                                                        )}
                                                                        ）
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-sm">
                                                                {t("AlertRules.IgnoreHint", {
                                                                    server: t("Server"),
                                                                })}
                                                            </Label>
                                                            {/* 简化：以 JSON 对象输入 */}
                                                            <Textarea
                                                                className="resize-y"
                                                                value={(() => {
                                                                    try {
                                                                        return r.ignore
                                                                            ? JSON.stringify(
                                                                                  r.ignore,
                                                                              )
                                                                            : ""
                                                                    } catch {
                                                                        return ""
                                                                    }
                                                                })()}
                                                                onChange={(e) => {
                                                                    const next = [...rulesUI]
                                                                    try {
                                                                        const obj = e.target.value
                                                                            ? JSON.parse(
                                                                                  e.target.value,
                                                                              )
                                                                            : undefined
                                                                        next[idx] = {
                                                                            ...next[idx],
                                                                            ignore: obj,
                                                                        }
                                                                    } catch {
                                                                        // 保持原值，避免无效 JSON 覆盖
                                                                    }
                                                                    setRulesUI(next)
                                                                }}
                                                                placeholder={t(
                                                                    "AlertRules.IgnoreExample",
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* 周期型字段 */}
                                                    {isCycle && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <div className="sm:col-span-2">
                                                                <Label className="text-sm">
                                                                    cycle_start (RFC3339)
                                                                </Label>
                                                                <Input
                                                                    value={r.cycle_start ?? ""}
                                                                    onChange={(e) => {
                                                                        const next = [...rulesUI]
                                                                        next[idx] = {
                                                                            ...next[idx],
                                                                            cycle_start:
                                                                                e.target.value ||
                                                                                undefined,
                                                                        }
                                                                        setRulesUI(next)
                                                                    }}
                                                                    placeholder="2022-01-01T00:00:00+08:00"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-sm">
                                                                    cycle_interval
                                                                </Label>
                                                                <Input
                                                                    type="number"
                                                                    value={r.cycle_interval ?? ""}
                                                                    onChange={(e) => {
                                                                        const next = [...rulesUI]
                                                                        next[idx] = {
                                                                            ...next[idx],
                                                                            cycle_interval: e.target
                                                                                .value
                                                                                ? Number(
                                                                                      e.target
                                                                                          .value,
                                                                                  )
                                                                                : undefined,
                                                                        }
                                                                        setRulesUI(next)
                                                                    }}
                                                                    placeholder="1"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-sm">
                                                                    cycle_unit
                                                                </Label>
                                                                <Select
                                                                    onValueChange={(val) => {
                                                                        const next = [...rulesUI]
                                                                        next[idx] = {
                                                                            ...next[idx],
                                                                            cycle_unit: val,
                                                                        }
                                                                        setRulesUI(next)
                                                                    }}
                                                                    defaultValue={
                                                                        r.cycle_unit || "month"
                                                                    }
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="hour">
                                                                            hour
                                                                        </SelectItem>
                                                                        <SelectItem value="day">
                                                                            day
                                                                        </SelectItem>
                                                                        <SelectItem value="week">
                                                                            week
                                                                        </SelectItem>
                                                                        <SelectItem value="month">
                                                                            month
                                                                        </SelectItem>
                                                                        <SelectItem value="year">
                                                                            year
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                const next = [...rulesUI]
                                                                next.splice(idx, 1)
                                                                setRulesUI(next)
                                                            }}
                                                        >
                                                            {t("Delete")}
                                                        </Button>
                                                        {/* 占位以对齐 */}
                                                        <span />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setRulesUI([
                                                        ...rulesUI,
                                                        { type: "", cover: 0, duration: 10 },
                                                    ])
                                                }}
                                            >
                                                {t("Add")}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 高级：直接编辑 JSON（与结构化编辑器同步） */}
                                    <FormLabel className="mt-3">{t("AdvancedJSON")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className="resize-y"
                                            value={form.watch("rules_raw")}
                                            onChange={(e) => {
                                                // 同步到结构化编辑器
                                                form.setValue("rules_raw", e.target.value, {
                                                    shouldDirty: true,
                                                })
                                                try {
                                                    const arr = JSON.parse(e.target.value)
                                                    if (Array.isArray(arr)) setRulesUI(arr)
                                                } catch {
                                                    // ignore invalid
                                                }
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                                <FormField
                                    control={form.control}
                                    name="notification_group_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("NotifierGroup")}</FormLabel>
                                            <FormControl>
                                                <Combobox
                                                    placeholder={t("Search")}
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
                                    name="fail_trigger_tasks_raw"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("TasksToTriggerOnAlert") +
                                                    t("SeparateWithComma")}
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
                                    name="recover_trigger_tasks_raw"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("TasksToTriggerAfterRecovery") +
                                                    t("SeparateWithComma")}
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
