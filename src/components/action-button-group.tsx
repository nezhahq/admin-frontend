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
import { buttonVariants } from "@/components/ui/button"

import { useTranslation } from "react-i18next";

interface ButtonGroupProps<E, U> {
    className?: string;
    children: React.ReactNode;
    delete: { fn: (id: E[]) => Promise<void>, id: E, mutate: KeyedMutator<U> };
}

export function ActionButtonGroup<E, U>({ className, children, delete: { fn, id, mutate } }: ButtonGroupProps<E, U>) {
    const { t } = useTranslation();
    const handleDelete = async () => {
        await fn([id]);
        await mutate();
    }

    return (
        <div className={className}>
            {children}
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
        </div>
    )
}
