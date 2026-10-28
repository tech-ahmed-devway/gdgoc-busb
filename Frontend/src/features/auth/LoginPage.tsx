import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Eye, EyeOff, Shield, Users, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [accessMode, setAccessMode] = useState<'leadership' | 'organizer'>('leadership');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<any>('/auth/login', {
        email: email.trim(),
        password,
        requestedMode: accessMode,
      });

      if (response.data) {
        login(response.data.token, response.data.user);
        toast.success(`Welcome back, ${response.data.user.fullName}!`);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'ACCOUNT_PENDING_APPROVAL') {
          toast.info('Your account is awaiting Organizer approval.');
          navigate('/pending-approval');
          return;
        }
        setError(err.message);
      } else {
        setError('Unable to connect to the server. Please check your connection.');
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

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border shadow-xs text-xs font-medium text-muted-foreground mb-1">
            <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
            <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
            <span className="w-2 h-2 rounded-full bg-[#FBBC04]" />
            <span className="w-2 h-2 rounded-full bg-[#34A853]" />
            Google Developer Groups on Campus
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            GDGoC <span className="text-[#4285F4]">BUSB</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Chapter Operations & Session Reporting Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-border/80 shadow-md">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Sign In</CardTitle>
                <CardDescription>Select your chapter access mode</CardDescription>
              </div>
            </div>

            {/* Access Mode Selector */}
            <Tabs
              value={accessMode}
              onValueChange={(val) => {
                setAccessMode(val as 'leadership' | 'organizer');
                setError(null);
              }}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="leadership" className="flex items-center gap-2 text-xs">
                  <Users className="w-3.5 h-3.5" /> Head / Vice Head
                </TabsTrigger>
                <TabsTrigger value="organizer" className="flex items-center gap-2 text-xs">
                  <Shield className="w-3.5 h-3.5 text-[#4285F4]" /> Organizer
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-lg bg-destructive/15 text-destructive border border-destructive/20 font-medium">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={
                      accessMode === 'organizer'
                        ? 'organizer@gdgoc-busb.org'
                        : 'lead@gdgoc-busb.org'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {accessMode === 'leadership' && (
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  <>
                    Sign In to {accessMode === 'organizer' ? 'Organizer Console' : 'Portal'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              {accessMode === 'leadership' && (
                <div className="text-center text-xs text-muted-foreground">
                  New track leader?{' '}
                  <Link
                    to="/register"
                    className="text-primary font-semibold hover:underline"
                  >
                    Register for Track Leadership
                  </Link>
                </div>
              )}
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Protected internal management system. Unauthorized access is monitored.
        </p>
      </div>
    </div>
  );
}

