import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";

export default function UserTable() {
  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const columns = [
    {
      header: "Full Name",
      accessorKey: "fullName",
    },
    {
      header: "Username",
      accessorKey: "username",
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: (value: any, row: any) => (
        <Badge
          variant={
            row.isAdmin
              ? "admin"
              : row.isManager
                ? "manager"
                : row.isInspector
                  ? "inspector"
                  : "employee"
          }
        >
          {row.isAdmin
            ? "Admin"
            : row.isManager
              ? "Manager"
              : row.isInspector
                ? "Inspector"
                : "Employee"}
        </Badge>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <ResponsiveTable columns={columns} data={users || []} />;
}