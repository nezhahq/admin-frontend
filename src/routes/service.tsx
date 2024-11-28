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

import { useTranslation } from "react-i18next";

export default function ServicePage() {
    const { t } = useTranslation();
    const { data, mutate, error, isLoading } = useSWR<ModelServiceResponse>(
        "/api/v1/service",
        swrFetcher
    );

    useEffect(() => {
        if (error)
            toast(t("Error"), {
                description: t("Results.ErrorFetchingResource", { error: error.message }),
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            header: t("Name"),
            accessorFn: (row) => row.service.name,
            accessorKey: "service.name",
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{s.service.name}</div>;
            },
        },
        {
            header: t("Target"),
            accessorFn: (row) => row.service.target,
            accessorKey: "service.target",
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{s.service.target}</div>;
            },
        },
        {
            header: t("Coverage"),
            accessorKey: "service.cover",
            accessorFn: (row) => row.service.cover,
            cell: ({ row }) => {
                const s = row.original.service;
                return (
                    <div className="max-w-48 whitespace-normal break-words">
                        {(() => {
                            switch (s.cover) {
                            case 0: {
                                return <span>{t("CoverAll")}</span>;
                            }
                            case 1: {
                                return <span>{t("IgnoreAll")}</span>;
                            }
                            }
                        })()}
                    </div>
                );
            },
        },
        {
            header: t("SpecificServers"),
            accessorKey: "service.skipServers",
            accessorFn: (row) => Object.keys(row.service.skip_servers ?? {}),
        },
        {
            header: t("Type"),
            accessorKey: "service.type",
            accessorFn: (row) => row.service.type,
            cell: ({ row }) => serviceTypes[row.original.service.type] || "",
        },
        {
            header: t("Interval"),
            accessorKey: "service.duration",
            accessorFn: (row) => row.service.duration,
        },
        {
            header: t("NotifierGroupID"),
            accessorKey: "service.ngroup",
            accessorFn: (row) => row.service.notification_group_id,
        },
        {
            header: t("Trigger"),
            accessorKey: "service.triggerTask",
            accessorFn: (row) => row.service.enable_trigger_task ?? false,
        },
        {
            header: t("TasksToTriggerOnAlert"),
            accessorKey: "service.failTriggerTasks",
            accessorFn: (row) => row.service.fail_trigger_tasks,
        },
        {
            header: t("TasksToTriggerAfterRecovery"),
            accessorKey: "service.recoverTriggerTasks",
            accessorFn: (row) => row.service.recover_trigger_tasks,
        },
        {
            id: "actions",
            header: t("Actions"),
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
                <h1 className="flex-1 text-3xl font-bold tracking-tight">{t("Services")}</h1>
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
                                {t("Loading")}...
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
                                {t("NoResults")}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
