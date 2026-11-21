import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { IconButton } from "@/components/xui/icon-button"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { KeyedMutator } from "swr"

interface ButtonGroupProps<E, U> {
    className?: string
    children?: React.ReactNode
    delete: {
        fn: (id: E[]) => Promise<void>
        id: E[]
        mutate: KeyedMutator<U>
        // 操作成功后清空勾选。行标识是业务主键，勾选状态会跨刷新、跨翻页保留：
        // 不清的话，同一个标识之后再出现（例如被解封的 IP 再次进入列表）就是已勾选的，
        // 下一次批量操作会把它带进去。
        clearSelection?: () => void
    }
}

interface ButtonBlockGroupProps<E, U> {
    className?: string
    children?: React.ReactNode
    block: {
        fn: (id: E[]) => Promise<void>
        id: E[]
        mutate: KeyedMutator<U>
        clearSelection?: () => void
    }
}

export function HeaderButtonGroup<E, U>({
    className,
    children,
    delete: { fn, id, mutate, clearSelection },
}: ButtonGroupProps<E, U>) {
    const { t } = useTranslation()

    const handleDelete = async () => {
        try {
            await fn(id)
            clearSelection?.()
        } catch (error: any) {
            toast(t("Error"), {
                description: error.message,
            })
        }
        await mutate()
    }
    return (
        <div className={className}>
            {id.length < 1 ? (
                <>
                    <IconButton
                        variant="destructive"
                        icon="trash"
                        className="text-white"
                        onClick={() => {
                            toast(t("Error"), {
                                description: t("Results.NoRowsAreSelected"),
                            })
                        }}
                    />
                    {children}
                </>
            ) : (
                <>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <IconButton variant="destructive" icon="trash" className="text-white" />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-lg">
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("ConfirmDeletion")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t("Results.ThisOperationIsUnrecoverable")}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t("Close")}</AlertDialogCancel>
                                <AlertDialogAction
                                    className={buttonVariants({
                                        variant: "destructive",
                                        className: "text-white",
                                    })}
                                    onClick={handleDelete}
                                >
                                    {t("Confirm")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {children}
                </>
            )}
        </div>
    )
}

export function HeaderBlockButtonGroup<E, U>({
    className,
    children,
    block: { fn, id, mutate, clearSelection },
}: ButtonBlockGroupProps<E, U>) {
    const { t } = useTranslation()

    const handleBlock = async () => {
        try {
            await fn(id)
            clearSelection?.()
        } catch (error: any) {
            toast(t("Error"), {
                description: error.message,
            })
        }
        await mutate()
    }
    return (
        <div className={className}>
            {id.length < 1 ? (
                <>
                    <IconButton
                        variant="destructive"
                        icon="ban"
                        className="text-white"
                        onClick={() => {
                            toast(t("Error"), {
                                description: t("Results.NoRowsAreSelected"),
                            })
                        }}
                    />
                    {children}
                </>
            ) : (
                <>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <IconButton variant="destructive" icon="ban" className="text-white" />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-lg">
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("ConfirmBlock")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t("Results.ThisOperationIsUnrecoverable")}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t("Close")}</AlertDialogCancel>
                                <AlertDialogAction
                                    className={buttonVariants({
                                        variant: "destructive",
                                        className: "text-white",
                                    })}
                                    onClick={handleBlock}
                                >
                                    {t("Confirm")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {children}
                </>
            )}
        </div>
    )
}
