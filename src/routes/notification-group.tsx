import { swrFetcher } from "@/api/api"
import { deleteNotificationGroups } from "@/api/notification-group"
import { ActionButtonGroup } from "@/components/action-button-group"
import { GroupTab } from "@/components/group-tab"
import { HeaderButtonGroup } from "@/components/header-button-group"
import { NotificationGroupCard } from "@/components/notification-group"
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
import { ModelNotificationGroupResponseItem } from "@/types"
import { ColumnDef, flexRender, useTable } from "@tanstack/react-table"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import useSWR from "swr"

type NotificationGroupColumn = ColumnDef<
    typeof selectableTableFeatures,
    ModelNotificationGroupResponseItem
>

export default function NotificationGroupPage() {
    const { t } = useTranslation()
    const { data, mutate, error, isLoading } = useSWR<ModelNotificationGroupResponseItem[]>(
        "/api/v1/notification-group",
        swrFetcher,
    )

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
    const columns: NotificationGroupColumn[] = useMemo(
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
                accessorFn: (row) => row.group.id,
            },
            {
                header: t("Name"),
                accessorKey: "name",
                accessorFn: (row) => row.group.name,
                cell: ({ row }) => {
                    const s = row.original
                    return (
                        <div className="max-w-48 whitespace-normal break-words">{s.group.name}</div>
                    )
                },
            },
            {
                header: t("Notifier") + "(ID)",
                accessorKey: "notifications",
                accessorFn: (row) => row.notifications,
                cell: ({ row }) => {
                    const s = row.original
                    return (
                        <div className="max-w-48 whitespace-normal break-words">
                            <span>{(s.notifications || []).join(",")}</span>
                        </div>
                    )
                },
            },
            {
                id: "actions",
                header: t("Actions"),
                cell: ({ row }) => {
                    const s = row.original
                    return (
                        <ActionButtonGroup
                            className="flex gap-2"
                            delete={{
                                fn: deleteNotificationGroups,
                                id: s.group.id,
                                mutate: mutate,
                            }}
                        >
                            <NotificationGroupCard mutate={mutate} data={s} />
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
        getRowId: (row) => String(row.group.id),
    })

    const selectedRows = table.getSelectedRowModel().rows

    return (
        <div className="px-3">
            <div className="flex mt-6 mb-4">
                <GroupTab className="flex-1 mr-4 sm:max-w-[40%]" />
                <HeaderButtonGroup
                    className="flex ml-auto self-end sm:self-auto gap-2 flex-wrap shrink-0"
                    delete={{
                        fn: deleteNotificationGroups,
                        id: selectedRows.map((r) => r.original.group.id),
                        mutate: mutate,
                        clearSelection: () => table.resetRowSelection(),
                    }}
                >
                    <NotificationGroupCard mutate={mutate} />
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
