import { swrFetcher } from '@/api/api'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import useSWR from 'swr'
import { useEffect, useMemo } from 'react'
import { ActionButtonGroup } from '@/components/action-button-group'
import { HeaderButtonGroup } from '@/components/header-button-group'
import { toast } from 'sonner'
import { ModelWAFApiMock, wafBlockReasons } from '@/types'
import { deleteWAF } from '@/api/waf'
import { ip16Str } from '@/lib/utils'
import { SettingsTab } from '@/components/settings-tab'

import { useTranslation } from 'react-i18next'

export default function WAFPage() {
    const { t } = useTranslation()
    const { data, mutate, error, isLoading } = useSWR<ModelWAFApiMock[]>(
        '/api/v1/waf',
        swrFetcher,
    )

    useEffect(() => {
        if (error)
            toast(t('Error'), {
                description: t(`Error fetching resource: ${error.message}.`),
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error])

    const columns: ColumnDef<ModelWAFApiMock>[] = [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
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
            header: 'IP',
            accessorKey: 'ip',
            accessorFn: (row) => ip16Str(row.ip ?? ''),
        },
        {
            header: t('Count'),
            accessorKey: 'count',
            accessorFn: (row) => row.count,
        },
        {
            header: t('LastBlockReason'),
            accessorKey: 'lastBlockReason',
            accessorFn: (row) => row.last_block_reason,
            cell: ({ row }) => (
                <span>
                    {wafBlockReasons[row.original.last_block_reason] || ''}
                </span>
            ),
        },
        {
            header: t('LastBlockTime'),
            accessorKey: 'lastBlockTime',
            accessorFn: (row) => row.last_block_timestamp,
            cell: ({ row }) => {
                const s = row.original
                const date = new Date((s.last_block_timestamp || 0) * 1000)
                return <span>{date.toISOString()}</span>
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const s = row.original
                return (
                    <ActionButtonGroup
                        className="flex gap-2"
                        delete={{
                            fn: deleteWAF,
                            id: ip16Str(s.ip ?? ''),
                            mutate: mutate,
                        }}
                    >
                        <></>
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
            <SettingsTab className="mt-6 w-full" />
            <div className="flex mt-4 mb-4">
                <HeaderButtonGroup
                    className="flex-2 flex gap-2 ml-auto"
                    delete={{
                        fn: deleteWAF,
                        id: selectedRows.map((r) =>
                            ip16Str(r.original.ip ?? ''),
                        ),
                        mutate: mutate,
                    }}
                >
                    <></>
                </HeaderButtonGroup>
            </div>
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead
                                        key={header.id}
                                        className="text-sm"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef
                                                    .header,
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
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center"
                            >
                                {t('Loading')}...
                            </TableCell>
                        </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && 'selected'}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className="text-xsm"
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center"
                            >
                                {t('NoResults')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
