import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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

import { useTranslation } from "react-i18next"
import i18next from "i18next";

const formSchema = z.object({
    username: z.string().min(2, {
        message: i18next.t("Results.UsernameMin", { number: 2 }),
    }),
    password: z.string().min(1, {
        message: i18next.t("Results.PasswordRequired"),
    })
})


function Login() {
    const { login } = useAuth()

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

    const { t } = useTranslation();

    return (
        <div className="my-8 max-w-xl m-auto">
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
                                    <Input type="password" placeholder="admin" autoComplete="current-password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit">{t("Login")}</Button>
                </form>
            </Form>
        </div>
    )
}

export default Login;