import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Clock, CheckCircle2, RotateCcw, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function PendingApprovalPage() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    await refreshUser();
    setIsChecking(false);

    if (user?.accountStatus === 'approved') {
      toast.success('Your account has been approved!');
      navigate('/dashboard');
    } else {
      toast.info('Application is still pending Organizer review.');
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-muted/20 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="w-3 h-3 rounded-full bg-[#4285F4]" />
          <span className="w-3 h-3 rounded-full bg-[#EA4335]" />
          <span className="w-3 h-3 rounded-full bg-[#FBBC04]" />
          <span className="w-3 h-3 rounded-full bg-[#34A853]" />
        </div>

        <Card className="border border-border/80 shadow-md">
          <CardHeader className="space-y-3 pb-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto flex items-center justify-center">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
            <CardTitle className="text-xl">Registration Submitted</CardTitle>
            <CardDescription className="text-sm">
              Your application for track leadership is currently awaiting Chapter Organizer approval.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs text-muted-foreground text-left bg-muted/30 p-4 rounded-xl mx-6">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Applicant account successfully registered.</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Organizer must verify and approve track assignment before access to session reporting is enabled.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <span>
                Once approved, you will have access to create and manage session reports for your track.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 pt-6">
            <Button
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="w-full"
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Check Approval Status
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

