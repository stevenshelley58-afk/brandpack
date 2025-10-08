import React, { useState } from 'react';

export interface Tab {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Tab content */
  content: React.ReactNode;
  /** Optional badge count */
  badge?: number;
  /** Disabled state */
  disabled?: boolean;
}

export interface TabsProps {
  /** Array of tab definitions */
  tabs: Tab[];
  /** Currently active tab ID (controlled) */
  activeTabId?: string;
  /** Callback when tab changes */
  onChange?: (tabId: string) => void;
  /** Optional className */
  className?: string;
  /** Variant style */
  variant?: 'underline' | 'pills';
}

/**
 * Tabs - Tab navigation pattern
 * 
 * Provides horizontal navigation between related content sections.
 * Can be controlled or uncontrolled.
 * 
 * @example
 * <Tabs
 *   tabs={[
 *     { id: 'review', label: 'Review', content: <ReviewPanel /> },
 *     { id: 'ideas', label: 'Ideas', content: <IdeasPanel />, badge: 20 },
 *   ]}
 *   onChange={(id) => console.log('Switched to', id)}
 * />
 */
export function Tabs({
  tabs,
  activeTabId: controlledActiveId,
  onChange,
  className = '',
  variant = 'underline',
}: TabsProps) {
  // Uncontrolled state
  const [uncontrolledActiveId, setUncontrolledActiveId] = useState(tabs[0]?.id || '');
  
  // Use controlled or uncontrolled value
  const activeId = controlledActiveId !== undefined ? controlledActiveId : uncontrolledActiveId;
  
  const handleTabClick = (tabId: string, disabled?: boolean) => {
    if (disabled) return;
    
    if (onChange) {
      onChange(tabId);
    } else {
      setUncontrolledActiveId(tabId);
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeId);

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        className={`
          flex gap-1
          ${variant === 'underline' ? 'border-b border-gray-200 dark:border-gray-800' : ''}
          ${variant === 'pills' ? 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg' : ''}
        `.trim().replace(/\s+/g, ' ')}
        role="tablist"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          
          // Underline variant styles
          const underlineStyles = variant === 'underline'
            ? isActive
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
            : '';

          // Pills variant styles
          const pillsStyles = variant === 'pills'
            ? isActive
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            : '';

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab.id, tab.disabled)}
              className={`
                px-4 py-2.5
                font-medium text-sm
                transition-all duration-200
                ${underlineStyles}
                ${pillsStyles}
                ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${variant === 'pills' ? 'rounded-md' : ''}
                inline-flex items-center gap-2
              `.trim().replace(/\s+/g, ' ')}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={`
                    px-1.5 py-0.5 text-xs rounded-full
                    ${isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }
                  `.trim().replace(/\s+/g, ' ')}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          className="mt-6"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}

export default Tabs;

