import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * HTTP method types for API requests
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API Error interface
 */
export interface ApiError {
  status: number;
  message: string;
}

/**
 * Throws an error if the response is not ok
 */
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Generic API request function with improved type safety
 */
export async function apiRequest<TData = unknown>(
  method: HttpMethod | string,
  url: string,
  data?: TData,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Options for handling 401 Unauthorized responses
 */
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Generic query function factory with improved type safety
 */
export const getQueryFn: <TResponse>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<TResponse> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any; // Type assertion necessary for null return in generic function
    }

    await throwIfResNotOk(res);
    return await res.json() as TResponse;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
