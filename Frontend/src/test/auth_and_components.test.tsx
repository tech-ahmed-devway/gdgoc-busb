import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { StatsCard } from '@/components/data-display/StatsCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoginPage } from '@/features/auth/LoginPage';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { Compass } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>{ui}</BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('GDGoC BUSB UI Component & Auth Page Tests', () => {
  it('StatusBadge renders appropriate states correctly', () => {
    const { rerender } = render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();

    rerender(<StatusBadge status="submitted" />);
    expect(screen.getByText('Awaiting Review')).toBeInTheDocument();

    rerender(<StatusBadge status="changes_requested" />);
    expect(screen.getByText('Changes Requested')).toBeInTheDocument();

    rerender(<StatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('StatsCard renders title, value and description', () => {
    render(
      <StatsCard
        title="Active Tracks"
        value={6}
        description="Official campus tracks"
        icon={<Compass data-testid="compass-icon" />}
        accentColor="blue"
      />
    );

    expect(screen.getByText('Active Tracks')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Official campus tracks')).toBeInTheDocument();
  });

  it('EmptyState renders title and action button', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try creating a new record."
        actionLabel="Create Item"
        onAction={() => {}}
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('Try creating a new record.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument();
  });

  it('LoginPage renders role selector for Organizer vs Head / Vice Head', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText(/GDGoC/i)).toBeInTheDocument();
    expect(screen.getByText(/Head \/ Vice Head/i)).toBeInTheDocument();
    expect(screen.getByText(/Organizer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });
});

