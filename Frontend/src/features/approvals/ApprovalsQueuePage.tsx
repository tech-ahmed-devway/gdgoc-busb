import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { MembershipRecord, Track } from '@/types';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Shield,
  Loader2,
  X,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

export function ApprovalsQueuePage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('pending');
  const [trackFilter, setTrackFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected applicant for Approve / Reject modal
  const [selectedApplicant, setSelectedApplicant] = useState<MembershipRecord | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Tracks for filter
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const res = await api.get<Track[]>('/tracks');
      return res.data || [];
    },
  });

  // Load Approvals Queue
  const {
    data: approvals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['approvals', { status: statusFilter, trackId: trackFilter, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (trackFilter !== 'all') params.append('trackId', trackFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get<MembershipRecord[]>(`/approvals?${params.toString()}`);
      return res.data || [];
    },
  });

  // Approve / Reject Handler
  const handleConfirmAction = async () => {
    if (!selectedApplicant) return;

    setIsProcessing(true);
    try {
      if (actionType === 'approve') {
        await api.post(`/approvals/${selectedApplicant.id}/approve`);
        toast.success(`Approved ${selectedApplicant.fullName} as ${selectedApplicant.role.replace('_', ' ')}!`);
      } else {
        await api.post(`/approvals/${selectedApplicant.id}/reject`, {
          reason: rejectionReason.trim() || undefined,
        });
        toast.info(`Application for ${selectedApplicant.fullName} rejected.`);
      }

      setSelectedApplicant(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Leadership Approval Queue
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Review, approve, or reject new Head and Vice Head registration applications for chapter tracks.
        </p>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <Input
              placeholder="Search applicant name, email, or track..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-10 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending Only</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All Applications</SelectItem>
              </SelectContent>
            </Select>

            <Select value={trackFilter} onValueChange={setTrackFilter}>
              <SelectTrigger className="w-44 h-10 text-xs">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tracks</SelectItem>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Approvals Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : approvals.length === 0 ? (
        <EmptyState
          title="No applications in queue"
          description={
            statusFilter === 'pending'
              ? 'There are currently no new registration applications awaiting Organizer review.'
              : 'No applications match the selected status or track criteria.'
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Requested Track</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Registered At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-semibold text-xs md:text-sm text-foreground">
                    {app.fullName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {app.email}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {app.trackName}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[11px]">
                      {app.role.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(app.requestedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {app.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedApplicant(app);
                            setActionType('reject');
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="gdgGreen"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedApplicant(app);
                            setActionType('approve');
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                      </div>
                    ) : app.status === 'rejected' && app.rejectionReason ? (
                      <span className="text-[11px] text-muted-foreground italic">
                        Reason: {app.rejectionReason}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {app.status === 'approved' ? 'Active leader' : 'Processed'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Approve / Reject Confirmation Modal */}
      <Dialog open={!!selectedApplicant} onOpenChange={() => setSelectedApplicant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Leadership Application' : 'Reject Application'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Activate ${selectedApplicant?.fullName}'s account as ${selectedApplicant?.role.replace('_', ' ')} for ${selectedApplicant?.trackName}.`
                : `Reject ${selectedApplicant?.fullName}'s application. Their history will be preserved.`}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'reject' && (
            <div className="space-y-2 py-2">
              <Label htmlFor="rejectionReason">Rejection Reason (Optional)</Label>
              <Textarea
                id="rejectionReason"
                rows={3}
                placeholder="e.g. Position already filled or requirements not met."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedApplicant(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'gdgGreen' : 'destructive'}
              onClick={handleConfirmAction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                </>
              ) : actionType === 'approve' ? (
                'Confirm Approval'
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

