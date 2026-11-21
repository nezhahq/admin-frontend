import { createNotificationGroup, updateNotificationGroup } from "@/api/notification-group"
import { Button } from "@/components/ui/button"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconButton } from "@/components/xui/icon-button"
import { MultiSelect } from "@/components/xui/multi-select"
import { useNotification } from "@/hooks/useNotfication"
import { ModelNotificationGroupResponseItem } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { KeyedMutator } from "swr"
import { z } from "zod"

interface NotificationGroupCardProps {
    data?: ModelNotificationGroupResponseItem
    mutate: KeyedMutator<ModelNotificationGroupResponseItem[]>
}

const notificationGroupFormSchema = z.object({
    name: z.string().min(1),
    notifications: z.array(z.number()),
})

export const NotificationGroupCard: React.FC<NotificationGroupCardProps> = ({ data, mutate }) => {
    const { t } = useTranslation()
    // 表单要显示的值。打开编辑弹窗时会用它重置表单（见 handleOpenChange）。
    const formValuesOf = (source: typeof data) =>
        source
            ? {
                  name: source.group.name,
                  notifications: source.notifications,
              }
            : {
                  name: "",
                  notifications: [],
              }

    const form = useForm<z.infer<typeof notificationGroupFormSchema>>({
        resolver: zodResolver(notificationGroupFormSchema),
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

    const onSubmit = async (values: z.infer<typeof notificationGroupFormSchema>) => {
        try {
            if (data?.group.id) {
                await updateNotificationGroup(data.group.id, values)
            } else {
                await createNotificationGroup(values)
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

    const { notifiers } = useNotification()
    const notifierList = notifiers?.map((n) => ({
        value: `${n.id}`,
        label: n.name,
    })) || [{ value: "", label: "" }]

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
                                {data ? t("EditNotifierGroup") : t("CreateNotifierGroup")}
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
                                                <Input placeholder="Group Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="notifications"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("Notification")}</FormLabel>
                                            <MultiSelect
                                                options={notifierList}
                                                onValueChange={(e) => {
                                                    const arr = e.map(Number)
                                                    field.onChange(arr)
                                                }}
                                                defaultValue={field.value?.map(String)}
                                            />
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
