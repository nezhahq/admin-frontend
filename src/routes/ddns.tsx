import { swrFetcher } from "@/api/api";
import { Checkbox } from "@/components/ui/checkbox";
import { DDNSCard } from "@/components/ddns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ModelDDNSProfile } from "@/types";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { ActionButtonGroup } from "@/components/action-button-group";
import { HeaderButtonGroup } from "@/components/header-button-group";
import { toast } from "sonner";
import { deleteDDNSProfiles, getDDNSProviders } from "@/api/ddns";

export default function DDNSPage() {
    const { data, mutate, error, isLoading } = useSWR<ModelDDNSProfile[]>("/api/v1/ddns", swrFetcher);
    const [providers, setProviders] = useState<string[]>([]);

    useEffect(() => {
        const fetchProviders = async () => {
            const fetchedProviders = await getDDNSProviders();
            setProviders(fetchedProviders);
        };
        fetchProviders();
    }, []);

    useEffect(() => {
        if (error)
            toast("Error", {
                description: `Error fetching resource: ${error.message}.`,
            });
    }, [error]);

    const columns: ColumnDef<ModelDDNSProfile>[] = [
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
            accessorFn: (row) => row.name,
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{s.name}</div>;
            },
        },
        {
            header: "IPv4 Enabled",
            accessorKey: "enableIPv4",
            accessorFn: (row) => row.enable_ipv4 ?? false,
        },
        {
            header: "IPv6 Enabled",
            accessorKey: "enableIPv6",
            accessorFn: (row) => row.enable_ipv6 ?? false,
        },
        {
            header: "DDNS Provider",
            accessorKey: "provider",
            accessorFn: (row) => row.provider,
        },
        {
            header: "Domains",
            accessorKey: "domains",
            accessorFn: (row) => row.domains,
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{s.domains}</div>;
            },
        },
        {
            header: "Maximum retry attempts",
            accessorKey: "maxRetries",
            accessorFn: (row) => row.max_retries,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const s = row.original;
                return (
                    <ActionButtonGroup
                        className="flex gap-2"
                        delete={{ fn: deleteDDNSProfiles, id: s.id, mutate: mutate }}
                    >
                        <DDNSCard mutate={mutate} data={s} providers={providers} />
                    </ActionButtonGroup>
                );
            },
        },
    ];

    const table = useReactTable({
        data: data ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const selectedRows = table.getSelectedRowModel().rows;

    return (
        <div className="px-8">
            <div className="flex mt-6 mb-4">
                <h1 className="flex-1 text-3xl font-bold tracking-tight">Dynamic DNS</h1>
                <HeaderButtonGroup
                    className="flex-2 flex ml-auto gap-2"
                    delete={{
                        fn: deleteDDNSProfiles,
                        id: selectedRows.map((r) => r.original.id),
                        mutate: mutate,
                    }}
                >
                    <DDNSCard mutate={mutate} providers={providers} />
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
