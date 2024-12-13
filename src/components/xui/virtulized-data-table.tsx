"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import {
    ColumnDef,
    Row,
    SortDirection,
    SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { HTMLAttributes, forwardRef, useEffect, useRef, useState } from "react"
import { TableVirtuoso } from "react-virtuoso"

// Original Table is wrapped with a <div> (see https://ui.shadcn.com/docs/components/table#radix-:r24:-content-manual),
// but here we don't want it, so let's use a new component with only <table> tag
const TableComponent = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
    ({ className, ...props }, ref) => (
        <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    ),
)
TableComponent.displayName = "TableComponent"

const TableRowComponent = <TData,>(rows: Row<TData>[]) =>
    function getTableRow(props: HTMLAttributes<HTMLTableRowElement>) {
        // @ts-expect-error data-index is a valid attribute
        const index = props["data-index"]
        const row = rows[index]

        if (!row) return null

        return (
            <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="translate-y-[50%]"
                {...props}
            >
                {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                ))}
            </TableRow>
        )
    }

function SortingIndicator({ isSorted }: { isSorted: SortDirection | false }) {
    if (!isSorted) return null
    return (
        <div>
            {
                {
                    asc: "↑",
                    desc: "↓",
                }[isSorted]
            }
        </div>
    )
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    rowComponent?: (
        rows: Row<TData>[],
    ) => (props: HTMLAttributes<HTMLTableRowElement>) => JSX.Element | null
}

export function DataTable<TData, TValue>({
    columns,
    data,
    rowComponent,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([
        {
            id: "type",
            desc: true,
        },
    ])
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const { rows } = table.getRowModel()

    const [heightState, setHeight] = useState(0)
    const ref = useRef(null)
    const isDesktop = useMediaQuery("(min-width: 640px)")

    useEffect(() => {
        const calculateHeight = () => {
            if (ref.current) {
                const virtuosoElement = ref.current
                let topOffset = 0
                let currentElement = virtuosoElement as any

                // Calculate the total offset from the top of the document
                while (currentElement) {
                    topOffset += currentElement.offsetTop || 0
                    currentElement = currentElement.offsetParent as HTMLElement
                }

                const totalHeight = window.innerHeight
                const calculatedHeight = totalHeight - topOffset

                setHeight(calculatedHeight)
            }
        }
        calculateHeight() // Initial calculation

        if (isDesktop) {
            window.addEventListener("resize", calculateHeight)
        }

        return () => {
            if (isDesktop) window.removeEventListener("resize", calculateHeight)
        }
    }, [isDesktop])

    return (
        <div className="rounded-md border" ref={ref} style={{ height: heightState }}>
            <TableVirtuoso
                totalCount={rows.length}
                components={{
                    Table: TableComponent,
                    TableRow: rowComponent ? rowComponent(rows) : TableRowComponent(rows),
                    Scroller: ScrollArea,
                }}
                fixedHeaderContent={() =>
                    table.getHeaderGroups().map((headerGroup) => (
                        // Change header background color to non-transparent
                        <TableRow className="bg-card hover:bg-muted" key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        style={{
                                            width: header.getSize(),
                                        }}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <div
                                                className="flex items-center"
                                                {...{
                                                    style: header.column.getCanSort()
                                                        ? {
                                                              cursor: "pointer",
                                                              userSelect: "none",
                                                          }
                                                        : {},
                                                    onClick:
                                                        header.column.getToggleSortingHandler(),
                                                }}
                                            >
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext(),
                                                )}
                                                <SortingIndicator
                                                    isSorted={header.column.getIsSorted()}
                                                />
                                            </div>
                                        )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))
                }
            />
        </div>
    )
}
