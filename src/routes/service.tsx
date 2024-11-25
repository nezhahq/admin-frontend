import { swrFetcher } from "@/api/api";
import { Checkbox } from "@/components/ui/checkbox";
import { ServiceCard } from "@/components/service";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ModelServiceResponse, ModelServiceResponseItem as Service } from "@/types";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useSWR from "swr";
import { conv } from "@/lib/utils";
import { useEffect, useMemo } from "react";
import { serviceTypes } from "@/types";
import { ActionButtonGroup } from "@/components/action-button-group";
import { deleteService } from "@/api/service";
import { HeaderButtonGroup } from "@/components/header-button-group";
import { toast } from "sonner";

export default function ServicePage() {
    const { data, mutate, error, isLoading } = useSWR<ModelServiceResponse>(
        "/api/v1/service",
        swrFetcher
    );

    useEffect(() => {
        if (error)
            toast("Error", {
                description: `Error fetching resource: ${error.message}.`,
            });
    }, [error]);

    const columns: ColumnDef<Service>[] = [
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
            accessorKey: "service.id",
            accessorFn: (row) => row.service.id,
        },
        {
            header: "Name",
            accessorFn: (row) => row.service.name,
            accessorKey: "service.name",
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{s.service.name}</div>;
            },
        },
        {
            header: "Target",
            accessorFn: (row) => row.service.target,
            accessorKey: "service.target",
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{s.service.target}</div>;
            },
        },
        {
            header: "Coverage",
            accessorKey: "service.cover",
            accessorFn: (row) => row.service.cover,
            cell: ({ row }) => {
                const s = row.original.service;
                return (
                    <div className="max-w-48 whitespace-normal break-words">
                        {(() => {
                            switch (s.cover) {
                            case 0: {
                                return <span>Cover All</span>;
                            }
                            case 1: {
                                return <span>Ignore All</span>;
                            }
                            }
                        })()}
                    </div>
                );
            },
        },
        {
            header: "Specific Servers",
            accessorKey: "service.skipServers",
            accessorFn: (row) => Object.keys(row.service.skip_servers ?? {}),
        },
        {
            header: "Type",
            accessorKey: "service.type",
            accessorFn: (row) => row.service.type,
            cell: ({ row }) => serviceTypes[row.original.service.type] || "",
        },
        {
            header: "Interval",
            accessorKey: "service.duration",
            accessorFn: (row) => row.service.duration,
        },
        {
            header: "Notifier Group ID",
            accessorKey: "service.ngroup",
            accessorFn: (row) => row.service.notification_group_id,
        },
        {
            header: "On Trigger",
            accessorKey: "service.triggerTask",
            accessorFn: (row) => row.service.enable_trigger_task ?? false,
        },
        {
            header: "Tasks to trigger on alert",
            accessorKey: "service.failTriggerTasks",
            accessorFn: (row) => row.service.fail_trigger_tasks,
        },
        {
            header: "Tasks to trigger after recovery",
            accessorKey: "service.recoverTriggerTasks",
            accessorFn: (row) => row.service.recover_trigger_tasks,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const s = row.original;
                return (
                    <ActionButtonGroup
                        className="flex gap-2"
                        delete={{ fn: deleteService, id: s.service.id, mutate: mutate }}
                    >
                        <ServiceCard mutate={mutate} data={s.service} />
                    </ActionButtonGroup>
                );
            },
        },
    ];

    const dataArr = useMemo(() => {
        return conv.recordToArr(data?.services ?? {});
    }, [data?.services]);

    const table = useReactTable({
        data: dataArr,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const selectedRows = table.getSelectedRowModel().rows;

    return (
        <div className="px-8">
            <div className="flex mt-6 mb-4">
                <h1 className="flex-1 text-3xl font-bold tracking-tight">Service</h1>
                <HeaderButtonGroup
                    className="flex-2 flex ml-auto gap-2"
                    delete={{
                        fn: deleteService,
                        id: selectedRows.map((r) => r.original.service.id),
                        mutate: mutate,
                    }}
                >
                    <ServiceCard mutate={mutate} />
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
