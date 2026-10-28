import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, Loader2, KeyRound } from 'lucide-react';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await api.post<{ devResetToken?: string }>('/auth/forgot-password', {
        email: email.trim(),
      });

      setIsSubmitted(true);
      if (response.data?.devResetToken) {
        setDevToken(response.data.devResetToken);
      }
    } catch {
      // Even if network fails, maintain security UX
      setIsSubmitted(true);
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
        <div className="text-center space-y-2">
          <Link
            to="/login"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Password Recovery
          </h1>
          <p className="text-xs text-muted-foreground">
            Recover access to your GDGoC BUSB account.
          </p>
        </div>

        <Card className="border border-border/80 shadow-md">
          {isSubmitted ? (
            <CardContent className="pt-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  Request Received
                </h3>
                <p className="text-xs text-muted-foreground">
                  If an account exists with <span className="font-medium text-foreground">{email}</span>, password reset instructions have been dispatched.
                </p>
              </div>

              {devToken && (
                <div className="p-3 bg-muted/40 rounded-lg text-left text-xs border border-border space-y-1.5">
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> Development Recovery Shortcut
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Token: <code className="bg-background px-1.5 py-0.5 rounded border">{devToken}</code>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs mt-1"
                    onClick={() => navigate(`/reset-password?token=${devToken}`)}
                  >
                    Proceed with this Token
                  </Button>
                </div>
              )}

              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">Return to Sign In</Link>
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Forgot your password?</CardTitle>
                <CardDescription>
                  Enter your registered email address and we will generate a secure reset link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="lead@gdgoc-busb.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button type="submit" disabled={isLoading} className="w-full font-medium">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      Send Reset Instructions
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

