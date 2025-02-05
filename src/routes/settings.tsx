import { updateSettings } from "@/api/settings"
import { SettingsTab } from "@/components/settings-tab"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/useAuth"
import useSetting from "@/hooks/useSetting"
import { asOptionalField } from "@/lib/utils"
import { nezhaLang, settingCoverageTypes } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

const settingFormSchema = z.object({
    dns_servers: asOptionalField(z.string()),
    ignored_ip_notification: asOptionalField(z.string()),
    ip_change_notification_group_id: z.coerce.number().int().min(0),
    cover: z.coerce.number().int().min(1),
    site_name: z.string().min(1),
    language: z.string().min(2),
    user_template: z.string().min(1),
    install_host: asOptionalField(z.string()),
    custom_code: asOptionalField(z.string()),
    custom_code_dashboard: asOptionalField(z.string()),
    real_ip_header: asOptionalField(z.string()),

    tls: asOptionalField(z.boolean()),
    enable_ip_change_notification: asOptionalField(z.boolean()),
    enable_plain_ip_in_notification: asOptionalField(z.boolean()),
})

export default function SettingsPage() {
    const { t, i18n } = useTranslation()
    const { data: config, mutate } = useSetting()
    const { profile } = useAuth()
    const navigate = useNavigate()

    const isAdmin = profile?.role === 0

    if (!isAdmin) {
        navigate("/dashboard/settings/online-user")
    }

    const form = useForm<z.infer<typeof settingFormSchema>>({
        resolver: zodResolver(settingFormSchema),
        defaultValues: config
            ? {
                  ...config.config,
                  user_template:
                      config.config?.user_template ||
                      Object.keys(config.frontend_templates?.filter((t) => !t.is_admin) || {})[0] ||
                      "user-dist",
              }
            : {
                  ip_change_notification_group_id: 0,
                  cover: 1,
                  site_name: "",
                  language: "",
                  user_template: "user-dist",
              },
        resetOptions: {
            keepDefaultValues: false,
        },
    })

    useEffect(() => {
        if (config?.config) {
            form.reset(config?.config)
        }
    }, [config?.config, form])

    const onSubmit = async (values: z.infer<typeof settingFormSchema>) => {
        try {
            await updateSettings(values)
            form.reset()
            await mutate()
        } catch (e) {
            toast(t("Error"), {
                description: t("Results.ErrorFetchingResource", {
                    error: e?.toString(),
                }),
            })
            return
        } finally {
            if (values.language != i18n.language) {
                i18n.changeLanguage(values.language)
            }
            toast(t("Success"))
        }
    }

    return (
        <div className="px-3">
            <SettingsTab className="mt-6 mb-4 w-full" />
            <div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 my-2">
                        <FormField
                            control={form.control}
                            name="site_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("SiteName")}</FormLabel>
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
                                    <FormLabel>{t("Language")}</FormLabel>
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
                            name="user_template"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("Theme")}</FormLabel>
                                    <FormControl>
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => {
                                                const template = config?.frontend_templates?.find(
                                                    (t) => t.path === value,
                                                )
                                                if (template) {
                                                    form.setValue("user_template", template!.path!)
                                                }
                                            }}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="py-8">
                                                    <SelectValue placeholder={t("SelectTheme")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {(
                                                    config?.frontend_templates?.filter(
                                                        (t) => !t.is_admin,
                                                    ) || []
                                                ).map((template) => (
                                                    <div key={template.path}>
                                                        <SelectItem value={template.path!}>
                                                            <div className="flex flex-col items-start gap-1">
                                                                <div className="font-medium">
                                                                    {template.name}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <span>
                                                                        {t("Author")}:{" "}
                                                                        {template.author}
                                                                    </span>
                                                                    {!template.is_official ? (
                                                                        <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 text-xs">
                                                                            {t("Community")}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs">
                                                                            {t("Official")}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                        <div className="px-8 py-1">
                                                            <a
                                                                href={template.repository}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                {template.repository}
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                    {!config?.frontend_templates?.find(
                                        (t) => t.path === field.value,
                                    )?.is_official && (
                                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md p-2">
                                            <div className="font-medium text-lg mb-1">
                                                {t("CommunityThemeWarning")}
                                            </div>
                                            <div className="text-yellow-700 dark:text-yellow-200">
                                                {t("CommunityThemeDescription")}
                                            </div>
                                        </div>
                                    )}
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="custom_code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("CustomCodes")}</FormLabel>
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
                                    <FormLabel>{t("CustomCodesDashboard")}</FormLabel>
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
                                    <FormLabel>{t("DashboardOriginalHost")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tls"
                            render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <Label className="text-sm">{t("ConfigTLS")}</Label>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dns_servers"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t("CustomPublicDNSNameserversforDDNS") +
                                            " " +
                                            t("SeparateWithComma")}
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
                                    <FormLabel>{t("RealIPHeader")}</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center">
                                            <Input
                                                disabled={field.value == "NZ::Use-Peer-IP"}
                                                className="w-1/2"
                                                placeholder="CF-Connecting-IP"
                                                {...field}
                                            />
                                            <Checkbox
                                                checked={field.value == "NZ::Use-Peer-IP"}
                                                className="ml-2"
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        field.disabled = true
                                                        form.setValue(
                                                            "real_ip_header",
                                                            "NZ::Use-Peer-IP",
                                                        )
                                                    } else {
                                                        field.disabled = false
                                                        form.setValue("real_ip_header", "")
                                                    }
                                                }}
                                            />
                                            <FormLabel className="font-normal ml-2">
                                                {t("UseDirectConnectingIP")}
                                            </FormLabel>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormItem>
                            <FormLabel>{t("IPChangeNotification")}</FormLabel>
                            <Card className="w-full">
                                <CardContent>
                                    <div className="flex flex-col space-y-4 mt-4">
                                        <FormField
                                            control={form.control}
                                            name="cover"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("Coverage")}</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={`${field.value}`}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.entries(
                                                                settingCoverageTypes,
                                                            ).map(([k, v]) => (
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
                                                    <FormLabel>
                                                        {t("SpecificServers") +
                                                            " " +
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
                                            name="ip_change_notification_group_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("NotifierGroupID")}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="0"
                                                            type="number"
                                                            {...field}
                                                        />
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
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                            <Label className="text-sm">
                                                                {t("Enable")}
                                                            </Label>
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
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <Label className="text-sm">
                                                {t("FullIPNotification")}
                                            </Label>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{t("Confirm")}</Button>
                    </form>
                </Form>
            </div>
        </div>
    )
}
