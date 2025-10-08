import React, { useState } from 'react';

export interface AccordionItem {
  /** Unique identifier */
  id: string;
  /** Header/trigger text */
  title: string;
  /** Accordion content */
  content: React.ReactNode;
  /** Optional badge or status indicator */
  badge?: React.ReactNode;
  /** Initially expanded */
  defaultExpanded?: boolean;
}

export interface AccordionProps {
  /** Array of accordion items */
  items: AccordionItem[];
  /** Allow multiple items open at once */
  allowMultiple?: boolean;
  /** Optional className */
  className?: string;
  /** Variant style */
  variant?: 'bordered' | 'separated';
}

/**
 * Accordion - Collapsible content sections
 * 
 * Perfect for Control Console where each call config (A-E groups)
 * can be collapsed to save space. Supports single or multiple expansion.
 * 
 * @example
 * <Accordion
 *   items={[
 *     { id: 'prompt', title: 'A) Prompt', content: <PromptEditor /> },
 *     { id: 'model', title: 'B) Model', content: <ModelSelector /> },
 *   ]}
 *   allowMultiple
 * />
 */
export function Accordion({
  items,
  allowMultiple = false,
  className = '',
  variant = 'bordered',
}: AccordionProps) {
  // Track which items are expanded
  const initialExpanded = items
    .filter(item => item.defaultExpanded)
    .map(item => item.id);
    
  const [expandedIds, setExpandedIds] = useState<string[]>(initialExpanded);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setExpandedIds(prev =>
        prev.includes(id)
          ? prev.filter(itemId => itemId !== id)
          : [...prev, id]
      );
    } else {
      setExpandedIds(prev =>
        prev.includes(id) ? [] : [id]
      );
    }
  };

  const containerClass = variant === 'separated'
    ? 'space-y-3'
    : 'border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-800';

  return (
    <div className={`${containerClass} ${className}`}>
      {items.map((item, index) => {
        const isExpanded = expandedIds.includes(item.id);
        
        const itemClass = variant === 'separated'
          ? 'border border-gray-200 dark:border-gray-800 rounded-lg'
          : '';

        return (
          <div key={item.id} className={itemClass}>
            {/* Header */}
            <button
              onClick={() => toggleItem(item.id)}
              aria-expanded={isExpanded}
              aria-controls={`accordion-content-${item.id}`}
              id={`accordion-header-${item.id}`}
              className={`
                w-full px-4 py-3
                flex items-center justify-between
                text-left
                transition-colors duration-200
                hover:bg-gray-50 dark:hover:bg-gray-800
                ${variant === 'separated' || index === 0 ? 'rounded-t-lg' : ''}
                ${variant === 'separated' && !isExpanded ? 'rounded-b-lg' : ''}
              `.trim().replace(/\s+/g, ' ')}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {item.title}
                </span>
                {item.badge && (
                  <span>{item.badge}</span>
                )}
              </div>
              
              {/* Chevron icon */}
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Content */}
            {isExpanded && (
              <div
                id={`accordion-content-${item.id}`}
                role="region"
                aria-labelledby={`accordion-header-${item.id}`}
                className={`
                  px-4 py-4
                  border-t border-gray-200 dark:border-gray-800
                  ${variant === 'separated' ? 'rounded-b-lg' : ''}
                `.trim().replace(/\s+/g, ' ')}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Accordion;

