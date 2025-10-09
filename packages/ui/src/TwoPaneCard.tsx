import React, { useState } from 'react';
import { Card } from './Card';

export interface TwoPaneCardProps {
  /** Left pane content */
  before: React.ReactNode;
  /** Right pane content */
  after: React.ReactNode;
  /** Left pane title */
  beforeTitle?: string;
  /** Right pane title */
  afterTitle?: string;
  /** Left pane subtitle/description */
  beforeSubtitle?: string;
  /** Right pane subtitle/description */
  afterSubtitle?: string;
  /** Optional className */
  className?: string;
  /** Allow collapsing panes */
  collapsible?: boolean;
  /** Initially show both panes */
  defaultExpanded?: boolean;
  /** Vertical stacking on mobile */
  stackOnMobile?: boolean;
}

/**
 * TwoPaneCard - Split comparison layout
 * 
 * Perfect for showing before/after copy, or any side-by-side comparison.
 * Can collapse to show only "before" state with expansion to "after".
 * 
 * @example
 * <TwoPaneCard
 *   beforeTitle="Short Version (90 chars)"
 *   before={<p>Your CRM just crashed. Stop losing deals.</p>}
 *   afterTitle="Full Version (300 chars)"
 *   after={<p>Your CRM just crashed. Stop losing deals to downtime...</p>}
 *   collapsible
 * />
 */
export function TwoPaneCard({
  before,
  after,
  beforeTitle = 'Before',
  afterTitle = 'After',
  beforeSubtitle,
  afterSubtitle,
  className = '',
  collapsible = false,
  defaultExpanded = true,
  stackOnMobile = true,
}: TwoPaneCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const renderPane = (
    content: React.ReactNode,
    title: string,
    subtitle?: string
  ) => (
    <div className="flex-1 min-w-0">
      <div className="mb-3">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {title}
        </h4>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      <div className="text-gray-700 dark:text-gray-300">
        {content}
      </div>
    </div>
  );

  return (
    <Card className={className} padding="lg">
      {collapsible && !isExpanded ? (
        // Collapsed state - show only before
        <div>
          {renderPane(before, beforeTitle, beforeSubtitle)}
          
          <button
            onClick={() => setIsExpanded(true)}
            className="
              mt-4 px-4 py-2
              text-sm font-medium
              text-blue-600 dark:text-blue-400
              hover:text-blue-700 dark:hover:text-blue-300
              hover:bg-blue-50 dark:hover:bg-blue-900/20
              rounded-lg
              transition-colors duration-200
              inline-flex items-center gap-2
            "
            aria-label="Show full version"
          >
            <span>See More</span>
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ) : (
        // Expanded state - show both panes
        <>
          <div
            className={`
              flex gap-6
              ${stackOnMobile ? 'flex-col md:flex-row' : 'flex-row'}
            `.trim().replace(/\s+/g, ' ')}
          >
            {/* Before Pane */}
            {renderPane(before, beforeTitle, beforeSubtitle)}

            {/* Divider */}
            <div
              className={`
                ${stackOnMobile ? 'hidden md:block w-px' : 'w-px'}
                bg-gray-200 dark:bg-gray-800
                self-stretch
              `.trim().replace(/\s+/g, ' ')}
              aria-hidden="true"
            />

            {/* After Pane */}
            {renderPane(after, afterTitle, afterSubtitle)}
          </div>

          {collapsible && (
            <button
              onClick={() => setIsExpanded(false)}
              className="
                mt-4 px-4 py-2
                text-sm font-medium
                text-gray-600 dark:text-gray-400
                hover:text-gray-700 dark:hover:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-800
                rounded-lg
                transition-colors duration-200
                inline-flex items-center gap-2
              "
              aria-label="Show less"
            >
              <span>See Less</span>
              <svg
                className="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </>
      )}
    </Card>
  );
}

export default TwoPaneCard;

