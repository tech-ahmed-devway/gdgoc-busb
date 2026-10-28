import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Sparkles, Sun, Moon, Laptop, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function ProfileSettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully.');
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Account Profile & Settings
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Manage your personal credentials and application preferences.
        </p>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">User Information</CardTitle>
          <CardDescription>Your verified credentials and chapter permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">{user.fullName}</h3>
              <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="secondary" className="capitalize">
                  {user.role === 'organizer' ? (
                    <Shield className="w-3 h-3 mr-1 text-primary" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                  )}
                  {user.role.replace('_', ' ')}
                </Badge>
                {user.membership?.trackName && (
                  <Badge variant="outline">
                    {user.membership.trackName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance & Theming */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Appearance Theme</CardTitle>
          <CardDescription>Customize the interface mode (Light, Dark, or System)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 cursor-pointer ${
                theme === 'light'
                  ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                  : 'border-border hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <Sun className="w-6 h-6 text-amber-500" />
              <span className="text-xs font-semibold">Light</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 cursor-pointer ${
                theme === 'dark'
                  ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                  : 'border-border hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <Moon className="w-6 h-6 text-blue-400" />
              <span className="text-xs font-semibold">Dark</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 cursor-pointer ${
                theme === 'system'
                  ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                  : 'border-border hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <Laptop className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs font-semibold">System</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Session Logout */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Sign Out</CardTitle>
          <CardDescription>Terminate your current session on this device.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

