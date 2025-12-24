"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // Cache data for 1 minute before considering it stale
                staleTime: 60 * 1000,
                // Keep unused data in cache for 5 minutes
                gcTime: 5 * 60 * 1000,
                // Retry failed requests twice
                retry: 2,
                // Don't refetch on window focus (optional, but good for less DB hits)
                refetchOnWindowFocus: false,
            },
        },
    }))

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
