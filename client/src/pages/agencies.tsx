import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { TablePagination } from "@/components/table-pagination";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import * as z from "zod";
import Navbar from "@/components/navbar";
import { ResponsiveTable } from "@/components/ui/responsive-table";

const agencySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type AgencyFormData = z.infer<typeof agencySchema>;

type Agency = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

export default function Agencies() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<AgencyFormData>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { data: agencies = [], isLoading } = useQuery<Agency[]>({
    queryKey: ["/api/admin/agencies"],
    enabled: user?.isAdmin,
  });

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentAgencies = agencies.slice(startIndex, endIndex);

  const createAgency = useMutation({
    mutationFn: async (data: AgencyFormData) => {
      const res = await fetch("/api/admin/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Agency created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agencies"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateAgency = useMutation({
    mutationFn: async (data: AgencyFormData & { id: number }) => {
      const res = await fetch(`/api/admin/agencies/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Agency updated successfully" });
      setIsDialogOpen(false);
      setSelectedAgency(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agencies"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteAgency = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/agencies/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Agency deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agencies"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  if (!user?.isAdmin) {
    return (
      <Navbar>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Navbar>
    );
  }

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (value: string | null) => value || "—",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (value: number) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const agency = agencies.find((a) => a.id === value);
              if (agency) {
                setSelectedAgency(agency);
                form.reset({
                  name: agency.name,
                  description: agency.description || "",
                });
                setIsDialogOpen(true);
              }
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (confirm("Are you sure you want to delete this agency?")) {
                deleteAgency.mutate(value);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Agencies</h1>
          <Button onClick={() => {
            setSelectedAgency(null);
            form.reset();
            setIsDialogOpen(true);
          }}>
            Create Agency
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : agencies.length === 0 ? (
          <Alert>
            <AlertTitle>No Agencies Found</AlertTitle>
            <AlertDescription>
              Create your first agency to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ResponsiveTable
              columns={columns}
              data={currentAgencies}
            />

            <TablePagination
              currentPage={currentPage}
              totalItems={agencies.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedAgency ? "Edit Agency" : "Create New Agency"}
              </DialogTitle>
              <DialogDescription>
                {selectedAgency
                  ? "Edit the agency details below."
                  : "Fill in the details below to create a new agency."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(async (data) => {
                  if (selectedAgency) {
                    await updateAgency.mutateAsync({
                      ...data,
                      id: selectedAgency.id,
                    });
                  } else {
                    await createAgency.mutateAsync(data);
                  }
                })}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter agency name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter agency description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSelectedAgency(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAgency.isPending || updateAgency.isPending}
                  >
                    {createAgency.isPending || updateAgency.isPending ? (
                      "Saving..."
                    ) : selectedAgency ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}
