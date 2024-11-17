import { Plus, Edit2, Trash2 } from "lucide-react"
import { Button, ButtonProps } from "@/components/ui/button"
import { forwardRef } from "react";

export const EditButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    return (
        <Button {...props} ref={ref} size="icon">
            <Edit2 />
        </Button>
    );
});

export const TrashButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    return (
        <Button {...props} ref={ref} size="icon">
            <Trash2 />
        </Button>
    );
});

export const PlusButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    return (
        <Button {...props} ref={ref} size="icon">
            <Plus />
        </Button>
    );
});
