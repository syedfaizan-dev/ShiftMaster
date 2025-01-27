import { QueryClient } from "@tanstack/react-query";

const API_BASE_URL = window.location.origin;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0].startsWith('http') 
          ? queryKey[0] 
          : `${API_BASE_URL}${queryKey[0]}`;

        try {
          const res = await fetch(url, {
            credentials: "include",
            headers: {
              "Accept": "application/json",
            },
          });

          if (!res.ok) {
            if (res.status >= 500) {
              throw new Error(`${res.status}: ${res.statusText}`);
            }

            const errorText = await res.text();
            throw new Error(`${res.status}: ${errorText}`);
          }

          return res.json();
        } catch (error) {
          console.error('Query error:', error);
          throw error;
        }
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    }
  },
});