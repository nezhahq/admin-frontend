import { createNotification, updateNotification } from "@/api/notification"
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
import { asOptionalField } from "@/lib/utils"
import { ModelNotification } from "@/types"
import { nrequestMethods, nrequestTypes } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { KeyedMutator } from "swr"
import { z } from "zod"

import { Textarea } from "./ui/textarea"

interface NotifierCardProps {
    data?: ModelNotification
    mutate: KeyedMutator<ModelNotification[]>
}

const notificationFormSchema = z.object({
    name: z.string().min(1),
    url: z.string().url(),
    request_method: z.coerce.number().int().min(1).max(255),
    request_type: z.coerce.number().int().min(1).max(255),
    request_header: z.string(),
    request_body: z.string(),
    verify_tls: asOptionalField(z.boolean()),
    skip_check: asOptionalField(z.boolean()),
    format_metric_units: asOptionalField(z.boolean()),
})

export const NotifierCard: React.FC<NotifierCardProps> = ({ data, mutate }) => {
    const { t } = useTranslation()
    type NotificationFormInput = z.input<typeof notificationFormSchema>
    type NotificationFormData = z.output<typeof notificationFormSchema>
    type NotificationDefaults = ModelNotification &
        Partial<Pick<NotificationFormData, "skip_check">>
    const notificationDefaults: NotificationDefaults | undefined = data

    // 表单要显示的值。打开编辑弹窗时会用它重置表单（见 handleOpenChange）。
    const formValuesOf = (source: typeof data) =>
        source
            ? {
                  name: source.name ?? "",
                  url: source.url ?? "",
                  request_method: source.request_method ?? 1,
                  request_type: source.request_type ?? 1,
                  request_header: source.request_header ?? "",
                  request_body: source.request_body ?? "",
                  verify_tls: source.verify_tls ?? false,
                  skip_check: notificationDefaults?.skip_check ?? false,
                  format_metric_units: source.format_metric_units ?? false,
              }
            : {
                  name: "",
                  url: "",
                  request_method: 1,
                  request_type: 1,
                  request_header: "",
                  request_body: "",
                  verify_tls: false,
                  skip_check: false,
                  format_metric_units: false,
              }

    const form = useForm<NotificationFormInput, unknown, NotificationFormData>({
        resolver: zodResolver(notificationFormSchema),
        defaultValues: formValuesOf(data),
        resetOptions: {
            keepDefaultValues: false,
        },
    })

    const [open, setOpen] = useState(false)

    // 编辑弹窗每次打开都要用当前这一行的数据重置表单。表单的初始值只在组件挂载时
    // 读取一次，而这个组件会跨列表刷新一直存活：不重置的话，保存后再打开看到的
    // 还是修改前的旧值，直接保存就把新数据盖回去了。
    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen && data) {
            form.reset(formValuesOf(data))
        }
        setOpen(nextOpen)
    }

    const onSubmit = async (values: NotificationFormData) => {
        try {
            if (data?.id) {
                await updateNotification(data.id, values)
            } else {
                await createNotification(values)
            }
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {data ? <IconButton variant="outline" icon="edit" /> : <IconButton icon="plus" />}
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <ScrollArea className="max-h-[calc(100dvh-5rem)] p-3">
                    <div className="items-center mx-1">
                        <DialogHeader>
                            <DialogTitle>
                                {data ? t("EditNotifier") : t("CreateNotifier")}
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
                                                <Input placeholder="My Notifier" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>URL</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="request_method"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("RequestMethod")}</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={`${field.value}`}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Request Method" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(nrequestMethods).map(
                                                        ([k, v]) => (
                                                            <SelectItem key={k} value={k}>
                                                                {v}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="request_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("Type")}</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={`${field.value}`}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Request Type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(nrequestTypes).map(([k, v]) => (
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
                                    name="request_header"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("RequestHeader")}</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    className="resize-y"
                                                    placeholder='{"User-Agent":"Nezha-Agent"}'
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="request_body"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("RequestBody")}</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    className="resize-y h-[240px]"
                                                    placeholder='{&#13;&#10;  "content":"#NEZHA#",&#13;&#10;  "ServerName":"#SERVER.NAME#",&#13;&#10;  "ServerIP":"#SERVER.IP#",&#13;&#10;  "ServerIPV4":"#SERVER.IPV4#",&#13;&#10;  "ServerIPV6":"#SERVER.IPV6#",&#13;&#10;  "CPU":"#SERVER.CPU#",&#13;&#10;  "MEM":"#SERVER.MEM#",&#13;&#10;  "SWAP":"#SERVER.SWAP#",&#13;&#10;  "DISK":"#SERVER.DISK#",&#13;&#10;  "NetInSpeed":"#SERVER.NETINSPEED#",&#13;&#10;  "NetOutSpeed":"#SERVER.NETOUTSPEED#",&#13;&#10;  "TransferIn":"#SERVER.TRANSFERIN#",&#13;&#10;  "TranferOut":"#SERVER.TRANSFEROUT#",&#13;&#10;  "Load1":"#SERVER.LOAD1#",&#13;&#10;  "Load5":"#SERVER.LOAD5#",&#13;&#10;  "Load15":"#SERVER.LOAD15#",&#13;&#10;  "TCP_CONN_COUNT":"#SERVER.TCPCONNCOUNT",&#13;&#10;  "UDP_CONN_COUNT":"#SERVER.UDPCONNCOUNT"&#13;&#10;}'
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="verify_tls"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value === true}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">
                                                        {t("VerifyTLS")}
                                                    </Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="skip_check"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value === true}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">
                                                        {t("DoNotSendTestMessage")}
                                                    </Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="format_metric_units"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value === true}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">
                                                        {t("FormatMetricUnits")}
                                                    </Label>
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
