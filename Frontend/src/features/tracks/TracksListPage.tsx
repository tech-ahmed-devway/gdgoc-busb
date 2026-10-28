import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/services/api';
import { Track } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Compass, Plus, Users, CalendarCheck, Edit, Archive, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TracksListPage() {
  const queryClient = useQueryClient();
  const { isOrganizer } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Tracks
  const {
    data: tracks = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const res = await api.get<Track[]>('/tracks');
      return res.data || [];
    },
  });

  const handleOpenCreate = () => {
    setEditingTrack(null);
    setName('');
    setDescription('');
    setModalOpen(true);
  };

  const handleOpenEdit = (track: Track) => {
    setEditingTrack(track);
    setName(track.name);
    setDescription(track.description || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingTrack) {
        await api.patch(`/tracks/${editingTrack.id}`, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        toast.success('Track updated successfully!');
      } else {
        await api.post('/tracks', {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        toast.success('Track created successfully!');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save track.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (track: Track) => {
    const newStatus = track.status === 'active' ? 'archived' : 'active';
    try {
      await api.patch(`/tracks/${track.id}`, { status: newStatus });
      toast.success(`Track ${newStatus === 'active' ? 'activated' : 'archived'}.`);
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update track status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Chapter Tracks
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage official technical tracks, assigned leadership, and workshop counts.
          </p>
        </div>
        {isOrganizer && (
          <Button onClick={handleOpenCreate} className="font-semibold shadow-sm w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" /> Create New Track
          </Button>
        )}
      </div>

      {/* Grid of Tracks */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tracks.map((track) => (
            <Card
              key={track.id}
              className="flex flex-col justify-between hover:border-primary/50 transition-all shadow-xs"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Compass className="w-5 h-5" />
                  </div>
                  <StatusBadge status={track.status} />
                </div>
                <CardTitle className="text-lg pt-2">{track.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {track.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 text-xs border-t border-border pt-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Track Head:
                    </span>
                    <span className="font-medium text-foreground">
                      {track.head ? track.head.fullName : <span className="italic text-muted-foreground/60">Unassigned</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Vice Head:
                    </span>
                    <span className="font-medium text-foreground">
                      {track.viceHead ? track.viceHead.fullName : <span className="italic text-muted-foreground/60">Unassigned</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5" /> Total Sessions:
                    </span>
                    <span className="font-semibold text-foreground">
                      {track.sessionCount || 0}
                    </span>
                  </div>
                </div>
              </CardContent>

              {isOrganizer && (
                <CardFooter className="pt-2 border-t border-border flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleOpenEdit(track)}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleToggleArchive(track)}
                  >
                    <Archive className="w-3.5 h-3.5 mr-1" />
                    {track.status === 'active' ? 'Archive' : 'Activate'}
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Track Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingTrack ? 'Edit Track' : 'Create New Chapter Track'}</DialogTitle>
              <DialogDescription>
                Define the track name and focus areas for chapter student workshops.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="trackName">Track Name</Label>
                <Input
                  id="trackName"
                  placeholder="e.g. AI & Machine Learning"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trackDesc">Track Description</Label>
                <Textarea
                  id="trackDesc"
                  rows={3}
                  placeholder="Brief overview of curriculum and learning goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
                ) : editingTrack ? (
                  'Update Track'
                ) : (
                  'Create Track'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

