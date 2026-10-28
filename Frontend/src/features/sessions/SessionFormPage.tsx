import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/services/api';
import { Track, Season, SessionReport } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Upload,
  Save,
  Send,
  ArrowLeft,
  X,
  Loader2,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export function SessionFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user, isOrganizer } = useAuth();

  // Form States
  const [trackId, setTrackId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [sessionNumber, setSessionNumber] = useState<number | ''>(1);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [mode, setMode] = useState<'offline' | 'online'>('offline');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [location, setLocation] = useState('');

  const [recordingUrl, setRecordingUrl] = useState('');
  const [attendanceCount, setAttendanceCount] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');

  // Pending photo uploads
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Tracks
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const res = await api.get<Track[]>('/tracks');
      return res.data || [];
    },
  });

  // Load Seasons
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const res = await api.get<Season[]>('/seasons');
      return res.data || [];
    },
  });

  // Set default track for Head / Vice Head
  useEffect(() => {
    if (!isEditing && !isOrganizer && user?.membership?.trackId) {
      setTrackId(user.membership.trackId);
    } else if (!isEditing && tracks.length > 0 && !trackId) {
      setTrackId(tracks[0].id);
    }
  }, [tracks, user, isOrganizer, isEditing]);

  // Set default active season
  useEffect(() => {
    if (!isEditing && seasons.length > 0 && !seasonId) {
      const active = seasons.find((s) => s.isActive) || seasons[0];
      setSeasonId(active.id);
    }
  }, [seasons, isEditing]);

  // Load existing session data if in Edit Mode
  const { data: existingSession, isLoading: isFetchingSession } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await api.get<SessionReport>(`/sessions/${id}`);
      return res.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingSession) {
      setTrackId(existingSession.trackId);
      setSeasonId(existingSession.seasonId);
      setSessionNumber(existingSession.sessionNumber);
      setTitle(existingSession.title);
      setContent(existingSession.content);

      if (existingSession.startsAt) {
        const start = new Date(existingSession.startsAt);
        setDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().substring(0, 5));
      }
      if (existingSession.endsAt) {
        const end = new Date(existingSession.endsAt);
        setEndTime(end.toTimeString().substring(0, 5));
      }

      setMode(existingSession.mode);
      setMeetingUrl(existingSession.meetingUrl || '');
      setLocation(existingSession.location || '');
      setRecordingUrl(existingSession.recordingUrl || '');
      setAttendanceCount(existingSession.attendanceCount);
      setNotes(existingSession.notes || '');
      setLearningOutcomes(existingSession.learningOutcomes || '');
      setChallengesFaced(existingSession.challengesFaced || '');
    }
  }, [existingSession]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 10MB limit.`);
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (action: 'draft' | 'submit') => {
    setError(null);

    if (!trackId) {
      setError('Please select a track.');
      return;
    }
    if (!seasonId) {
      setError('Please select a season.');
      return;
    }
    if (!title.trim()) {
      setError('Session title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Session content covered is required.');
      return;
    }
    if (!sessionNumber || Number(sessionNumber) <= 0) {
      setError('Session number must be a positive integer.');
      return;
    }
    if (attendanceCount === '' || Number(attendanceCount) < 0) {
      setError('Attendance count must be a non-negative number.');
      return;
    }

    // Build ISO timestamp from date + time
    const startIso = new Date(`${date}T${startTime}:00`).toISOString();
    const endIso = new Date(`${date}T${endTime}:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setError('End time must be later than start time.');
      return;
    }

    if (action === 'submit') {
      if (mode === 'online' && (!meetingUrl || !meetingUrl.startsWith('http'))) {
        setError('A valid online meeting URL is required before submitting.');
        return;
      }
      if (mode === 'offline' && !location.trim()) {
        setError('A physical location is required before submitting.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload = {
        trackId,
        seasonId,
        sessionNumber: Number(sessionNumber),
        title: title.trim(),
        content: content.trim(),
        startsAt: startIso,
        endsAt: endIso,
        mode,
        meetingUrl: mode === 'online' ? meetingUrl.trim() : undefined,
        location: mode === 'offline' ? location.trim() : undefined,
        recordingUrl: recordingUrl.trim() || undefined,
        attendanceCount: Number(attendanceCount),
        notes: notes.trim() || undefined,
        learningOutcomes: learningOutcomes.trim() || undefined,
        challengesFaced: challengesFaced.trim() || undefined,
        action,
      };

      let sessionId = id;

      if (isEditing) {
        const updateRes = await api.patch<SessionReport>(`/sessions/${id}`, payload);
        if (action === 'submit') {
          await api.post(`/sessions/${id}/submit`);
        }
        toast.success(action === 'submit' ? 'Session report submitted!' : 'Session report draft updated!');
      } else {
        const createRes = await api.post<SessionReport>('/sessions', payload);
        sessionId = createRes.data?.id;
        toast.success(action === 'submit' ? 'Session report submitted for review!' : 'Session report draft saved!');
      }

      // Upload any pending photos to this session
      if (sessionId && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          await api.upload(`/sessions/${sessionId}/assets`, formData);
        }
      }

      navigate(sessionId ? `/sessions/${sessionId}` : '/sessions');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save session report. Please check required fields.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing && isFetchingSession) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/sessions"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sessions
        </Link>
        <span className="text-xs text-muted-foreground">
          {isEditing ? 'Editing Session Report' : 'New Activity Report'}
        </span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {isEditing ? `Edit Session #${sessionNumber}` : 'Create Session Report'}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Document Chapter track workshops, attendance, and technical content covered.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/15 text-destructive border border-destructive/20 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="space-y-6">
        {/* ================= SECTION A: SESSION INFORMATION ================= */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                A
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Session Information</CardTitle>
                <CardDescription className="text-xs">Track, season, session order, and primary topic</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Track Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="trackSelect">Track</Label>
                {isOrganizer ? (
                  <Select value={trackId} onValueChange={setTrackId}>
                    <SelectTrigger id="trackSelect">
                      <SelectValue placeholder="Select track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={user?.membership?.trackName || 'Assigned Track'}
                    disabled
                    className="bg-muted font-medium"
                  />
                )}
              </div>

              {/* Season Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="seasonSelect">Season</Label>
                <Select value={seasonId} onValueChange={setSeasonId}>
                  <SelectTrigger id="seasonSelect">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.isActive && '(Active)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session Number */}
              <div className="space-y-1.5">
                <Label htmlFor="sessionNumber">Session Number</Label>
                <Input
                  id="sessionNumber"
                  type="number"
                  min={1}
                  placeholder="e.g. 1"
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  required
                />
              </div>
            </div>

            {/* Session Title */}
            <div className="space-y-1.5">
              <Label htmlFor="sessionTitle">Session Title</Label>
              <Input
                id="sessionTitle"
                placeholder="e.g. Building Modern Web APIs with Bun and Elysia"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Content Covered */}
            <div className="space-y-1.5">
              <Label htmlFor="contentCovered">Technical Content Covered</Label>
              <Textarea
                id="contentCovered"
                rows={5}
                placeholder="Describe the topics discussed, coding exercises conducted, key concepts demonstrated, and slides or repositories used..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* ================= SECTION B: DATE AND LOCATION ================= */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                B
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Date & Location</CardTitle>
                <CardDescription className="text-xs">Schedule and physical or virtual meeting format</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sessionDate">Session Date</Label>
                <Input
                  id="sessionDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Online / Offline Selector */}
            <div className="space-y-2 pt-2">
              <Label>Session Format</Label>
              <Tabs
                value={mode}
                onValueChange={(val) => setMode(val as 'offline' | 'online')}
                className="w-full sm:w-80"
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="offline" className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3.5 h-3.5" /> In-Person (Offline)
                  </TabsTrigger>
                  <TabsTrigger value="online" className="flex items-center gap-2 text-xs">
                    <Video className="w-3.5 h-3.5" /> Virtual (Online)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Conditional Rendering: Online URL vs Offline Location */}
            {mode === 'online' ? (
              <div className="space-y-1.5 animate-fade-in">
                <Label htmlFor="meetingUrl">Meeting Link (Google Meet / Zoom)</Label>
                <div className="relative">
                  <Video className="w-4 h-4 text-blue-500 absolute left-3 top-3" />
                  <Input
                    id="meetingUrl"
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 animate-fade-in">
                <Label htmlFor="location">Physical Campus Location</Label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="location"
                    placeholder="e.g. Hall B3, Faculty of Engineering, BUSB Campus"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= SECTION C: MATERIALS & PHOTOS ================= */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                C
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Session Materials & Media</CardTitle>
                <CardDescription className="text-xs">Recording link and workshop photo proof</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="recordingUrl">Session Recording URL (Optional)</Label>
              <div className="relative">
                <Video className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="recordingUrl"
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or Google Drive link"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Photo Upload Dropzone */}
            <div className="space-y-2">
              <Label>Session Photos & Attachments</Label>
              <div className="p-6 rounded-xl border border-dashed border-border bg-muted/20 text-center hover:bg-muted/40 transition-colors">
                <input
                  type="file"
                  id="photoUpload"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <label htmlFor="photoUpload" className="cursor-pointer block space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-primary" />
                  <p className="text-xs font-semibold text-foreground">
                    Click to browse or drag photos here
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Supported: JPG, PNG, WebP, PDF (Max 10MB per file)
                  </p>
                </label>
              </div>

              {/* Uploaded Previews */}
              {previews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {previews.map((src, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-lg border border-border overflow-hidden bg-muted aspect-video"
                    >
                      <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ================= SECTION D: ATTENDANCE & NOTES ================= */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                D
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Attendance & Notes</CardTitle>
                <CardDescription className="text-xs">Audience size, challenges, and chapter notes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="attendanceCount">Verified Student Attendance Count</Label>
              <Input
                id="attendanceCount"
                type="number"
                min={0}
                placeholder="0"
                value={attendanceCount}
                onChange={(e) => setAttendanceCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Enter total number of students who checked in and attended this session.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="learningOutcomes">Key Learning Outcomes (Optional)</Label>
              <Textarea
                id="learningOutcomes"
                rows={2}
                placeholder="What skills did students acquire during this session?"
                value={learningOutcomes}
                onChange={(e) => setLearningOutcomes(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="challengesFaced">Challenges Faced (Optional)</Label>
              <Textarea
                id="challengesFaced"
                rows={2}
                placeholder="Any hardware, venue, internet, or software installation hurdles encountered?"
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Additional Internal Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Comments for the Chapter Organizer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>

          {/* Form Actions Footer */}
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sessions')}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                disabled={isLoading}
                onClick={() => handleSubmit('draft')}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save as Draft
              </Button>
              <Button
                type="button"
                disabled={isLoading}
                onClick={() => handleSubmit('submit')}
                className="w-full sm:w-auto font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

