import { swrFetcher } from "@/api/api";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useSWR from "swr";
import { useEffect } from "react";
import { ActionButtonGroup } from "@/components/action-button-group";
import { HeaderButtonGroup } from "@/components/header-button-group";
import { toast } from "sonner";
import { ModelUser } from "@/types";
import { deleteUser } from "@/api/user";
import { SettingsTab } from "@/components/settings-tab";
import { UserCard } from "@/components/user";

export default function UserPage() {
  const { data, mutate, error, isLoading } = useSWR<ModelUser[]>("/api/v1/user", swrFetcher);

  useEffect(() => {
    if (error)
      toast("Error", {
        description: `Error fetching resource: ${error.message}.`,
      });
  }, [error]);

  const columns: ColumnDef<ModelUser>[] = [
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
      header: "Username",
      accessorKey: "username",
      accessorFn: (row) => row.username,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const s = row.original;
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
