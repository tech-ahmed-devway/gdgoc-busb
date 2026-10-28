import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/services/api';
import { SessionReport, SessionAsset, SessionReview } from '@/types';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Button } from '@/components/ui/button';
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
import { ErrorState } from '@/components/feedback/ErrorState';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  Users,
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Edit,
  Send,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from '@/lib/utils';
import { toast } from 'sonner';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isOrganizer } = useAuth();

  // Review modal states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'changes_requested'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Asset upload states
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<SessionAsset | null>(null);

  // Fetch session details
  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await api.get<SessionReport>(`/sessions/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Submit Draft Mutation
  const submitDraftMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/sessions/${id}/submit`);
    },
    onSuccess: () => {
      toast.success('Session report submitted for Organizer review!');
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit report.');
    },
  });

  // Resubmit Mutation
  const resubmitMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/sessions/${id}/resubmit`);
    },
    onSuccess: () => {
      toast.success('Session report corrected and resubmitted!');
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to resubmit report.');
    },
  });

  // Review (Approve or Request Changes)
  const handleReviewSubmit = async () => {
    if (reviewAction === 'changes_requested' && !reviewComment.trim()) {
      toast.error('Please provide a review comment explaining required changes.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await api.post(`/sessions/${id}/review`, {
        action: reviewAction,
        comment: reviewComment.trim() || 'Approved by Chapter Organizer.',
      });

      toast.success(
        reviewAction === 'approved'
          ? 'Session report approved successfully!'
          : 'Changes requested from track leadership.'
      );
      setReviewModalOpen(false);
      setReviewComment('');
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to review report.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Asset Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.upload(`/sessions/${id}/assets`, formData);
      toast.success('Photo uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Asset Delete
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await api.delete(`/assets/${assetId}`);
      toast.success('Asset removed.');
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete asset.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <ErrorState
        title="Session not found"
        message="Unable to load session details or you may not be authorized to view this track."
        onRetry={() => refetch()}
      />
    );
  }

  const isAuthor = user?.id === session.createdBy;
  const canEdit =
    isOrganizer ||
    (isAuthor && (session.workflowStatus === 'draft' || session.workflowStatus === 'changes_requested'));

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/sessions"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Session Reports
        </Link>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Draft Button */}
          {canEdit && session.workflowStatus !== 'approved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/sessions/${session.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-1.5" /> Edit Report
            </Button>
          )}

          {/* Submit Draft Button */}
          {isAuthor && session.workflowStatus === 'draft' && (
            <Button
              size="sm"
              disabled={submitDraftMutation.isPending}
              onClick={() => submitDraftMutation.mutate()}
            >
              <Send className="w-4 h-4 mr-1.5" />
              {submitDraftMutation.isPending ? 'Submitting...' : 'Submit for Review'}
            </Button>
          )}

          {/* Resubmit Button */}
          {isAuthor && session.workflowStatus === 'changes_requested' && (
            <Button
              size="sm"
              disabled={resubmitMutation.isPending}
              onClick={() => resubmitMutation.mutate()}
            >
              <Send className="w-4 h-4 mr-1.5" />
              {resubmitMutation.isPending ? 'Resubmitting...' : 'Resubmit Corrected Report'}
            </Button>
          )}

          {/* Organizer Review Actions */}
          {isOrganizer && session.workflowStatus === 'submitted' && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setReviewAction('changes_requested');
                  setReviewModalOpen(true);
                }}
              >
                <AlertCircle className="w-4 h-4 mr-1.5" /> Request Changes
              </Button>
              <Button
                size="sm"
                variant="gdgGreen"
                onClick={() => {
                  setReviewAction('approved');
                  setReviewModalOpen(true);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Report
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Session Banner */}
      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-5 md:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                Session #{session.sessionNumber}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {session.trackName} • {session.seasonName}
              </span>
            </div>
            <StatusBadge status={session.workflowStatus} />
          </div>

          <h1 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">
            {session.title}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border text-xs">
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date & Time
              </p>
              <p className="font-semibold text-foreground">{formatDate(session.startsAt)}</p>
              <p className="text-muted-foreground">{formatTime(session.startsAt)} – {formatTime(session.endsAt)}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                {session.mode === 'online' ? (
                  <Video className="w-3.5 h-3.5 text-blue-500" />
                ) : (
                  <MapPin className="w-3.5 h-3.5" />
                )}
                Format
              </p>
              <p className="font-semibold text-foreground capitalize">
                {session.mode === 'online' ? 'Online Workshop' : 'In-Person Session'}
              </p>
              {session.mode === 'online' && session.meetingUrl ? (
                <a
                  href={session.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Join Meeting <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-muted-foreground line-clamp-1">{session.location || '—'}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Attendance
              </p>
              <p className="text-base font-bold text-foreground">
                {session.attendanceCount} Attendees
              </p>
              <p className="text-muted-foreground">
                {session.workflowStatus === 'approved' ? 'Verified count' : 'Reported count'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground">Submitted By</p>
              <p className="font-semibold text-foreground">{session.creatorName}</p>
              <p className="text-muted-foreground">
                {session.submittedAt ? formatDateTime(session.submittedAt) : 'Draft state'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid: Content & Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Content Covered, Outcomes & Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Covered */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Content & Topics Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {session.content}
              </div>
            </CardContent>
          </Card>

          {/* Learning Outcomes & Challenges */}
          {(session.learningOutcomes || session.challengesFaced || session.notes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Additional Notes & Observations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm">
                {session.learningOutcomes && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Key Learning Outcomes</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{session.learningOutcomes}</p>
                  </div>
                )}
                {session.challengesFaced && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Challenges Faced</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{session.challengesFaced}</p>
                  </div>
                )}
                {session.notes && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Internal Notes</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recording URL if provided */}
          {session.recordingUrl && (
            <Card className="p-4 border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Video className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Session Video Recording</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-md">{session.recordingUrl}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer">
                    Open Video <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </a>
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right Col: Photos, Attachments & Review History */}
        <div className="space-y-6">
          {/* Photos & Attachments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Session Photos</CardTitle>
                <CardDescription>Visual event proof & materials</CardDescription>
              </div>
              {canEdit && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button size="sm" variant="outline" asChild disabled={isUploading}>
                    <span>
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1" />
                      )}
                      Upload
                    </span>
                  </Button>
                </label>
              )}
            </CardHeader>
            <CardContent>
              {!session.assets || session.assets.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground/60" />
                  No photos uploaded for this session yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {session.assets.map((asset) => {
                    const isImage = asset.contentType.startsWith('image/');
                    const assetUrl = asset.url || `/api/v1/assets/local/${asset.storagePath}`;
                    return (
                      <div
                        key={asset.id}
                        className="group relative rounded-lg border border-border overflow-hidden bg-muted/30 aspect-video flex items-center justify-center"
                      >
                        {isImage ? (
                          <img
                            src={assetUrl}
                            alt={asset.fileName}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                            onClick={() => setSelectedPhoto(asset)}
                          />
                        ) : (
                          <div className="text-center p-2">
                            <FileText className="w-6 h-6 mx-auto text-primary" />
                            <p className="text-[10px] text-foreground truncate max-w-[100px] mt-1">
                              {asset.fileName}
                            </p>
                          </div>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Delete file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review History Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Review History</CardTitle>
              <CardDescription>Approval workflow logs and feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {!session.reviews || session.reviews.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No review feedback logged yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {session.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                        rev.action === 'approved'
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-red-500/20 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          {rev.action === 'approved' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          )}
                          {rev.reviewerName || 'Organizer'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(rev.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Modal Dialog (Organizer) */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approved' ? 'Approve Session Report' : 'Request Changes'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approved'
                ? 'Approving this report marks it as officially verified and updates Chapter attendance statistics.'
                : 'Provide actionable feedback to the track leadership explaining what requires correction.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="reviewComment">
              {reviewAction === 'approved' ? 'Review Note (Optional)' : 'Review Feedback (Required)'}
            </Label>
            <Textarea
              id="reviewComment"
              rows={4}
              placeholder={
                reviewAction === 'approved'
                  ? 'e.g. Great session! Verified photos and attendance count.'
                  : 'e.g. Please upload session photos and verify the online recording URL.'
              }
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              required={reviewAction === 'changes_requested'}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              disabled={isSubmittingReview}
            >
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'approved' ? 'gdgGreen' : 'destructive'}
              onClick={handleReviewSubmit}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : reviewAction === 'approved' ? (
                'Confirm Approval'
              ) : (
                'Submit Changes Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Preview Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none text-white">
            <img
              src={selectedPhoto.url || `/api/v1/assets/local/${selectedPhoto.storagePath}`}
              alt={selectedPhoto.fileName}
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-lg"
            />
            <p className="text-center text-xs text-white/80 py-2">{selectedPhoto.fileName}</p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

