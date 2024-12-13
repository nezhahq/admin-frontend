import { swrFetcher } from "@/api/api"
import { deleteService } from "@/api/service"
import { ActionButtonGroup } from "@/components/action-button-group"
import { HeaderButtonGroup } from "@/components/header-button-group"
import { ServiceCard } from "@/components/service"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ModelService as Service } from "@/types"
import { serviceTypes } from "@/types"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import useSWR from "swr"

export default function ServicePage() {
    const { t } = useTranslation()
    const { data, mutate, error, isLoading } = useSWR<Service[]>("/api/v1/service/list", swrFetcher)

    useEffect(() => {
        if (error)
            toast(t("Error"), {
                description: t("Results.ErrorFetchingResource", {
                    error: error.message,
                }),
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error])

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
            accessorKey: "id",
            accessorFn: (row) => row.id,
        },
        {
            header: t("Name"),
            accessorFn: (row) => row.name,
            accessorKey: "name",
            cell: ({ row }) => {
                const s = row.original
                return <div className="max-w-24 whitespace-normal break-words">{s.name}</div>
            },
        },
        {
            header: t("Target"),
            accessorFn: (row) => row.target,
            accessorKey: "target",
            cell: ({ row }) => {
                const s = row.original
                return <div className="max-w-24 whitespace-normal break-words">{s.target}</div>
            },
        },
        {
            header: t("Coverage"),
            accessorKey: "cover",
            accessorFn: (row) => row.cover,
            cell: ({ row }) => {
                const s = row.original
                return (
                    <div className="max-w-48 whitespace-normal break-words">
                        {(() => {
                            switch (s.cover) {
                                case 0: {
                                    return <span>{t("CoverAll")}</span>
                                }
                                case 1: {
                                    return <span>{t("IgnoreAll")}</span>
                                }
                            }
                        })()}
                    </div>
                )
            },
        },
        {
            header: t("SpecificServers"),
            cell: ({ row }) => {
                const s = row.original
                return (
                    <div className="max-w-32 whitespace-normal break-words">
                        {Object.keys(s.skip_servers ?? {}).join(",")}
                    </div>
                )
            },
        },
        {
            header: t("Type"),
            accessorKey: "type",
            accessorFn: (row) => row.type,
            cell: ({ row }) => serviceTypes[row.original.type] || "",
        },
        {
            header: t("Interval"),
            accessorKey: "duration",
            accessorFn: (row) => row.duration,
        },
        {
            header: t("NotifierGroupID"),
            accessorKey: "ngroup",
            accessorFn: (row) => row.notification_group_id,
        },
        {
            header: t("Trigger"),
            accessorKey: "triggerTask",
            accessorFn: (row) => row.enable_trigger_task ?? false,
        },
        {
            header: t("TasksToTriggerOnAlert"),
            accessorKey: "failTriggerTasks",
            accessorFn: (row) => row.fail_trigger_tasks,
        },
        {
            header: t("TasksToTriggerAfterRecovery"),
            accessorKey: "recoverTriggerTasks",
            accessorFn: (row) => row.recover_trigger_tasks,
        },
        {
            id: "actions",
            header: t("Actions"),
            cell: ({ row }) => {
                const s = row.original
                return (
                    <ActionButtonGroup
                        className="flex gap-2"
                        delete={{ fn: deleteService, id: s.id, mutate: mutate }}
                    >
                        <ServiceCard mutate={mutate} data={s} />
                    </ActionButtonGroup>
                )
            },
        },
    ]

    const dataCache = useMemo(() => {
        return data ?? []
    }, [data])

    const table = useReactTable({
        data: dataCache,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const selectedRows = table.getSelectedRowModel().rows

    return (
        <div className="px-3">
            <div className="flex mt-6 mb-4">
                <h1 className="flex-1 text-3xl font-bold tracking-tight">{t("Services")}</h1>
                <HeaderButtonGroup
                    className="flex-2 flex ml-auto gap-2"
                    delete={{
                        fn: deleteService,
                        id: selectedRows.map((r) => r.original.id),
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
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                )
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
    )
}
