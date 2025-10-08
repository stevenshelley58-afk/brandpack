import React from 'react';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Elevation level - controls shadow depth */
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Optional click handler - makes card interactive */
  onClick?: () => void;
  /** Whether card should have hover effect */
  hoverable?: boolean;
}

/**
 * Card - Surface container with elevation
 * 
 * A foundational layout component that provides visual separation
 * and hierarchy through elevation (shadows).
 * 
 * @example
 * <Card elevation="md" padding="lg">
 *   <h2>Title</h2>
 *   <p>Content</p>
 * </Card>
 */
export function Card({
  children,
  className = '',
  elevation = 'sm',
  padding = 'md',
  onClick,
  hoverable = false,
}: CardProps) {
  // Elevation classes
  const elevationClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  // Padding classes
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  // Interactive classes
  const interactiveClasses = onClick || hoverable
    ? 'transition-shadow duration-200 hover:shadow-lg cursor-pointer'
    : '';

  return (
    <div
      className={`
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        rounded-lg
        ${elevationClasses[elevation]}
        ${paddingClasses[padding]}
        ${interactiveClasses}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}

export default Card;

