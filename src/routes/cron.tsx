import { swrFetcher } from "@/api/api";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ModelCron } from "@/types";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useSWR from "swr";
import { useEffect, useMemo } from "react";
import { ActionButtonGroup } from "@/components/action-button-group";
import { HeaderButtonGroup } from "@/components/header-button-group";
import { toast } from "sonner";
import { deleteCron, runCron } from "@/api/cron";
import { CronCard } from "@/components/cron";
import { cronTypes } from "@/types";
import { IconButton } from "@/components/xui/icon-button";

export default function CronPage() {
    const { data, mutate, error, isLoading } = useSWR<ModelCron[]>("/api/v1/cron", swrFetcher);

    useEffect(() => {
        if (error)
            toast("Error", {
                description: `Error fetching resource: ${error.message}.`,
            });
    }, [error]);

    const columns: ColumnDef<ModelCron>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            header: "ID",
            accessorKey: "id",
            accessorFn: (row) => row.id,
        },
        {
            header: "Name",
            accessorKey: "name",
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-32 whitespace-normal break-words">{s.name}</div>;
            },
        },
        {
            header: "Task Type",
            accessorKey: "taskType",
            accessorFn: (row) => cronTypes[row.task_type] || "",
        },
        {
            header: "Cron Expression",
            accessorKey: "scheduler",
            accessorFn: (row) => row.scheduler,
        },
        {
            header: "Command",
            accessorKey: "command",
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-48 whitespace-normal break-words">{s.command}</div>;
            },
        },
        {
            header: "Notifier Group",
            accessorKey: "ngroup",
            accessorFn: (row) => row.notification_group_id,
        },
        {
            header: "Send Success Notification",
            accessorKey: "pushSuccessful",
            accessorFn: (row) => row.push_successful ?? false,
        },
        {
            header: "Coverage",
            accessorKey: "cover",
            accessorFn: (row) => row.cover,
            cell: ({ row }) => {
                const s = row.original;
                return (
                    <div className="max-w-48 whitespace-normal break-words">
                        {(() => {
                            switch (s.cover) {
                            case 0: {
                                return <span>Ignore All</span>;
                            }
                            case 1: {
                                return <span>Cover All</span>;
                            }
                            case 2: {
                                return <span>On alert</span>;
                            }
                            }
                        })()}
                    </div>
                );
            },
        },
        {
            header: "Specific Servers",
            accessorKey: "servers",
            accessorFn: (row) => row.servers,
        },
        {
            header: "Last Execution",
            accessorKey: "lastExecution",
            accessorFn: (row) => row.last_executed_at,
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{s.last_executed_at}</div>;
            },
        },
        {
            header: "Last Result",
            accessorKey: "lastResult",
            accessorFn: (row) => row.last_result ?? false,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const s = row.original;
                return (
                    <ActionButtonGroup
                        className="flex gap-2"
                        delete={{ fn: deleteCron, id: s.id, mutate: mutate }}
                    >
                        <>
                            <IconButton
                                variant="outline"
                                icon="play"
                                onClick={async () => {
                                    try {
                                        await runCron(s.id);
                                    } catch (e) {
                                        console.error(e);
                                        toast("Error executing task", {
                                            description: "Please see the console for details.",
                                        });
                                        await mutate();
                                        return;
                                    }
                                    toast("Success", {
                                        description: "The task triggered successfully.",
                                    });
                                    await mutate();
                                }}
                            />
                            <CronCard mutate={mutate} data={s} />
                        </>
                    </ActionButtonGroup>
                );
            },
        },
    ];

    const dataCache = useMemo(() => {
        return data ?? [];
    }, [data]);

    const table = useReactTable({
        data: dataCache,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const selectedRows = table.getSelectedRowModel().rows;

    return (
        <div className="px-8">
            <div className="flex mt-6 mb-4">
                <h1 className="flex-1 text-3xl font-bold tracking-tight">Task</h1>
                <HeaderButtonGroup
                    className="flex-2 flex ml-auto gap-2"
                    delete={{
                        fn: deleteCron,
                        id: selectedRows.map((r) => r.original.id),
                        mutate: mutate,
                    }}
                >
                    <CronCard mutate={mutate} />
                </HeaderButtonGroup>
            </div>

            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id} className="text-sm">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                Loading ...
                            </TableCell>
                        </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="text-xsm">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
