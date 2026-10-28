import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { PendingApprovalPage } from '@/features/auth/PendingApprovalPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SessionsListPage } from '@/features/sessions/SessionsListPage';
import { SessionDetailPage } from '@/features/sessions/SessionDetailPage';
import { SessionFormPage } from '@/features/sessions/SessionFormPage';
import { ApprovalsQueuePage } from '@/features/approvals/ApprovalsQueuePage';
import { TracksListPage } from '@/features/tracks/TracksListPage';
import { SeasonsListPage } from '@/features/seasons/SeasonsListPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { AuditHistoryPage } from '@/features/audit/AuditHistoryPage';
import { ProfileSettingsPage } from '@/features/settings/ProfileSettingsPage';
import { Skeleton } from '@/components/ui/skeleton';

// Route Guard for Authenticated Users
function ProtectedRoute({ requireOrganizer = false }: { requireOrganizer?: boolean }) {
  const { user, isLoading, isAuthenticated, isOrganizer, isPendingApproval } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center -space-x-1 mb-2">
            <span className="w-3 h-3 rounded-full bg-[#4285F4] animate-bounce" />
            <span className="w-3 h-3 rounded-full bg-[#EA4335] animate-bounce [animation-delay:0.1s]" />
            <span className="w-3 h-3 rounded-full bg-[#FBBC04] animate-bounce [animation-delay:0.2s]" />
            <span className="w-3 h-3 rounded-full bg-[#34A853] animate-bounce [animation-delay:0.3s]" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Loading Chapter Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect pending applicants to pending approval screen
  if (isPendingApproval && !isOrganizer) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Enforce Organizer-only permissions on protected organizer routes
  if (requireOrganizer && !isOrganizer) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  // Public Auth Routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/pending-approval',
    element: <PendingApprovalPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },

  // Protected App Routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/sessions',
            element: <SessionsListPage />,
          },
          {
            path: '/sessions/new',
            element: <SessionFormPage />,
          },
          {
            path: '/sessions/:id',
            element: <SessionDetailPage />,
          },
          {
            path: '/sessions/:id/edit',
            element: <SessionFormPage />,
          },
          {
            path: '/settings',
            element: <ProfileSettingsPage />,
          },

          // Organizer Only Routes
          {
            element: <ProtectedRoute requireOrganizer />,
            children: [
              {
                path: '/approvals',
                element: <ApprovalsQueuePage />,
              },
              {
                path: '/tracks',
                element: <TracksListPage />,
              },
              {
                path: '/seasons',
                element: <SeasonsListPage />,
              },
              {
                path: '/reports',
                element: <ReportsPage />,
              },
              {
                path: '/audit',
                element: <AuditHistoryPage />,
              },
            ],
          },
        ],
      },
    ],
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

