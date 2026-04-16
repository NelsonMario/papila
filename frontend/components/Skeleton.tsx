'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'pill';
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) {
  const baseClass = 'bg-[#e8e5e0] overflow-hidden relative';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-2xl',
    pill: 'rounded-full',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? 40 : '100%'),
    height: height || (variant === 'circular' ? 40 : variant === 'text' ? 16 : 100),
  };

  return (
    <div 
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
      style={style}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ 
          repeat: Infinity, 
          duration: 1.5, 
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-neutral-200 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton variant="text" width="50%" height={24} />
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} variant="pill" width={60 + i * 8} height={28} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRecommendation({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#f5f3ef] rounded-xl sm:rounded-2xl overflow-hidden border border-neutral-200 ${className}`}>
      <div className="p-3 sm:p-4 pb-3">
        <div className="flex justify-between items-start mb-1">
          <Skeleton variant="text" width={80} height={18} />
          <Skeleton variant="rectangular" width={24} height={24} className="rounded" />
        </div>
        <Skeleton variant="text" width={50} height={12} className="mt-1" />
      </div>
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton variant="text" width={50} height={10} />
          <Skeleton variant="rectangular" width="100%" height={8} className="flex-1 rounded-full" />
          <Skeleton variant="text" width={24} height={12} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="text" width={50} height={10} />
          <Skeleton variant="rectangular" width="100%" height={8} className="flex-1 rounded-full" />
          <Skeleton variant="text" width={24} height={12} />
        </div>
      </div>
    </div>
  );
}
