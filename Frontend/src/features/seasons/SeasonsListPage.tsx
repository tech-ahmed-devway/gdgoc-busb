import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Season } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Layers, Plus, Calendar, Check, Edit, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export function SeasonsListPage() {
  const queryClient = useQueryClient();
  const { isOrganizer } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Seasons
  const {
    data: seasons = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const res = await api.get<Season[]>('/seasons');
      return res.data || [];
    },
  });

  const handleOpenCreate = () => {
    setEditingSeason(null);
    setName('');
    const now = new Date();
    setStartsAt(`${now.getFullYear()}-09-01`);
    setEndsAt(`${now.getFullYear() + 1}-06-30`);
    setIsActive(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (season: Season) => {
    setEditingSeason(season);
    setName(season.name);
    setStartsAt(season.startsAt ? season.startsAt.split('T')[0] : '');
    setEndsAt(season.endsAt ? season.endsAt.split('T')[0] : '');
    setIsActive(season.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startsAt || !endsAt) return;

    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.error('Season end date must be after start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSeason) {
        await api.patch(`/seasons/${editingSeason.id}`, {
          name: name.trim(),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          isActive,
        });
        toast.success('Season updated successfully!');
      } else {
        await api.post('/seasons', {
          name: name.trim(),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          isActive,
        });
        toast.success('Season created successfully!');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save season.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActive = async (season: Season) => {
    try {
      await api.patch(`/seasons/${season.id}`, { isActive: true });
      toast.success(`Set ${season.name} as active season.`);
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to set active season.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Academic Seasons
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Configure academic periods and operational cycles for session reporting.
          </p>
        </div>
        {isOrganizer && (
          <Button onClick={handleOpenCreate} className="font-semibold shadow-sm w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" /> Create Season
          </Button>
        )}
      </div>

      {/* Grid of Seasons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {seasons.map((season) => (
            <Card
              key={season.id}
              className={`flex flex-col justify-between hover:border-primary/50 transition-all ${
                season.isActive ? 'border-primary ring-1 ring-primary/20' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Layers className="w-5 h-5" />
                  </div>
                  {season.isActive ? (
                    <Badge variant="success">Current Active Season</Badge>
                  ) : (
                    <StatusBadge status={season.status} />
                  )}
                </div>
                <CardTitle className="text-lg pt-2">{season.name}</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1.5 pt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(season.startsAt)} — {formatDate(season.endsAt)}
                </CardDescription>
              </CardHeader>

              {isOrganizer && (
                <CardFooter className="pt-2 border-t border-border flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleOpenEdit(season)}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>

                  {!season.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-primary"
                      onClick={() => handleSetActive(season)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Set as Active
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Season Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingSeason ? 'Edit Season' : 'Create Academic Season'}</DialogTitle>
              <DialogDescription>
                Define the academic year and dates for session counting.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="seasonName">Season Name</Label>
                <Input
                  id="seasonName"
                  placeholder="e.g. 2024–2025 Academic Season"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startsAt">Start Date</Label>
                  <Input
                    id="startsAt"
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endsAt">End Date</Label>
                  <Input
                    id="endsAt"
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <Label htmlFor="isActive" className="text-xs font-normal cursor-pointer">
                  Set as current active season
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : editingSeason ? (
                  'Update Season'
                ) : (
                  'Create Season'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

