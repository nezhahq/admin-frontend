import { swrFetcher } from "@/api/api"
import { deleteUser } from "@/api/user"
import { ActionButtonGroup } from "@/components/action-button-group"
import { HeaderButtonGroup } from "@/components/header-button-group"
import { SettingsTab } from "@/components/settings-tab"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { UserCard } from "@/components/user"
import { selectableTableFeatures } from "@/lib/table"
import { ModelUser } from "@/types"
import { ColumnDef, flexRender, useTable } from "@tanstack/react-table"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import useSWR from "swr"

export default function UserPage() {
    const { t } = useTranslation()
    const { data, mutate, error, isLoading } = useSWR<ModelUser[]>("/api/v1/user", swrFetcher)

    useEffect(() => {
        if (error)
            toast(t("Error"), {
                description: t("Results.UnExpectedError", {
                    error: error.message,
                }),
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error])

    // 列定义必须保持引用稳定：每次渲染都新建的话，单元格渲染函数在 React 眼里是
    // 新组件，整行会被卸载重挂，列表一刷新就把正在填写的编辑弹窗关掉、输入清空。
    const columns: ColumnDef<typeof selectableTableFeatures, ModelUser>[] = useMemo(
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
                accessorFn: (row) => row.id,
            },
            {
                header: t("Username"),
                accessorKey: "username",
                accessorFn: (row) => row.username,
            },
            {
                header: t("Role"),
                accessorKey: "role",
                accessorFn: (row) => {
                    return row.role === 1 ? t("User") : t("Admin")
                },
            },
            {
                header: t("LastLogin"),
                accessorKey: "updated_at",
                accessorFn: (row) =>
                    row.updated_at ? new Date(row.updated_at).toLocaleString() : t("Never"),
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
                                fn: deleteUser,
                                id: s.id,
                                mutate: mutate,
                            }}
                        >
                            <></>
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
        <div className="px-3">
            <SettingsTab className="mt-6 w-full" />
            <div className="flex mt-4 mb-4">
                <HeaderButtonGroup
                    className="flex-2 flex gap-2 ml-auto"
                    delete={{
                        fn: deleteUser,
                        id: selectedRows.map((r) => r.original.id),
                        mutate: mutate,
                    }}
                >
                    <UserCard mutate={mutate} />
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
