import { updateSettings } from "@/api/settings"
import { testLLMConnection } from "@/api/llm"
import { SettingsTab } from "@/components/settings-tab"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import {
    Form,
    FormControl,
    FormDescription,
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
import { useNotification } from "@/hooks/useNotfication"
import useSetting from "@/hooks/useSetting"
import { asOptionalField, safeExternalHref } from "@/lib/utils"
import { nezhaLang, settingCoverageTypes } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate } from "react-router-dom"
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
    dashboard_host: asOptionalField(z.string()),
    reserved_hosts: asOptionalField(z.string()),
    custom_code: asOptionalField(z.string()),
    custom_code_dashboard: asOptionalField(z.string()),
    web_real_ip_header: asOptionalField(z.string()),
    agent_real_ip_header: asOptionalField(z.string()),

    tls: asOptionalField(z.boolean()),
    enable_ip_change_notification: asOptionalField(z.boolean()),
    enable_plain_ip_in_notification: asOptionalField(z.boolean()),
    enable_mcp: asOptionalField(z.boolean()),

    enable_llm: asOptionalField(z.boolean()),
    llm_base_url: asOptionalField(z.string()),
    llm_model: asOptionalField(z.string()),
    llm_api_key: asOptionalField(z.string()),
    llm_system_prompt: asOptionalField(z.string()),
    llm_max_tokens: asOptionalField(
        z.coerce.number().int().min(1).max(200000),
    ),
    llm_temperature: asOptionalField(
        z.coerce.number().min(0).max(2),
    ),
})

