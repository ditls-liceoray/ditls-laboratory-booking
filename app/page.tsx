'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Monitor, Loader2, Eye, EyeOff, Sun, Moon, ShieldCheck, User } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { toast } from 'sonner';
import { logActivity } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, profile, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('clbs-remember');
    if (saved) {
      setUsername(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(profile.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard');
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password.');
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(username, password);
    if (error) {
      toast.error(error === 'Invalid login credentials' ? 'Invalid username or password.' : error);
      setSubmitting(false);
      return;
    }
    if (remember) localStorage.setItem('clbs-remember', username);
    else localStorage.removeItem('clbs-remember');
    await logActivity('login', `User "${username}" logged in`);
    toast.success('Welcome back!');
    // redirect handled by effect
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-blue-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-900 dark:to-slate-900">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 2px, transparent 2px), radial-gradient(circle at 75% 75%, white 2px, transparent 2px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Monitor className="h-8 w-8" />
            </div>
            <span className="text-2xl font-bold tracking-tight">DITLS</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Computer Laboratory<br />Booking System
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
          Developed by Raymund Luceño exclusively for Liceo DITLS faculty members to simplify computer laboratory reservations.
          </p>
          <div className="mt-12 space-y-4">
            {[
              'Real-Time Laboratory Availability',
              'Faculty-Only Secure Access',
              'Smart Schedule & Calendar Management',
              'Instant Booking Notifications',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-blue-50">
                <div className="h-2 w-2 rounded-full bg-blue-200" />
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative">
        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Monitor className="h-7 w-7 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">CLBS</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome Back</h2>
          <p className="text-muted-foreground mb-8">Sign in to access your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Enter your username"
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">Remember Me</Label>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Default Administrator Login
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Username: <span className="font-mono font-bold">admin</span> &nbsp;|&nbsp;
              Password: <span className="font-mono font-bold">admin123</span>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot password dialog */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setForgotOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Forgot Password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please contact your system administrator to reset your password. Teachers cannot self-reset passwords.
            </p>
            <Button onClick={() => setForgotOpen(false)} className="w-full">Got it</Button>
          </div>
        </div>
      )}
    </div>
  );
}
