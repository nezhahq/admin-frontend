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
    const form = useForm<z.infer<typeof notificationGroupFormSchema>>({
        resolver: zodResolver(notificationGroupFormSchema),
        defaultValues: data
            ? {
                  name: data.group.name,
                  notifications: data.notifications,
              }
            : {
                  name: "",
                  notifications: [],
              },
        resetOptions: {
            keepDefaultValues: false,
        },
    })

    const [open, setOpen] = useState(false)

    const onSubmit = async (values: z.infer<typeof notificationGroupFormSchema>) => {
        try {
            data?.group.id
                ? await updateNotificationGroup(data.group.id, values)
                : await createNotificationGroup(values)
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
        <Dialog open={open} onOpenChange={setOpen}>
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
