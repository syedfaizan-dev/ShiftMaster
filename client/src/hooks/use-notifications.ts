import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@db/schema";

export function useNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], error } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 10000, // Refetch every 10 seconds for more responsive updates
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 3, // Retry failed requests 3 times
    onError: (error) => {
      console.error('Failed to fetch notifications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load notifications. Please try again later.",
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return {
    notifications: notifications || [],
    unreadCount,
    markAsRead: markAsRead.mutate,
    error,
  };
}