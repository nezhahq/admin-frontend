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

interface ButtonGroupProps<T> {
    className?: string;
    children: React.ReactNode;
    delete: { fn: (id: number[]) => Promise<void>, id: number, mutate: KeyedMutator<T> };
}

export function ActionButtonGroup<T>({ className, children, delete: { fn, id, mutate } }: ButtonGroupProps<T>) {
    const handleDelete = async () => {
        await fn([id]);
        await mutate();
    }

    return (
        <div className={className}>
            {children}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <IconButton variant="outline" icon="trash" />
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This operation is unrecoverable!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleDelete}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
