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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { ModelService, ModelServiceResponse } from "@/types"
import { createService, updateService } from "@/api/service"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { conv } from "@/lib/utils"
import { useState } from "react"
import { KeyedMutator } from "swr"
import { asOptionalField } from "@/lib/utils"
import { EditButton, PlusButton } from "@/components/xui/icon-buttons"
import { serviceTypes, serviceCoverageTypes } from "@/types"

interface ServiceCardProps {
    data?: ModelService;
    mutate: KeyedMutator<ModelServiceResponse>;
}

const serviceFormSchema = z.object({
    cover: z.coerce.number().min(0),
    duration: z.coerce.number().min(30),
    enable_show_in_service: asOptionalField(z.boolean()),
    enable_trigger_task: asOptionalField(z.boolean()),
    fail_trigger_tasks: z.array(z.string()).transform((v => {
        return v.filter(Boolean).map(Number);
    })),
    latency_notify: asOptionalField(z.boolean()),
    max_latency: z.coerce.number().min(0),
    min_latency: z.coerce.number().min(0),
    name: z.string().min(1),
    notification_group_id: z.coerce.number(),
    notify: asOptionalField(z.boolean()),
    recover_trigger_tasks: z.array(z.string()).transform((v => {
        return v.filter(Boolean).map(Number);
    })),
    skip_servers: z.record(z.boolean()),
    target: z.string().url(),
    type: z.coerce.number().min(0),
});

export const ServiceCard: React.FC<ServiceCardProps> = ({ data, mutate }) => {
    const form = useForm<z.infer<typeof serviceFormSchema>>({
        resolver: zodResolver(serviceFormSchema),
        defaultValues: data ? data : {
            type: 1,
            cover: 0,
            name: "",
            target: "",
            max_latency: 0.0,
            min_latency: 0.0,
            duration: 30,
            notification_group_id: 0,
            fail_trigger_tasks: [],
            recover_trigger_tasks: [],
            skip_servers: {},
        },
        resetOptions: {
            keepDefaultValues: false,
        }
    })

    const [open, setOpen] = useState(false);

    const onSubmit = async (values: z.infer<typeof serviceFormSchema>) => {
        data?.id ? await updateService(data.id, values) : await createService(values);
        setOpen(false);
        await mutate();
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {data
                    ?
                    <EditButton variant="outline" />
                    :
                    <PlusButton />
                }
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <ScrollArea className="max-h-[calc(100dvh-5rem)] p-3">
                    <div className="items-center mx-1">
                        <DialogHeader>
                            <DialogTitle>New Service</DialogTitle>
                            <DialogDescription />
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 my-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Service Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="My Service Monitor"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="target"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Target</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="HTTP (https://t.tt)｜Ping (t.tt)｜TCP (t.tt:80)"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={`${field.value}`}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select service type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(serviceTypes).map(([k, v]) => (
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
                                    name="enable_show_in_service"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">Show in Service</Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="duration"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Interval (s)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="30"
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
                                                        <SelectValue placeholder="Select service type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(serviceCoverageTypes).map(([k, v]) => (
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
                                    name="skip_servers"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Specific Servers (separate with comma)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="1,2,3"
                                                    {...field}
                                                    value={conv.recordToStr(field.value ?? {})}
                                                    onChange={e => {
                                                        const rec = conv.strToRecord(e.target.value);
                                                        field.onChange(rec);
                                                    }}
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
                                            <FormLabel>Notification Group ID</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="1"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="notify"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">Enable Failure Notification</Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="max_latency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Maximum Latency Time (ms)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="100.88"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="min_latency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Minimum Latency Time (ms)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="100.88"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="latency_notify"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">Enable Latency Notification</Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="enable_trigger_task"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <Label className="text-sm">Enable Trigger Task</Label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="fail_trigger_tasks"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tasks to trigger on an alarm (Separate with comma)</FormLabel>
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
                                <FormField
                                    control={form.control}
                                    name="recover_trigger_tasks"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tasks to trigger after recovery (Separate with comma)</FormLabel>
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
