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
import { ModelServerGroupResponseItem } from "@/types"
import { useState } from "react"
import { KeyedMutator } from "swr"
import { IconButton } from "@/components/xui/icon-button"
import { createServerGroup, updateServerGroup } from "@/api/server-group"
import { MultiSelect } from "@/components/xui/multi-select"
import { useServer } from "@/hooks/useServer"

import { useTranslation } from "react-i18next";

interface ServerGroupCardProps {
    data?: ModelServerGroupResponseItem;
    mutate: KeyedMutator<ModelServerGroupResponseItem[]>;
}

const serverGroupFormSchema = z.object({
    name: z.string().min(1),
    servers: z.array(z.number()),
});

export const ServerGroupCard: React.FC<ServerGroupCardProps> = ({ data, mutate }) => {
    const { t } = useTranslation();
    const form = useForm<z.infer<typeof serverGroupFormSchema>>({
        resolver: zodResolver(serverGroupFormSchema),
        defaultValues: data ? {
            name: data.group.name,
            servers: data.servers,
        } : {
            name: "",
            servers: [],
        },
        resetOptions: {
            keepDefaultValues: false,
        }
    })

    const [open, setOpen] = useState(false);

    const onSubmit = async (values: z.infer<typeof serverGroupFormSchema>) => {
        data?.group.id ? await updateServerGroup(data.group.id, values) : await createServerGroup(values);
        setOpen(false);
        await mutate();
        form.reset();
    }

    const { servers } = useServer();
    const serverList = servers?.map(s => ({
        value: `${s.id}`,
        label: s.name,
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
                            <DialogTitle>{data? t("EditServerGroup"):t("CreateServerGroup")}</DialogTitle>
                            <DialogDescription />
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 my-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("Name")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Group Name"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="servers"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("Server")}</FormLabel>
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
