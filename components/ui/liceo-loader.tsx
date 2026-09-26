'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

interface LiceoLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
  ariaLabel?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function LiceoLoader({
  size = 'md',
  fullScreen = false,
  className,
  ariaLabel = 'Loading',
}: LiceoLoaderProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullScreen ? 'fixed inset-0 z-50' : 'inline-flex'
      )}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div className={cn('relative flex items-center justify-center', sizeClasses[size])}>
        {/* Liceo Seal - the actual loading indicator */}
        <Image
          src="/images/Ldcu_seal.png"
          alt="Liceo de Cagayan University"
          width={size === 'sm' ? 40 : size === 'md' ? 64 : 96}
          height={size === 'sm' ? 40 : size === 'md' ? 64 : 96}
          className={cn(
            'animate-liceo-loading',
            size === 'sm' && 'w-10 h-10',
            size === 'md' && 'w-16 h-16',
            size === 'lg' && 'w-24 h-24'
          )}
          priority
        />
      </div>

      <div className={cn(
        'text-center',
        textSizeClasses[size]
      )}>
        <p className="text-primary font-medium">Loading...</p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}