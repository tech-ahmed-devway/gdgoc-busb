import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { SessionReport, Track, Season, WorkflowStatus, SessionMode } from '@/types';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import {
  Search,
  Plus,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

export function SessionsListPage() {
  const navigate = useNavigate();
  const { user, isOrganizer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const trackId = searchParams.get('trackId') || 'all';
  const seasonId = searchParams.get('seasonId') || 'all';
  const workflowStatus = searchParams.get('workflowStatus') || 'all';
  const mode = searchParams.get('mode') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);

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

  // Fetch filtered sessions
  const {
    data: sessionsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sessions', { trackId, seasonId, workflowStatus, mode, search, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (trackId !== 'all') params.append('trackId', trackId);
      if (seasonId !== 'all') params.append('seasonId', seasonId);
      if (workflowStatus !== 'all') params.append('workflowStatus', workflowStatus);
      if (mode !== 'all') params.append('mode', mode);
      if (search.trim()) params.append('search', search.trim());
      params.append('page', page.toString());
      params.append('limit', '10');

      const res = await api.get<SessionReport[]>(`/sessions?${params.toString()}`);
      return {
        sessions: res.data || [],
        pagination: res.pagination,
      };
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search.trim()) {
      next.set('search', search.trim());
    } else {
      next.delete('search');
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters =
    trackId !== 'all' ||
    seasonId !== 'all' ||
    workflowStatus !== 'all' ||
    mode !== 'all' ||
    Boolean(search.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Session Reports
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {isOrganizer
              ? 'Review and manage activity reports from all chapter tracks.'
              : `Manage reports and attendance for ${user?.membership?.trackName || 'your track'}.`}
          </p>
        </div>
        <div>
          <Button onClick={() => navigate('/sessions/new')} className="font-semibold shadow-sm w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" /> Create Session Report
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border-border">
        <div className="flex flex-col gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <Input
                placeholder="Search sessions by title or content covered..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="default">
              Search
            </Button>
          </form>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {isOrganizer && (
              <Select
                value={trackId}
                onValueChange={(val) => handleFilterChange('trackId', val)}
              >
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
            )}

            <Select
              value={seasonId}
              onValueChange={(val) => handleFilterChange('seasonId', val)}
            >
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

            <Select
              value={workflowStatus}
              onValueChange={(val) => handleFilterChange('workflowStatus', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Awaiting Review</SelectItem>
                <SelectItem value="changes_requested">Changes Requested</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={mode}
              onValueChange={(val) => handleFilterChange('mode', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="offline">In-Person (Offline)</SelectItem>
                <SelectItem value="online">Virtual (Online)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground border-t border-border mt-1">
              <span>Active filters applied</span>
              <button
                onClick={handleClearFilters}
                className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear all filters
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Sessions Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : sessionsData?.sessions.length === 0 ? (
        <EmptyState
          title="No session reports found"
          description={
            hasActiveFilters
              ? 'Try modifying your search or filter criteria.'
              : 'Create your first session report to begin tracking chapter activities.'
          }
          actionLabel="Create Session Report"
          onAction={() => navigate('/sessions/new')}
        />
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Session Title</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsData?.sessions.map((session) => (
                    <TableRow key={session.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell className="font-bold text-xs">
                        #{session.sessionNumber}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-sm text-foreground line-clamp-1">
                          {session.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {session.content}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {session.trackName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="font-medium text-foreground">{formatDate(session.startsAt)}</div>
                        <div className="text-[11px]">{formatTime(session.startsAt)} – {formatTime(session.endsAt)}</div>
                      </TableCell>
                      <TableCell>
                        {session.mode === 'online' ? (
                          <span className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <Video className="w-3.5 h-3.5 mr-1" /> Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-muted-foreground font-medium">
                            <MapPin className="w-3.5 h-3.5 mr-1" /> Offline
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs">
                        {session.attendanceCount}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={session.workflowStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => navigate(`/sessions/${session.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Card-Based List (< 768px) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {sessionsData?.sessions.map((session) => (
              <Card
                key={session.id}
                className="p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/sessions/${session.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-primary">
                      Session #{session.sessionNumber}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                      {session.title}
                    </h3>
                  </div>
                  <StatusBadge status={session.workflowStatus} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatDate(session.startsAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{session.attendanceCount} Attendees</span>
                  </div>
                  <div className="flex items-center gap-1 truncate col-span-2">
                    {session.mode === 'online' ? (
                      <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">
                      {session.mode === 'online'
                        ? 'Google Meet'
                        : session.location || 'Physical Location'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {sessionsData?.pagination && sessionsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-muted-foreground">
                Showing page {sessionsData.pagination.page} of {sessionsData.pagination.totalPages} ({sessionsData.pagination.total} sessions)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sessionsData.pagination.page <= 1}
                  onClick={() => handleFilterChange('page', (sessionsData.pagination.page - 1).toString())}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sessionsData.pagination.page >= sessionsData.pagination.totalPages}
                  onClick={() => handleFilterChange('page', (sessionsData.pagination.page + 1).toString())}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

