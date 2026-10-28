import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '@/services/api';
import { Track } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Users, Lock, Mail, User, Compass, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function RegisterPage() {
  const navigate = useNavigate();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'head' | 'vice_head'>('head');
  const [trackId, setTrackId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTracks() {
      try {
        const response = await api.get<Track[]>('/tracks');
        if (response.data) {
          setTracks(response.data.filter((t) => t.status === 'active'));
          if (response.data.length > 0) {
            setTrackId(response.data[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load tracks:', e);
      } finally {
        setTracksLoading(false);
      }
    }
    loadTracks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!trackId) {
      setError('Please select an active track.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/register', {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role,
        trackId,
      });

      toast.success('Registration submitted! Awaiting Organizer approval.');
      navigate('/pending-approval');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to submit application. Please check your network connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-muted/20 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            to="/login"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Track Leadership Registration
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Apply as Head or Vice Head for a Google Developer Groups track.
          </p>
        </div>

        {/* Form Card */}
        <Card className="border border-border/80 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Applicant Details</CardTitle>
            <CardDescription>
              All applications require Organizer review and verification before access is granted.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-lg bg-destructive/15 text-destructive border border-destructive/20 font-medium">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="fullName"
                    placeholder="e.g. Omar Tarek"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Official / University Email</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@busb.edu.eg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Requested Role</Label>
                  <Select value={role} onValueChange={(val) => setRole(val as any)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head">Track Head</SelectItem>
                      <SelectItem value="vice_head">Vice Head</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Track Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="track">Assigned Track</Label>
                  {tracksLoading ? (
                    <div className="h-10 rounded-lg bg-muted/60 animate-pulse" />
                  ) : (
                    <Select value={trackId} onValueChange={setTrackId}>
                      <SelectTrigger id="track">
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
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading || tracksLoading}
                className="w-full font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Application...
                  </>
                ) : (
                  <>
                    Submit Application for Approval
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Already registered?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">
                  Sign In instead
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

