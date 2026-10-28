import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { History, Shield, CheckCircle2, UserCheck, CalendarCheck, Edit } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export function AuditHistoryPage() {
  const {
    data: logs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await api.get<any[]>('/audit?limit=50');
      return res.data || [];
    },
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'MEMBERSHIP_APPROVED':
      case 'SESSION_APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {action}
          </span>
        );
      case 'MEMBERSHIP_REJECTED':
      case 'SESSION_CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400">
            {action}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          System Audit Logs
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Chronological record of sensitive actions, approvals, submissions, and account transitions.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="text-xs text-foreground font-medium">
                    {log.actorName || <span className="text-muted-foreground italic">System</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {log.resourceType}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-xs">
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

