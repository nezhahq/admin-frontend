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
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ModelNotificationGroupResponseItem } from "@/types"
import { useState } from "react"
import { KeyedMutator } from "swr"
import { IconButton } from "@/components/xui/icon-button"
import { createNotificationGroup, updateNotificationGroup } from "@/api/notification-group"
import { conv } from "@/lib/utils"

interface NotificationGroupCardProps {
    data?: ModelNotificationGroupResponseItem;
    mutate: KeyedMutator<ModelNotificationGroupResponseItem[]>;
}

const notificationGroupFormSchema = z.object({
    name: z.string().min(1),
    notifications: z.array(z.string()).transform((v => {
        return v.filter(Boolean).map(Number);
    })),
});

export const NotificationGroupCard: React.FC<NotificationGroupCardProps> = ({ data, mutate }) => {
    const form = useForm<z.infer<typeof notificationGroupFormSchema>>({
        resolver: zodResolver(notificationGroupFormSchema),
        defaultValues: data ? data : {
            name: "",
            notifications: [],
        },
        resetOptions: {
            keepDefaultValues: false,
        }
    })

    const [open, setOpen] = useState(false);

    const onSubmit = async (values: z.infer<typeof notificationGroupFormSchema>) => {
        data?.group.id ? await updateNotificationGroup(data.group.id, values) : await createNotificationGroup(values);
        setOpen(false);
        await mutate();
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {data
                    ?
                    <IconButton variant="outline" icon="edit" />
                    :
                    <IconButton icon="plus" />
                }
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <ScrollArea className="max-h-[calc(100dvh-5rem)] p-3">
                    <div className="items-center mx-1">
                        <DialogHeader>
                            <DialogTitle>New Notifier Group</DialogTitle>
                            <DialogDescription />
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 my-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Group Name"
                                                    {...field}
                                                />
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
                                            <FormLabel>Notifiers</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="1,2,3"
                                                    {...field}
                                                    value={conv.arrToStr(field.value ?? [])}
                                                    onChange={e => {
                                                        const arr = conv.strToArr(e.target.value);
                                                        field.onChange(arr);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter className="justify-end">
                                    <DialogClose asChild>
                                        <Button type="button" className="my-2" variant="secondary">
                                            Close
                                        </Button>
                                    </DialogClose>
                                    <Button type="submit" className="my-2">Submit</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
