import { Button } from "@/components/ui/button";
import { TrashButton } from "@/components/xui/icon-buttons";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { KeyedMutator } from "swr";
import { toast } from "sonner"

interface ButtonGroupProps<T> {
    className?: string;
    children: React.ReactNode;
    delete: { fn: (id: number[]) => Promise<void>, id: number[], mutate: KeyedMutator<T> };
}

export function HeaderButtonGroup<T>({ className, children, delete: { fn, id, mutate } }: ButtonGroupProps<T>) {
    const handleDelete = async () => {
        await fn(id);
        await mutate();
    }

    return (
        <div className={className}>
            {id.length < 1 ? (
                <>
                    <TrashButton variant="destructive" onClick={() => {
                        toast("Error", {
                            description: "No rows are selected."
                        });
                    }} />
                    {children}
                </>
            ) : (
                <>
                    <Dialog>
                        <DialogTrigger asChild>
                            <TrashButton variant="destructive" />
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Confirm Deletion?</DialogTitle>
                                <DialogDescription>
                                    This operation is unrecoverable!
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="submit" variant="destructive" onClick={handleDelete}>Confirm</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    {children}
                </>
            )}
        </div>
    )
}
