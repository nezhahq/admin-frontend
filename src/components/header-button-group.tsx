import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/xui/icon-button";
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
import { KeyedMutator } from "swr";
import { toast } from "sonner"

import { useTranslation } from "react-i18next";

interface ButtonGroupProps<E, U> {
    className?: string;
    children?: React.ReactNode;
    delete: { fn: (id: E[]) => Promise<void>, id: E[], mutate: KeyedMutator<U> };
}

export function HeaderButtonGroup<E, U>({ className, children, delete: { fn, id, mutate } }: ButtonGroupProps<E, U>) {
    const handleDelete = async () => {
        await fn(id);
        await mutate();
    }

    const { t } = useTranslation();

    return (
        <div className={className}>
            {id.length < 1 ? (
                <>
                    <IconButton variant="destructive" icon="trash" onClick={() => {
                        toast(t("Error"), {
                            description: t("Results.NoRowsAreSelected")
                        });
                    }} />
                    {children}
                </>
            ) : (
                <>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <IconButton variant="destructive" icon="trash" />
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
                                <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleDelete}>{t("Confirm")}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {children}
                </>
            )}
        </div>
    )
}
