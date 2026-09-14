'use client';

import { QueryClient, QueryClientProvider as TanstackProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  return <TanstackProvider client={queryClient}>{children}</TanstackProvider>;
}
