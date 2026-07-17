'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Monitor, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="text-center max-w-md animate-slide-up">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Monitor className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-7xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button>
              <Home className="h-4 w-4 mr-2" /> Go to Login
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
