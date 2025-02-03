import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const createManagerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const editManagerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().refine((val) => val === '' || val.length >= 6, {
    message: "Password must be at least 6 characters if provided",
  }),
});

interface CreateManagerModalProps {
  onSuccess: () => void;
  manager?: {
    id: number;
    username: string;
    fullName: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateManagerModal({ onSuccess, manager, open, onOpenChange }: CreateManagerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!manager;

  // Use controlled state if provided through props
  const modalOpen = open ?? isOpen;
  const setModalOpen = onOpenChange ?? setIsOpen;

  const form = useForm<z.infer<typeof editManagerSchema>>({
    resolver: zodResolver(isEditing ? editManagerSchema : createManagerSchema),
    defaultValues: {
      username: manager?.username || "",
      fullName: manager?.fullName || "",
      password: "",
    },
  });

  // Reset form when manager prop changes
  useEffect(() => {
    if (manager) {
      form.reset({
        username: manager.username,
        fullName: manager.fullName,
        password: "", // Don't populate password field when editing
      });
    }
  }, [manager, form]);

  const onSubmit = async (values: z.infer<typeof editManagerSchema>) => {
    try {
      const url = isEditing 
        ? `/api/admin/users/${manager.id}`
        : "/api/register";

      const method = isEditing ? "PUT" : "POST";

      // Only include password if it's provided
      const payload = {
        ...values,
        isManager: true,
        ...((!isEditing || values.password) && { password: values.password }),
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save manager");
      }

      toast({
        title: "Success",
        description: `Manager ${isEditing ? "updated" : "created"} successfully`,
      });

      setModalOpen(false);
      form.reset();
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} manager`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Manager
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Manager</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password {isEditing && "(leave empty to keep current)"}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  {isEditing && (
                    <FormDescription>
                      Leave the password field empty to keep the current password
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit">
                {isEditing ? "Update" : "Create"} Manager
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}