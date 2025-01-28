import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const requestSchema = z.object({
  type: z.enum(['shift_swap', 'leave']),
  reason: z.string().min(1, "Reason is required"),
  startDate: z.string().refine(val => val !== "", {
    message: "Start date is required for leave requests",
  }),
  endDate: z.string().refine(val => val !== "", {
    message: "End date is required for leave requests",
  }),
  shiftId: z.string().optional(),
  targetShiftId: z.string().optional(),
}).refine((data) => {
  if (data.type === 'leave') {
    return data.startDate && data.endDate;
  }
  return true;
}, {
  message: "Start and end dates are required for leave requests",
  path: ["startDate"],
});

type RequestFormData = z.infer<typeof requestSchema>;

type RequestFormProps = {
  onSuccess: () => void;
};

export default function RequestForm({ onSuccess }: RequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: 'leave',
      reason: '',
      startDate: '',
      endDate: '',
    },
  });

  const createRequest = useMutation({
    mutationFn: async (data: RequestFormData) => {
      // Convert dates to ISO strings for the server
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      };

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create request");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Request submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      form.reset();
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    // Validate dates for leave requests
    if (data.type === 'leave') {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter valid dates",
        });
        return;
      }

      if (endDate < startDate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "End date cannot be before start date",
        });
        return;
      }
    }

    createRequest.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Request Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="leave">Leave Request</SelectItem>
                  <SelectItem value="shift_swap">Shift Swap</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('type') === 'leave' && (
          <>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" disabled={createRequest.isPending}>
          Submit Request
        </Button>
      </form>
    </Form>
  );
}