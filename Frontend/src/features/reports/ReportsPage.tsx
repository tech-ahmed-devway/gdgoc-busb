import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ReportsSummary, Track, Season } from '@/types';
import { StatsCard } from '@/components/data-display/StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import {
  FileSpreadsheet,
  Download,
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

export function ReportsPage() {
  const [trackId, setTrackId] = useState('all');
  const [seasonId, setSeasonId] = useState('all');
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  // Load Tracks for filter
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const res = await api.get<Track[]>('/tracks');
      return res.data || [];
    },
  });

  // Load Seasons for filter
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const res = await api.get<Season[]>('/seasons');
      return res.data || [];
    },
  });

  // Fetch Reports Summary
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reportsSummary', { trackId, seasonId, status, mode }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (trackId !== 'all') params.append('trackId', trackId);
      if (seasonId !== 'all') params.append('seasonId', seasonId);
      if (status !== 'all') params.append('status', status);
      if (mode !== 'all') params.append('mode', mode);

      const res = await api.get<ReportsSummary>(`/reports/summary?${params.toString()}`);
      return res.data;
    },
  });

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (trackId !== 'all') params.append('trackId', trackId);
      if (seasonId !== 'all') params.append('seasonId', seasonId);
      if (status !== 'all') params.append('status', status);
      if (mode !== 'all') params.append('mode', mode);

      const today = new Date().toISOString().split('T')[0];
      await api.downloadCsv(`/reports/export?${params.toString()}`, `gdgoc_busb_report_${today}.csv`);
      toast.success('CSV export generated and downloaded!');
    } catch (e: any) {
      toast.error('Failed to export CSV report.');
    } finally {
      setIsExporting(false);
    }
  };

  const summary = reportData?.summary;
  const trackBreakdown = reportData?.trackBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Analytics & Reports
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Chapter activity reporting statistics and CSV exports.
          </p>
        </div>
        <div>
          <Button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="font-semibold shadow-sm w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isExporting ? 'Generating CSV...' : 'Export to CSV'}
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <Card className="p-4 border-border">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Track</span>
            <Select value={trackId} onValueChange={setTrackId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Tracks" />
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

          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Season</span>
            <Select value={seasonId} onValueChange={setSeasonId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Seasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Status</span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="submitted">Awaiting Review</SelectItem>
                <SelectItem value="changes_requested">Changes Requested</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Format</span>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="offline">In-Person</SelectItem>
                <SelectItem value="online">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="Total Sessions"
              value={summary?.total || 0}
              icon={<CalendarCheck className="w-5 h-5" />}
              accentColor="blue"
            />
            <StatsCard
              title="Approved Reports"
              value={summary?.approved || 0}
              icon={<CheckCircle2 className="w-5 h-5" />}
              accentColor="green"
            />
            <StatsCard
              title="Awaiting Review"
              value={summary?.pending || 0}
              icon={<Clock className="w-5 h-5" />}
              accentColor="yellow"
            />
            <StatsCard
              title="Verified Attendance"
              value={summary?.totalAttendance || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              accentColor="blue"
              description="Sum of approved attendees"
            />
          </div>

          {/* Track Reporting Breakdown Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Track Reporting Breakdown</CardTitle>
              <CardDescription>Performance and completion rates filtered by current selection</CardDescription>
            </CardHeader>
            <CardContent>
              {trackBreakdown.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No sessions match the selected filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Track Name</TableHead>
                        <TableHead className="text-center">Total Sessions</TableHead>
                        <TableHead className="text-center">Approved</TableHead>
                        <TableHead className="text-center">Under Review</TableHead>
                        <TableHead className="text-center">Verified Attendance</TableHead>
                        <TableHead>Completion Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackBreakdown.map((t) => (
                        <TableRow key={t.trackId}>
                          <TableCell className="font-semibold text-xs md:text-sm text-foreground">
                            {t.trackName}
                          </TableCell>
                          <TableCell className="text-center text-xs font-semibold">
                            {t.totalSessions}
                          </TableCell>
                          <TableCell className="text-center text-xs text-emerald-600 font-semibold">
                            {t.approvedSessions}
                          </TableCell>
                          <TableCell className="text-center text-xs text-amber-600 font-medium">
                            {t.pendingSessions}
                          </TableCell>
                          <TableCell className="text-center text-xs font-bold text-foreground">
                            {t.attendance}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${t.completionRate}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground font-medium">{t.completionRate}%</span>
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
        </>
      )}
    </div>
  );
}

