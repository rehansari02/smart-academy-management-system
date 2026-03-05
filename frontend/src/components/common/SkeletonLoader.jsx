import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(clsx("animate-pulse rounded-md bg-gray-200/80", className))}
      {...props}
    />
  );
};

export const SkeletonCircle = ({ className, size = 48 }) => (
    <Skeleton className={clsx(`rounded-full w-${size} h-${size}`, className)} />
);

export const FormSkeleton = ({ rows = 4, cols = 3 }) => {
  return (
    <div className="space-y-6 animate-pulse">
        {/* Header-like skeleton */}
        <div className="flex items-center justify-between mb-8 p-4 bg-gray-100/50 rounded-lg">
           <Skeleton className="h-8 w-1/3" />
           <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Input grid */}
        <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
            {Array.from({ length: rows * cols }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
        </div>
        
        {/* Button area */}
        <div className="flex justify-end mt-8 gap-4">
             <Skeleton className="h-10 w-32" />
        </div>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
    return (
        <div className="animate-pulse space-y-4">
            {/* Toolbar */}
             <div className="flex justify-between mb-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-24" />
             </div>
             
             {/* Table Header */}
             <div className="flex gap-4 p-4 bg-gray-100 rounded-t-lg">
                {Array.from({ length: cols }).map((_, i) => (
                     <Skeleton key={i} className="h-6 flex-1" />
                ))}
             </div>

             {/* Table Rows */}
             <div className="space-y-2">
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="flex gap-4 p-4 border-b border-gray-100">
                         {Array.from({ length: cols }).map((_, c) => (
                             <Skeleton key={c} className="h-4 flex-1" />
                        ))}
                    </div>
                ))}
             </div>
        </div>
    );
};