export default function SettingsPage() {
    const { t, i18n } = useTranslation()
    const { data: config, mutate } = useSetting()
    const { profile, loading: authLoading } = useAuth()

    const { notifierGroup } = useNotification()
    const ngroupList = notifierGroup?.map((ng) => ({
        value: `${ng.group.id}`,
        label: ng.group.name,
    })) || [{ value: "", label: "" }]

    const isAdmin = profile?.role === 0

    // LLM 连接测试按钮的 loading 态。
    const [llmTesting, setLlmTesting] = useState(false)

    // 所有 hooks 必须在条件 return 之前调用，否则违反 rules-of-hooks。
    const form = useForm({
        resolver: zodResolver(settingFormSchema) as any,
        defaultValues: config
            ? {
                ...config.config,
                // LLMAPIKey 明文从不回显，输入框始终为空；是否存在由
                // llm_api_key_set 决定。
                llm_api_key: "",
                llm_max_tokens:
                    config.config?.llm_max_tokens && config.config.llm_max_tokens > 0
                        ? config.config.llm_max_tokens
                        : 2048,
                llm_temperature:
                    typeof config.config?.llm_temperature === "number"
                        ? config.config.llm_temperature
                        : 0.7,
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
                enable_llm: false,
                llm_max_tokens: 2048,
                llm_temperature: 0.7,
                llm_api_key: "",
            },
        resetOptions: {
            keepDefaultValues: false,
        },
    })

    useEffect(() => {
        if (config?.config) {
            // LLM API key 服务端永远不回显明文（仅 llm_api_key_set 标志）。
            // 如果用从服务端拿到的 config.config 直接 reset，会把用户刚输入的
            // api_key 又冲成 ""，造成"明明保存了却看不见"的错觉。
            // 这里保留当前表单里的值；只有初次加载（表单为空）时才用默认 ""。
            const currentKey = form.getValues("llm_api_key") as string | undefined
            const currentSet = config?.config?.llm_api_key_set ?? false
            form.reset({
                ...config.config,
                llm_api_key: currentKey ?? "",
                llm_max_tokens:
                    (config.config.llm_max_tokens && config.config.llm_max_tokens > 0)
                        ? config.config.llm_max_tokens
                        : 2048,
                llm_temperature:
                    typeof config.config.llm_temperature === "number"
                        ? config.config.llm_temperature
                        : 0.7,
                _llmApiKeySetSeen: currentSet,
            } as any)
        }
    }, [config?.config, form])

    if (authLoading) {
        return null
    }
    if (!isAdmin) {
        return <Navigate to="/dashboard/settings/api-tokens" replace />
    }

    const onSubmit = async (values: any) => {
        try {
            // LLM API key：空字符串 = "不修改"。如果客户端把 "" 原样提交，
            // 服务端的 PatchYAMLField 会清掉已存的 key。前端先剔除。
            // 用户想清空请编辑 data/config.yaml（API key 不支持 UI 清空以避免误删）。
            const payload = { ...values }
            if (typeof payload.llm_api_key === "string" && payload.llm_api_key === "") {
                delete payload.llm_api_key
            }
            await updateSettings(payload)
            form.reset()
            await mutate()
        } catch (e) {
            toast(t("Error"), {
                description: t("Results.ErrorFetchingResource", {
                    error: e?.toString(),
                }),
            })
            return
        }
        if (values.language != i18n.language) {
            i18n.changeLanguage(values.language)
        }
        toast(t("Success"))
    }

    const onTestLLM = async () => {
        setLlmTesting(true)
        try {
            const result = await testLLMConnection()
            toast(t("LLMTestSuccess"), {
                description: result.reply
                    ? `${result.reply.slice(0, 80)} · ${result.latency_ms}ms · ${result.model ?? ""}`
                    : `${result.latency_ms}ms · ${result.model ?? ""}`,
            })
        } catch (e: any) {
            toast(t("LLMTestFailed"), {
                description: e?.toString?.() ?? String(e),
            })
        } finally {
            setLlmTesting(false)
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
                                                            {safeExternalHref(template.repository) ? (
                                                                <a
                                                                    href={safeExternalHref(template.repository)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                                >
                                                                    {template.repository}
                                                                </a>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">
                                                                    {template.repository}
                                                                </span>
                                                            )}
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
                            name="dashboard_host"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("DashboardHost")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>{t("DashboardHostHint")}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="reserved_hosts"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("ReservedHosts")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>{t("ReservedHostsHint")}</FormDescription>
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
                            name="web_real_ip_header"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("WebRealIPHeader")}</FormLabel>
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
                                                    form.setValue(
                                                        "web_real_ip_header",
                                                        checked ? "NZ::Use-Peer-IP" : "",
                                                    )
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
                        <FormField
                            control={form.control}
                            name="agent_real_ip_header"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("AgentRealIPHeader")}</FormLabel>
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
                                                    form.setValue(
                                                        "agent_real_ip_header",
                                                        checked ? "NZ::Use-Peer-IP" : "",
                                                    )
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
                                                    <FormLabel>{t("NotifierGroup")}</FormLabel>
                                                    <FormControl>
                                                        <Combobox
                                                            placeholder={t("Search")}
                                                            options={ngroupList}
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value?.toString()}
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
                        <FormField
                            control={form.control}
                            name="enable_mcp"
                            render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <Label className="text-sm">
                                                {t("EnableMCP")}
                                            </Label>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* LLM Chat 设置区块：参考 IPChangeNotification 卡片分组。 */}
                        <FormItem>
                            <FormLabel>{t("LLMTitle")}</FormLabel>
                            <Card className="w-full">
                                <CardContent>
                                    <div className="flex flex-col space-y-4 mt-4">
                                        <FormField
                                            control={form.control}
                                            name="enable_llm"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2">
                                                    <FormControl>
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                            <Label className="text-sm">
                                                                {t("EnableLLM")}
                                                            </Label>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="llm_base_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("LLMBaseURL")}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="https://api.openai.com/v1"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        {t("LLMBaseURLHint")}
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="llm_model"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("LLMModel")}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="gpt-4o-mini / deepseek-chat / ..."
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="llm_api_key"
                                            render={({ field }) => {
                                                const apiKeyConfigured =
                                                    config?.config?.llm_api_key_set ?? false
                                                return (
                                                    <FormItem>
                                                        <FormLabel>{t("LLMApiKey")}</FormLabel>
                                                        <FormControl>
                                                            <ApiKeyInput
                                                                value={field.value ?? ""}
                                                                onChange={field.onChange}
                                                                configured={apiKeyConfigured}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            {apiKeyConfigured
                                                                ? t("LLMApiKeyHintConfigured")
                                                                : t("LLMApiKeyHint")}
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )
                                            }}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="llm_system_prompt"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("LLMSystemPrompt")}</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            className="resize-y min-h-20"
                                                            placeholder="You are a Nezha assistant."
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="llm_max_tokens"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("LLMMaxTokens")}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={200000}
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="llm_temperature"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("LLMTemperature")}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step={0.1}
                                                                min={0}
                                                                max={2}
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={onTestLLM}
                                                disabled={llmTesting}
                                            >
                                                {llmTesting && (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                )}
                                                {t("LLMTestButton")}
                                            </Button>
                                            <span className="text-xs text-muted-foreground">
                                                {config?.config?.llm_api_key_set
                                                    ? t("LLMApiKeySet")
                                                    : t("LLMApiKeyNotSet")}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </FormItem>
                        <Button type="submit">{t("Confirm")}</Button>
                    </form>
                </Form>
            </div>
        </div>
    )
}

// ApiKeyInput 是带显示切换的密码输入；输入框始终为 password 类型避免
// 浏览器自动填充 / 历史泄露；点眼睛按钮临时切换为 text。
function ApiKeyInput({
    value,
    onChange,
    configured,
}: {
    value: string
    onChange: (v: string) => void
    configured: boolean
}) {
    const [show, setShow] = useState(false)
    // placeholder 暗示当前是否已配置；提示文案由父组件的 FormDescription 承担。
    const placeholder = configured
        ? "••••••••（已配置，留空表示不修改）"
        : "未配置"
    return (
        <div className="flex items-center gap-2">
            <Input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                className="flex-1"
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "hide" : "show"}
                title={show ? "hide" : "show"}
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
        </div>
    )
}
