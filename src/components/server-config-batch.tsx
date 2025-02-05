import { setServerConfig } from "@/api/server"
import { Button, ButtonProps } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { IconButton } from "@/components/xui/icon-button"
import { ModelServerTaskResponse } from "@/types"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Pusher } from "./xui/pusher"

interface ServerConfigCardBatchProps extends ButtonProps {
    sid: number[]
}

export const ServerConfigCardBatch: React.FC<ServerConfigCardBatchProps> = ({ sid, ...props }) => {
    const { t } = useTranslation()
    const [data, setData] = useState<Record<string, any>>({})
    const [open, setOpen] = useState(false)
    const [currentKey, setCurrentKey] = useState<string>("")
    const [currentVal, setCurrentVal] = useState<string>("")

    const onSubmit = async () => {
        let resp: ModelServerTaskResponse = {}
        try {
            resp = await setServerConfig({ config: JSON.stringify(data), servers: sid })
        } catch (e) {
            console.error(e)
            toast(t("Error"), {
                description: t("Results.UnExpectedError"),
            })
            return
        }
        toast(t("Done"), {
            description:
                t("Results.ForceUpdate") +
                (resp.success?.length ? t(`Success`) + ` [${resp.success.join(",")}]` : "") +
                (resp.failure?.length ? t(`Failure`) + ` [${resp.failure.join(",")}]` : "") +
                (resp.offline?.length ? t(`Offline`) + ` [${resp.offline.join(",")}]` : ""),
        })
        setOpen(false)
    }

    return sid.length < 1 ? (
        <IconButton
            {...props}
            icon="cog"
            onClick={() => {
                toast(t("Error"), {
                    description: t("Results.NoRowsAreSelected"),
                })
            }}
        />
    ) : (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <IconButton {...props} icon="cog" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <ScrollArea className="max-h-[calc(100dvh-5rem)] p-3">
                    <div className="items-center mx-1">
                        <DialogHeader>
                            <DialogTitle>{t("EditServerConfig")}</DialogTitle>
                            <DialogDescription />
                        </DialogHeader>
                        <div className="flex flex-col gap-3 mt-4">
                            <Label>{t("Option")}</Label>
                            <Input
                                type="text"
                                placeholder="option"
                                value={currentKey}
                                onChange={(e) => {
                                    setCurrentKey(e.target.value)
                                }}
                            />
                            <Label>{t("Value")}</Label>
                            <Textarea
                                className="resize-y"
                                value={currentVal}
                                onChange={(e) => {
                                    setCurrentVal(e.target.value)
                                }}
                            />
                            <Pusher property={[currentKey, currentVal]} setData={setData} />
                            <DialogFooter className="justify-end">
                                <DialogClose asChild>
                                    <Button type="button" className="my-2" variant="secondary">
                                        {t("Close")}
                                    </Button>
                                </DialogClose>
                                <Button type="submit" className="my-2" onClick={onSubmit}>
                                    {t("Submit")}
                                </Button>
                            </DialogFooter>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
