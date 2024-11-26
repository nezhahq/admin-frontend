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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ModelCron } from "@/types"
import { useState } from "react"
import { KeyedMutator } from "swr"
import { IconButton } from "@/components/xui/icon-button"
import { createCron, updateCron } from "@/api/cron"
import { asOptionalField } from "@/lib/utils"
import { cronTypes, cronCoverageTypes } from "@/types"
import { Textarea } from "./ui/textarea"
import { useServer } from "@/hooks/useServer"
import { useNotification } from "@/hooks/useNotfication"
import { MultiSelect } from "./xui/multi-select"
import { Combobox } from "./ui/combobox"

interface CronCardProps {
    data?: ModelCron;
    mutate: KeyedMutator<ModelCron[]>;
}

const cronFormSchema = z.object({
    task_type: z.coerce.number(),
    name: z.string().min(1),
    scheduler: z.string(),
    command: asOptionalField(z.string()),
    servers: z.array(z.number()),
    cover: z.coerce.number().int(),
    push_successful: asOptionalField(z.boolean()),
    notification_group_id: z.coerce.number().int(),
});

export const CronCard: React.FC<CronCardProps> = ({ data, mutate }) => {
    const form = useForm<z.infer<typeof cronFormSchema>>({
        resolver: zodResolver(cronFormSchema),
        defaultValues: data ? data : {
            name: "",
            task_type: 0,
            scheduler: "",
            servers: [],
            cover: 0,
            notification_group_id: 0,
        },
        resetOptions: {
            keepDefaultValues: false,
        }
    })

    const [open, setOpen] = useState(false);

    const onSubmit = async (values: z.infer<typeof cronFormSchema>) => {
        data?.id ? await updateCron(data.id, values) : await createCron(values);
        setOpen(false);
        await mutate();
        form.reset();
    }

    const { servers } = useServer();
    const serverList = servers?.map(s => ({
        value: `${s.id}`,
        label: s.name,
    })) || [{ value: "", label: "" }];

    const { notifierGroup } = useNotification();
    const ngroupList = notifierGroup?.map(ng => ({
        value: `${ng.group.id}`,
        label: ng.group.name,
    })) || [{ value: "", label: "" }];

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
                            <DialogTitle>New Task</DialogTitle>
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
                                                    placeholder="My Task"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="task_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Task Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={`${field.value}`}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select task type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(cronTypes).map(([k, v]) => (
                                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scheduler"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cron expression</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="0 0 0 3 * * (At 3 AM)"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="command"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Command</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    className="resize-y"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cover"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Coverage</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={`${field.value}`}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(cronCoverageTypes).map(([k, v]) => (
                                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="servers"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Specific Servers</FormLabel>
                                            <FormControl>
                                                <MultiSelect
                                                    options={serverList}
                                                    onValueChange={e => {
                                                        const arr = e.map(Number);
                                                        field.onChange(arr);
                                                    }}
                                                    defaultValue={field.value?.map(String)}
                                                />
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
                                            <FormLabel>Notifier Group ID</FormLabel>
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
