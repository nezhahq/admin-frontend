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
import { getProfile, updateProfile } from "@/api/user"
import { useState } from "react"
import { useMainStore } from "@/hooks/useMainStore"
import { toast } from "sonner"

import { useTranslation } from "react-i18next";

const profileFormSchema = z.object({
    original_password: z.string().min(5).max(72),
    new_password: z.string().min(8).max(72),
    new_username: z.string().min(1).max(32),
});

export const ProfileCard = ({ className }: { className: string }) => {
    const { t } = useTranslation();
    const { profile, setProfile } = useMainStore();

    const form = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            original_password: '',
            new_password: '',
            new_username: profile?.username,
        },
        resetOptions: {
            keepDefaultValues: false,
        }
    })

    const [open, setOpen] = useState(false);

    const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
        try {
            await updateProfile(values);
        } catch (e) {
            toast(t("Error"), {
                description: `${e}`,
            })
            return;
        }
        const profile = await getProfile();
        setProfile(profile);
        setOpen(false);
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className={className}>
                    {t("UpdateProfile")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <ScrollArea className="max-h-[calc(100dvh-5rem)] p-3">
                    <div className="items-center mx-1">
                        <DialogHeader>
                            <DialogTitle>{t("UpdateProfile")}</DialogTitle>
                            <DialogDescription />
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 my-2">
                                <FormField
                                    control={form.control}
                                    name="new_username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("NewUsername")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    autoComplete="username"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="original_password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("OriginalPassword")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    autoComplete="current-password"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="new_password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("NewPassword")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter className="justify-end">
                                    <DialogClose asChild>
                                        <Button type="button" className="my-2" variant="secondary">
                                            {t("Close")}
                                        </Button>
                                    </DialogClose>
                                    <Button type="submit" className="my-2">{t("Confirm")}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
