import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | false;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    false: '',
  }[animation || 'pulse'];
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }[variant];
  
  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1.2em' : undefined),
  };
  
  return (
    <div
      className={`${baseClasses} ${animationClasses} ${variantClasses} ${className}`}
      style={style}
      aria-busy="true"
      aria-label="Loading"
    />
  );
};

// Swap Interface Skeleton
export const SwapInterfaceSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* From Token Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton width={80} height={20} />
          <Skeleton width={100} height={20} />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton width={120} height={24} className="mb-1" />
            <Skeleton width={180} height={36} />
          </div>
        </div>
      </div>
      
      {/* Swap Button */}
      <div className="flex justify-center">
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      
      {/* To Token Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton width={80} height={20} />
          <Skeleton width={100} height={20} />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton width={120} height={24} className="mb-1" />
            <Skeleton width={180} height={36} />
          </div>
        </div>
      </div>
      
      {/* Swap Details */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2">
        <div className="flex justify-between">
          <Skeleton width={120} height={16} />
          <Skeleton width={80} height={16} />
        </div>
        <div className="flex justify-between">
          <Skeleton width={100} height={16} />
          <Skeleton width={60} height={16} />
        </div>
        <div className="flex justify-between">
          <Skeleton width={140} height={16} />
          <Skeleton width={100} height={16} />
        </div>
      </div>
      
      {/* Swap Button */}
      <Skeleton height={48} variant="rectangular" />
    </div>
  );
};

// Token List Skeleton
export const TokenListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton width={80} height={20} className="mb-1" />
            <Skeleton width={120} height={16} />
          </div>
          <div className="text-right">
            <Skeleton width={60} height={20} className="mb-1 ml-auto" />
            <Skeleton width={80} height={16} className="ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Dashboard Skeleton
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Skeleton width={150} height={32} />
            <div className="flex items-center gap-4">
              <Skeleton width={120} height={36} variant="rectangular" />
              <Skeleton variant="circular" width={40} height={40} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Wallet Balance */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <Skeleton width={120} height={24} className="mb-4" />
              <Skeleton width={180} height={40} className="mb-6" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton variant="circular" width={24} height={24} />
                      <Skeleton width={60} height={20} />
                    </div>
                    <Skeleton width={80} height={20} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Swap Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <Skeleton width={100} height={28} className="mb-6" />
              <SwapInterfaceSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add shimmer animation to globals.css (commented out for now)
/*
const shimmerStyle = `
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite linear;
  background: linear-gradient(
    90deg,
    rgba(156, 163, 175, 0.1) 0%,
    rgba(156, 163, 175, 0.3) 50%,
    rgba(156, 163, 175, 0.1) 100%
  );
  background-size: 1000px 100%;
}
`;
*/