import { swrFetcher } from "@/api/api"
import { deleteWAF } from "@/api/waf"
import { ActionButtonGroup } from "@/components/action-button-group"
import { HeaderButtonGroup } from "@/components/header-button-group"
import { SettingsTab } from "@/components/settings-tab"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/hooks/useAuth"
import {
    GithubComNezhahqNezhaModelValueArrayModelWAFApiMock,
    ModelWAFApiMock,
    wafBlockIdentifiers,
    wafBlockReasons,
} from "@/types"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import useSWR from "swr"

export default function WAFPage() {
    const { t } = useTranslation()
    const { profile } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const page = Number(searchParams.get("page")) || 1
    const pageSize = Number(searchParams.get("pageSize")) || 10

    // 计算 offset
    const offset = (page - 1) * pageSize

    const { data, mutate, error, isLoading } =
        useSWR<GithubComNezhahqNezhaModelValueArrayModelWAFApiMock>(
            `/api/v1/waf?offset=${offset}&limit=${pageSize}`,
            swrFetcher,
        )

    const isAdmin = profile?.role === 0

    useEffect(() => {
        if (error)
            toast(t("Error"), {
                description: t(`Error fetching resource: ${error.message}.`),
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error])

    let columns: ColumnDef<ModelWAFApiMock>[] = [
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
            header: "IP",
            accessorKey: "ip",
            accessorFn: (row) => row.ip,
        },
        {
            header: t("Count"),
            accessorKey: "count",
            accessorFn: (row) => row.count,
        },
        {
            header: t("LastBlockReason"),
            accessorKey: "lastBlockReason",
            accessorFn: (row) => row.block_reason,
            cell: ({ row }) => <span>{wafBlockReasons[row.original.block_reason] || ""}</span>,
        },
        {
            header: t("BlockIdentifier"),
            accessorKey: "BlockIdentifier",
            accessorFn: (row) => {
                return wafBlockIdentifiers[row.block_identifier] || row.block_identifier
            },
        },
        {
            header: t("LastBlockTime"),
            accessorKey: "lastBlockTime",
            accessorFn: (row) => row.block_timestamp,
            cell: ({ row }) => {
                const s = row.original
                const date = new Date((s.block_timestamp || 0) * 1000)
                return <span>{date.toISOString()}</span>
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const s = row.original
                return (
                    <ActionButtonGroup
                        className="flex gap-2"
                        delete={{
                            fn: deleteWAF,
                            id: s.ip || "",
                            mutate: mutate,
                        }}
                    >
                        <></>
                    </ActionButtonGroup>
                )
            },
        },
    ]

    if (!isAdmin) {
        // 非管理员隐藏操作列
        columns = columns.filter((c) => c.id !== "actions")
    }

    const dataCache = useMemo(() => {
        return data?.value ?? []
    }, [data])

    const table = useReactTable({
        data: dataCache,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const selectedRows = table.getSelectedRowModel().rows

    const renderPagination = () => {
        if (!data?.pagination) return null

        const { total } = data.pagination
        const totalPages = Math.ceil(total / pageSize)

        const handlePageChange = (newPage: number) => {
            if (newPage < 1 || newPage > totalPages) return
            setSearchParams({ page: newPage.toString(), pageSize: pageSize.toString() })
        }

        // 计算要显示的页码范围
        const getPageNumbers = () => {
            const pages: number[] = []
            const maxVisiblePages = 5

            if (totalPages <= maxVisiblePages) {
                return Array.from({ length: totalPages }, (_, i) => i + 1)
            }

            // 始终显示第一页
            pages.push(1)

            let startPage = Math.max(2, page - 1)
            let endPage = Math.min(totalPages - 1, page + 1)

            if (page <= 3) {
                endPage = Math.min(maxVisiblePages - 1, totalPages - 1)
            } else if (page >= totalPages - 2) {
                startPage = Math.max(2, totalPages - (maxVisiblePages - 2))
            }

            if (startPage > 2) {
                pages.push(-1) // 表示省略号
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i)
            }

            if (endPage < totalPages - 1) {
                pages.push(-1) // 表示省略号
            }

            // 始终显示最后一页
            if (totalPages > 1) {
                pages.push(totalPages)
            }

            return pages
        }

        return (
            <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                    {t("Total")}: {total}
                </div>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => handlePageChange(page - 1)}
                                className={
                                    page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                                }
                            />
                        </PaginationItem>

                        {getPageNumbers().map((pageNum, idx) =>
                            pageNum === -1 ? (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={pageNum}>
                                    <PaginationLink
                                        onClick={() => handlePageChange(pageNum)}
                                        isActive={pageNum === page}
                                    >
                                        {pageNum}
                                    </PaginationLink>
                                </PaginationItem>
                            ),
                        )}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => handlePageChange(page + 1)}
                                className={
                                    page >= totalPages
                                        ? "pointer-events-none opacity-50"
                                        : "cursor-pointer"
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        )
    }

    return (
        <div className="px-3">
            <SettingsTab className="mt-6 w-full" />
            <div className="flex mt-4 mb-4">
                {isAdmin && (
                    <HeaderButtonGroup
                        className="flex-2 flex gap-2 ml-auto"
                        delete={{
                            fn: deleteWAF,
                            id: selectedRows.map((r) => r.original.ip || ""),
                            mutate: mutate,
                        }}
                    >
                        <></>
                    </HeaderButtonGroup>
                )}
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
            {renderPagination()}
        </div>
    )
}
