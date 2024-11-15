import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
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
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ModelService } from "@/types"
import { createService, updateService } from "@/api/service"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"

interface ServiceCardProps {
    className?: string;
    data?: ModelService;
}

const serviceFormSchema = z.object({
    cover: z.number(),
    duration: z.number().min(30),
    enable_show_in_service: z.boolean().default(false),
    enable_trigger_task: z.boolean().default(false),
    fail_trigger_tasks: z.array(z.number()),
    latency_notify: z.boolean(),
    max_latency: z.number(),
    min_latency: z.number(),
    name: z.string(),
    notification_group_id: z.number(),
    notify: z.boolean(),
    recover_trigger_tasks: z.array(z.number()),
    skip_servers: z.record(z.boolean()),
    target: z.string(),
    type: z.number(),
});

const serviceTypes = {
    1: "HTTP GET (Certificate expiration and changes)",
    2: "ICMP Ping",
    3: "TCPing",
}

const serviceCoverageTypes = {
    0: "All excludes specific servers",
    1: "Only specific servers",
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ className, data }) => {
    const form = useForm<z.infer<typeof serviceFormSchema>>({
        resolver: zodResolver(serviceFormSchema),
        defaultValues: data,
    })

    const onSubmit = (values: z.infer<typeof serviceFormSchema>) => {
        data?.id ? updateService(data.id, values)
            : createService(values);
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className={`${className}`}>
                    <Plus /> Add New Service
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Service</DialogTitle>
                </DialogHeader>
                <div className="items-center">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
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
                                            <Input type="link" placeholder="HTTP (https://t.tt)｜Ping (t.tt)｜TCP (t.tt:80)" {...field} />
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
                                                    <SelectItem value={k}>{v}</SelectItem>
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
                                        <FormLabel>Interval</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="Seconds" {...field} />
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
                                                    <SelectItem value={k}>{v}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>
                <DialogFooter className="sm:justify-start">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
