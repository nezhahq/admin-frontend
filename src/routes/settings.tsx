import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ModelConfig, settingCoverageTypes, nezhaLang } from "@/types";
import { SettingsTab } from "@/components/settings-tab";
import { z } from "zod";
import { asOptionalField } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { getSettings, updateSettings } from "@/api/settings";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const settingFormSchema = z.object({
    custom_nameservers: asOptionalField(z.string()),
    ignored_ip_notification: asOptionalField(z.string()),
    ip_change_notification_group_id: z.coerce.number().int().min(0),
    cover: z.coerce.number().int().min(1),
    site_name: z.string().min(1),
    language: z.string().min(2),
    install_host: asOptionalField(z.string()),
    custom_code: asOptionalField(z.string()),
    custom_code_dashboard: asOptionalField(z.string()),
    real_ip_header: asOptionalField(z.string()),

    enable_ip_change_notification: asOptionalField(z.boolean()),
    enable_plain_ip_in_notification: asOptionalField(z.boolean()),
});

export default function SettingsPage() {
    const [config, setConfig] = useState<ModelConfig>();
    const [error, setError] = useState<Error>();

    useEffect(() => {
        if (error)
            toast("Error", {
                description: `Error fetching resource: ${error.message}.`,
            });
    }, [error]);

    useEffect(() => {
        (async () => {
            try {
                const c = await getSettings();
                setConfig(c);
            } catch (e) {
                if (e instanceof Error) setError(e);
            }
        })();
    }, []);

    const form = useForm<z.infer<typeof settingFormSchema>>({
        resolver: zodResolver(settingFormSchema),
        defaultValues: config
            ? config
            : {
                ip_change_notification_group_id: 0,
                cover: 1,
                site_name: "",
                language: "",
            },
        resetOptions: {
            keepDefaultValues: false,
        },
    });

    useEffect(() => {
        if (config) {
            form.reset(config);
        }
    }, [config, form]);

    const onSubmit = async (values: z.infer<typeof settingFormSchema>) => {
        try {
            await updateSettings(values);
            const newConfig = await getSettings();
            setConfig(newConfig);
            form.reset();
        } catch (e) {
            if (e instanceof Error) setError(e);
            return;
        } finally {
            toast("Success", {
                description: "Config updated successfully.",
            });
        }
    };

    return (
        <div className="px-8">
            <SettingsTab className="mt-6 mb-4 w-full" />
            <div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 my-2">
                        <FormField
                            control={form.control}
                            name="site_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Site Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="language"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Language</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(nezhaLang).map(([k, v]) => (
                                                    <SelectItem key={k} value={k}>
                                                        {v}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="custom_code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Custom Codes (Style and Script)</FormLabel>
                                    <FormControl>
                                        <Textarea className="resize-y min-h-48" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="custom_code_dashboard"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Custom Codes for Dashboard</FormLabel>
                                    <FormControl>
                                        <Textarea className="resize-y min-h-48" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="install_host"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dashboard Server Domain/IP without CDN</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="custom_nameservers"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                    Custom Public DNS Nameservers for DDNS (separate with comma)
                                    </FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="real_ip_header"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Real IP Header</FormLabel>
                                    <FormControl>
                                        <Input placeholder="NZ::Use-Peer-IP" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormItem>
                            <FormLabel>IP Change Notification</FormLabel>
                            <Card className="w-full">
                                <CardContent>
                                    <div className="flex flex-col space-y-4 mt-4">
                                        <FormField
                                            control={form.control}
                                            name="cover"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Coverage</FormLabel>
                                                    <Select onValueChange={field.onChange} value={`${field.value}`}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.entries(settingCoverageTypes).map(([k, v]) => (
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
                                            name="ignored_ip_notification"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Specific Servers (separate with comma)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="1,2,3" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="enable_ip_change_notification"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2">
                                                    <FormControl>
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                            <Label className="text-sm">Enable</Label>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </FormItem>
                        <FormField
                            control={form.control}
                            name="enable_plain_ip_in_notification"
                            render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            <Label className="text-sm">
                        Show Full IP Address in Notification Messages
                                            </Label>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Save</Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
