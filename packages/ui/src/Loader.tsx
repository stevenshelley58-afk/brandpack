import React from 'react';

export interface LoaderProps {
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional label text */
  label?: string;
  /** Show loader centered in container */
  centered?: boolean;
  /** Optional className */
  className?: string;
  /** Variant - spinner or dots */
  variant?: 'spinner' | 'dots' | 'pulse';
}

/**
 * Loader - Loading state indicator
 * 
 * Provides visual feedback during asynchronous operations.
 * Multiple variants for different contexts.
 * 
 * @example
 * <Loader size="md" label="Loading ideas..." />
 * <Loader variant="dots" centered />
 * <Loader variant="pulse" size="lg" />
 */
export function Loader({
  size = 'md',
  label,
  centered = false,
  className = '',
  variant = 'spinner',
}: LoaderProps) {
  // Size classes for spinner
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  // Text size for label
  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  // Spinner component
  const Spinner = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-blue-600 dark:text-blue-400`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Dots component
  const Dots = () => {
    const dotSize = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
      xl: 'w-3 h-3',
    };

    return (
      <div className="flex gap-1.5" aria-hidden="true">
        <div className={`${dotSize[size]} bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]`} />
        <div className={`${dotSize[size]} bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]`} />
        <div className={`${dotSize[size]} bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce`} />
      </div>
    );
  };

  // Pulse component
  const Pulse = () => (
    <div className={`${sizeClasses[size]} bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse`} aria-hidden="true" />
  );

  const LoaderVariant = variant === 'spinner' ? Spinner : variant === 'dots' ? Dots : Pulse;

  const content = (
    <div
      className={`
        inline-flex flex-col items-center gap-3
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="status"
      aria-live="polite"
    >
      <LoaderVariant />
      {label && (
        <span className={`text-gray-600 dark:text-gray-400 font-medium ${labelSizeClasses[size]}`}>
          {label}
        </span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[200px] w-full">
        {content}
      </div>
    );
  }

  return content;
}

export default Loader;

