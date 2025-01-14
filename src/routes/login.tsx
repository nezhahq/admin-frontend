import { Oauth2RequestType, getOauth2RedirectURL } from "@/api/oauth2"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { GitHubIcon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/useAuth"
import useSetting from "@/hooks/useSetting"
import { zodResolver } from "@hookform/resolvers/zod"
import i18next from "i18next"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"

const formSchema = z.object({
    username: z.string().min(2, {
        message: i18next.t("Results.UsernameMin", { number: 2 }),
    }),
    password: z.string().min(1, {
        message: i18next.t("Results.PasswordRequired"),
    }),
})

function Login() {
    const { login, loginOauth2 } = useAuth()
    const { data: settingData } = useSetting()

    useEffect(() => {
        const oauth2 = new URLSearchParams(window.location.search).get("oauth2")
        if (oauth2) {
            loginOauth2()
        }
    }, [window.location.search])

    useEffect(() => {
        if (settingData?.config?.oauth2_providers?.includes("Telegram")) {
            const initTelegramLogin = async () => {
                try {
                    const redirectUrl = await getOauth2RedirectURL("Telegram", Oauth2RequestType.LOGIN)
                    const [botName, authUrl] = redirectUrl.redirect!.split("---")
                    const container = document.getElementById("telegram-login-container")
                    if (container) {
                        container.innerHTML = ''
                        const widget = loadTelegramWidget(botName, authUrl)
                        container.appendChild(widget)
                    }
                } catch (error: any) {
                    toast.error(error.message)
                }
            }
            
            initTelegramLogin()
        }
    }, [settingData?.config?.oauth2_providers])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        login(values.username, values.password)
    }

    async function loginWith(provider: string) {
        try {
            const redirectUrl = await getOauth2RedirectURL(provider, Oauth2RequestType.LOGIN)
            window.location.href = redirectUrl.redirect!
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const { t } = useTranslation()

    const loadTelegramWidget = (botName: string, authUrl: string) => {
        const script = document.createElement('script')
        script.src = "https://telegram.org/js/telegram-widget.js?22"
        script.async = true
        script.setAttribute("data-telegram-login", botName)
        script.setAttribute("data-size", "large")
        script.setAttribute("data-auth-url", authUrl)
        script.setAttribute("data-request-access", "write")
        return script
    }

    return (
        <div className="mt-28 sm:max-w-sm m-auto max-w-xs">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("Username")}</FormLabel>
                                <FormControl>
                                    <Input placeholder="admin" autoComplete="username" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("Password")}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="admin"
                                        autoComplete="current-password"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="w-full rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                    >
                        {t("Login")}
                    </Button>
                </form>
                {settingData?.config?.oauth2_providers &&
                    settingData?.config?.oauth2_providers.length > 0 && (
                        <section className="flex items-center my-3 w-full">
                            <Separator className="flex-1" />
                            <div className="flex justify-center text-xs text-muted-foreground w-full max-w-[100px]">
                                OAuth2
                            </div>
                            <Separator className="flex-1" />
                        </section>
                    )}
            </Form>
                <div className="mt-3 flex flex-col gap-3">
                    {settingData?.config?.oauth2_providers?.map((p: string) => (
                        p === "Telegram" ? (
                            <div id="telegram-login-container" key={p} className="flex justify-center" />
                        ) : (
                            <Button
                                key={p}
                                className="w-full rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] bg-muted text-primary hover:bg-muted/80 hover:text-primary/80"
                                onClick={() => loginWith(p)}
                            >
                                {p === "GitHub" && <GitHubIcon className="size-4" />}
                                {p}
                            </Button>
                        )
                    ))}
                </div>
        </div>
    )
}

export default Login
