import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { DashboardSummary } from '@/types';
import { StatsCard } from '@/components/data-display/StatsCard';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass,
  Users,
  UserCheck,
  CalendarCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function DashboardPage() {
  const { user, isOrganizer } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get<DashboardSummary>('/dashboard/summary');
      return res.data;
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="Unable to fetch current operational metrics. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  // ================= ORGANIZER DASHBOARD =================
  if (isOrganizer) {
    const summary = data.summary;
    const trackOverview = data.trackOverview || [];
    const pendingApprovals = data.recentPendingApprovals || [];
    const recentActivities = data.recentSessionActivities || [];

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Chapter Operations Dashboard
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Google Developer Groups on Campus — BUSB real-time administrative status.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/reports')}
              className="text-xs"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Analytics & Exports
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/sessions/new')}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Session Report
            </Button>
          </div>
        </div>

        {/* Primary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Active Tracks"
            value={summary.activeTracks || 0}
            icon={<Compass className="w-5 h-5" />}
            accentColor="blue"
          />
          <StatsCard
            title="Active Leaders"
            value={summary.activeMembers || 0}
            icon={<Users className="w-5 h-5" />}
            accentColor="green"
          />
          <StatsCard
            title="Pending Approvals"
            value={summary.pendingApprovals || 0}
            icon={<UserCheck className="w-5 h-5" />}
            accentColor="yellow"
            description={
              summary.pendingApprovals && summary.pendingApprovals > 0
                ? 'Requires Organizer attention'
                : 'All requests reviewed'
            }
          />
          <StatsCard
            title="Approved Attendance"
            value={summary.approvedAttendance || 0}
            icon={<TrendingUp className="w-5 h-5" />}
            accentColor="blue"
            description="Verified student attendance"
          />
        </div>

        {/* Secondary Workflow Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3.5 border-border">
            <p className="text-xs text-muted-foreground">Planned Sessions</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{summary.totalSessions}</p>
          </Card>
          <Card className="p-3.5 border-border bg-amber-500/5">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Awaiting Review</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {summary.submittedSessions || 0}
            </p>
          </Card>
          <Card className="p-3.5 border-border bg-red-500/5">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Changes Requested</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-0.5">
              {summary.changesRequestedSessions || 0}
            </p>
          </Card>
          <Card className="p-3.5 border-border bg-emerald-500/5">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Approved Reports</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.approvedSessions || 0}
            </p>
          </Card>
        </div>

        {/* Track Overview & Pending Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Track Operational Status */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Track Reporting Overview</CardTitle>
                <CardDescription>Operational progress across active chapter tracks</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to="/tracks">
                  Manage Tracks <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {trackOverview.length === 0 ? (
                <EmptyState
                  title="No active tracks"
                  description="Create chapter tracks to start receiving session reports."
                  actionLabel="Create Track"
                  onAction={() => navigate('/tracks')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Track Name</TableHead>
                        <TableHead>Leadership</TableHead>
                        <TableHead className="text-center">Sessions</TableHead>
                        <TableHead className="text-center">Approved</TableHead>
                        <TableHead>Completion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackOverview.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium text-foreground">
                            {t.name}
                            {t.pendingReviewSessions > 0 && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                {t.pendingReviewSessions} pending
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.head ? t.head : <span className="italic">Unassigned</span>}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-xs">
                            {t.totalSessions}
                          </TableCell>
                          <TableCell className="text-center text-xs text-emerald-600 font-semibold">
                            {t.approvedSessions}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${t.completionRate}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{t.completionRate}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Applications Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Approval Queue</CardTitle>
                <CardDescription>Pending applicant reviews</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to="/approvals">
                  View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
                  No pending registration requests.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map((app) => (
                    <div
                      key={app.id}
                      className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{app.fullName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{app.trackName}</p>
                        <span className="inline-block text-[10px] text-primary capitalize font-medium">
                          {app.role.replace('_', ' ')}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => navigate('/approvals')}
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Session Reports Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Recent Session Submissions</CardTitle>
              <CardDescription>Latest activity reports submitted by track leadership</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/sessions">
                Browse All Sessions <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <EmptyState
                title="No recent sessions"
                description="Session reports submitted by track leadership will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivities.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-semibold text-xs">
                          #{session.sessionNumber}
                        </TableCell>
                        <TableCell className="font-medium text-foreground text-xs md:text-sm">
                          {session.title}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {session.trackName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {session.creatorName}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={session.workflowStatus} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(session.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-primary"
                            onClick={() => navigate(`/sessions/${session.id}`)}
                          >
                            Inspect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ================= HEAD / VICE HEAD DASHBOARD =================
  const trackInfo = data.track;
  const mySummary = data.summary;
  const myRecentSessions = data.recentSessions || [];
  const resumableDrafts = data.resumableDrafts || [];

  return (
    <div className="space-y-6">
      {/* Leadership Banner */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-accent/15 border border-primary/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold text-xs capitalize">
              {trackInfo?.role?.replace('_', ' ') || 'Leader'}
            </span>
            <span className="text-xs text-muted-foreground">Official Track Portal</span>
          </div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">
            {trackInfo?.name || 'Assigned Track'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Submit and manage activity reports, attendance figures, and photos for your track.
          </p>
        </div>

        <div>
          <Button
            size="lg"
            onClick={() => navigate('/sessions/new')}
            className="w-full md:w-auto shadow-md font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Session Report
          </Button>
        </div>
      </div>

      {/* Track Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sessions"
          value={mySummary.totalSessions || 0}
          icon={<CalendarCheck className="w-5 h-5" />}
          accentColor="blue"
        />
        <StatsCard
          title="Draft Reports"
          value={mySummary.drafts || 0}
          icon={<FileText className="w-5 h-5" />}
          accentColor="yellow"
        />
        <StatsCard
          title="Under Review"
          value={mySummary.submitted || 0}
          icon={<Clock className="w-5 h-5" />}
          accentColor="yellow"
        />
        <StatsCard
          title="Approved Reports"
          value={mySummary.approved || 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accentColor="green"
        />
      </div>

      {/* Changes requested alert if any */}
      {mySummary.changesRequested && mySummary.changesRequested > 0 ? (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {mySummary.changesRequested} report(s) require correction
              </p>
              <p className="text-xs text-muted-foreground">
                The Chapter Organizer has left feedback on one or more reports.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => navigate('/sessions?workflowStatus=changes_requested')}
          >
            Review Feedback
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Track Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Track Session Reports</CardTitle>
              <CardDescription>Recent submissions for {trackInfo?.name}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/sessions">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {myRecentSessions.length === 0 ? (
              <EmptyState
                title="No session reports yet"
                description="Begin logging your track's workshops and meetings by creating your first session report."
                actionLabel="Create Session #1"
                onAction={() => navigate('/sessions/new')}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRecentSessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold text-xs">
                          #{s.sessionNumber}
                        </TableCell>
                        <TableCell className="font-medium text-foreground text-xs md:text-sm">
                          {s.title}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(s.startsAt)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {s.attendanceCount} attendees
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={s.workflowStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-primary"
                            onClick={() => navigate(`/sessions/${s.id}`)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumable Drafts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumable Drafts</CardTitle>
            <CardDescription>Continue working on saved reports</CardDescription>
          </CardHeader>
          <CardContent>
            {resumableDrafts.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active drafts pending. You're all caught up!
              </div>
            ) : (
              <div className="space-y-3">
                {resumableDrafts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">
                        Session #{d.sessionNumber}: {d.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Edited {formatDate(d.updatedAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => navigate(`/sessions/${d.id}/edit`)}
                    >
                      Resume
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

