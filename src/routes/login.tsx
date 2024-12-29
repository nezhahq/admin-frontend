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
import { Input } from "@/components/ui/input"
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
        const oauth2Code = new URLSearchParams(window.location.search).get("code")
        const oauth2State = new URLSearchParams(window.location.search).get("state")
        const oauth2Provider = new URLSearchParams(window.location.search).get("provider")
        if (oauth2Code && oauth2State && oauth2Provider) {
            loginOauth2(oauth2Provider, oauth2State, oauth2Code)
        }
    }, [window.location.search])

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

    return (
        <div className="mt-28 sm:max-w-sm m-auto max-w-fit">
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
                    <Button type="submit">{t("Login")}</Button>
                </form>
            </Form>
            <div className="mt-4">
                {settingData?.config?.oauth2_providers?.map((p: string) => (
                    <Button onClick={() => loginWith(p)}>{p}</Button>
                ))}
            </div>
        </div>
    )
}

export default Login
