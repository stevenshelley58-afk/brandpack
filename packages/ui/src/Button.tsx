import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Optional icon before text */
  iconBefore?: React.ReactNode;
  /** Optional icon after text */
  iconAfter?: React.ReactNode;
}

/**
 * Button - Interactive control element
 * 
 * Provides clear, accessible buttons with multiple variants and states.
 * Always includes proper ARIA attributes and keyboard navigation.
 * 
 * @example
 * <Button variant="primary" onClick={handleClick}>
 *   Save Changes
 * </Button>
 * 
 * <Button variant="secondary" loading>
 *   Processing...
 * </Button>
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconBefore,
  iconAfter,
  className = '',
  ...props
}: ButtonProps) {
  // Base classes
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2';

  // Variant classes
  const variantClasses = {
    primary: `
      bg-blue-600 hover:bg-blue-700 active:bg-blue-800
      text-white
      border border-transparent
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-gray-200 hover:bg-gray-300 active:bg-gray-400
      dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500
      text-gray-900 dark:text-gray-100
      border border-gray-300 dark:border-gray-600
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 active:bg-gray-200
      dark:hover:bg-gray-800 dark:active:bg-gray-700
      text-gray-700 dark:text-gray-300
      border border-transparent
    `,
    danger: `
      bg-red-600 hover:bg-red-700 active:bg-red-800
      text-white
      border border-transparent
      shadow-sm hover:shadow-md
    `,
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Disabled/loading classes
  const stateClasses = disabled || loading
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${stateClasses}
        ${widthClasses}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
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
      ) : iconBefore}
      {children}
      {!loading && iconAfter}
    </button>
  );
}

export default Button;

