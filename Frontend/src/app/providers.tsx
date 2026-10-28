import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds stale time
    },
  },
});

function ToastWithTheme() {
  const { effectiveTheme } = useTheme();
  return (
    <Toaster
      theme={effectiveTheme}
      position="top-right"
      richColors
      closeButton
      duration={4000}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <ToastWithTheme />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

