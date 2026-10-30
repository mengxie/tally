import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        // A 4xx will not fix itself; only retry network and server errors.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
  });
}
