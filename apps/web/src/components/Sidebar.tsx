'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface SidebarProps {
  /** Navigation items */
  items: NavItem[];
  /** Mobile menu open state */
  mobileOpen?: boolean;
  /** Callback when mobile menu should close */
  onMobileClose?: () => void;
}

/**
 * Sidebar - Application navigation
 * 
 * Persistent navigation sidebar with route highlighting.
 * Collapses to overlay on mobile.
 */
export function Sidebar({ items, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 z-30
          w-64 bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `.trim().replace(/\s+/g, ' ')}
      >
        <nav className="h-full overflow-y-auto p-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={`
                      flex items-center gap-3 px-3 py-2.5
                      rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `.trim().replace(/\s+/g, ' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {/* Icon */}
                    <span className="w-5 h-5 flex-shrink-0">
                      {item.icon}
                    </span>
                    
                    {/* Label */}
                    <span className="flex-1 text-sm">
                      {item.label}
                    </span>
                    
                    {/* Badge */}
                    {item.badge !== undefined && (
                      <span
                        className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${isActive
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }
                        `.trim().replace(/\s+/g, ' ')}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;

