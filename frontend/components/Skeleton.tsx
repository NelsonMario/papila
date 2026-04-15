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
    <div className={`bg-white rounded-2xl p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton variant="text" width="60%" height={24} />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} variant="pill" width={70 + i * 10} height={32} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRecommendation({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <Skeleton variant="text" width="50%" height={28} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <div className="space-y-3">
        <div>
          <Skeleton variant="text" width="30%" height={12} className="mb-2" />
          <Skeleton variant="pill" width="100%" height={6} />
        </div>
        <div>
          <Skeleton variant="text" width="30%" height={12} className="mb-2" />
          <Skeleton variant="pill" width="70%" height={6} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonWheel({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center py-8 ${className}`}>
      <div className="flex gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="pill" width={100} height={36} />
        ))}
      </div>
      <Skeleton variant="circular" width={300} height={300} />
    </div>
  );
}

export function SkeletonConnection({ className = '' }: { className?: string }) {
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="text" width={80} height={20} />
        </div>
        <Skeleton variant="text" width={20} height={20} />
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="text" width={80} height={20} />
        </div>
        <div className="ml-auto">
          <Skeleton variant="text" width={60} height={36} />
        </div>
      </div>
      <Skeleton variant="pill" width="100%" height={8} />
    </div>
  );
}
