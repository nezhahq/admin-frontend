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
import { selectableTableFeatures } from "@/lib/table"
import { ModelService as Service } from "@/types"
import { serviceTypes } from "@/types"
import { ColumnDef, flexRender, useTable } from "@tanstack/react-table"
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

    // 列定义必须保持引用稳定：每次渲染都新建的话，单元格渲染函数在 React 眼里是
    // 新组件，整行会被卸载重挂，列表一刷新就把正在填写的编辑弹窗关掉、输入清空。
    const columns: ColumnDef<typeof selectableTableFeatures, Service>[] = useMemo(
        () => [
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
                enableHiding: false,
            },
            {
                header: "ID",
                accessorKey: "id",
                accessorFn: (row) => `${row.id}(${row.display_index ?? 0})`,
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
        ],
        [mutate, t],
    )

    const dataCache = useMemo(() => {
        return data ?? []
    }, [data])

    const table = useTable({
        features: selectableTableFeatures,
        data: dataCache,
        columns,
        // 行标识必须取业务主键：默认按数组下标，删除或翻页后勾选状态会落到
        // 顶上来的另一条记录上，再次批量操作就会误删、误封。
        getRowId: (row) => String(row.id),
    })

    const selectedRows = table.getSelectedRowModel().rows

    return (
        <div className="px-3 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3 mt-6 mb-4">
                <h1 className="text-3xl font-bold tracking-tight">{t("Service")}</h1>
                <HeaderButtonGroup
                    className="flex gap-2 flex-wrap shrink-0"
                    delete={{
                        fn: deleteService,
                        id: selectedRows.map((r) => r.original.id),
                        mutate: mutate,
                        clearSelection: () => table.resetRowSelection(),
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
