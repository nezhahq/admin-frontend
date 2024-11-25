import { swrFetcher } from "@/api/api";
import { Checkbox } from "@/components/ui/checkbox";
import { NATCard } from "@/components/nat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModelNAT } from "@/types";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useSWR from "swr";
import { useEffect } from "react";
import { ActionButtonGroup } from "@/components/action-button-group";
import { HeaderButtonGroup } from "@/components/header-button-group";
import { toast } from "sonner";
import { deleteNAT } from "@/api/nat";

export default function NATPage() {
  const { data, mutate, error, isLoading } = useSWR<ModelNAT[]>("/api/v1/nat", swrFetcher);

  useEffect(() => {
    if (error)
      toast("Error", {
        description: `Error fetching resource: ${error.message}.`,
      });
  }, [error]);

  const columns: ColumnDef<ModelNAT>[] = [
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
        return <div className="max-w-32 whitespace-normal break-words">{s.name}</div>;
      },
    },
    {
      header: "Server ID",
      accessorKey: "serverID",
      accessorFn: (row) => row.server_id,
    },
    {
      header: "Local service",
      accessorKey: "host",
      accessorFn: (row) => row.host,
      cell: ({ row }) => {
        const s = row.original;
        return <div className="max-w-32 whitespace-normal break-words">{s.host}</div>;
      },
    },
    {
      header: "Bind hostname",
      accessorKey: "domain",
      accessorFn: (row) => row.domain,
      cell: ({ row }) => {
        const s = row.original;
        return <div className="max-w-32 whitespace-normal break-words">{s.domain}</div>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <ActionButtonGroup
            className="flex gap-2"
            delete={{ fn: deleteNAT, id: s.id, mutate: mutate }}
          >
            <NATCard mutate={mutate} data={s} />
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
        <h1 className="flex-1 text-3xl font-bold tracking-tight">NAT Traversal</h1>
        <HeaderButtonGroup
          className="flex-2 flex ml-auto gap-2"
          delete={{
            fn: deleteNAT,
            id: selectedRows.map((r) => r.original.id),
            mutate: mutate,
          }}
        >
          <NATCard mutate={mutate} />
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
