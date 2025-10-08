'use client';

import React from 'react';

export interface TopbarProps {
  /** Optional user information */
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  /** Callback when user menu is clicked */
  onUserMenuClick?: () => void;
  /** Callback for mobile menu toggle */
  onMobileMenuToggle?: () => void;
}

/**
 * Topbar - Application header
 * 
 * Fixed header with logo, branding, and user menu.
 * Responsive with mobile menu toggle.
 */
export function Topbar({ user, onUserMenuClick, onMobileMenuToggle }: TopbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMobileMenuToggle}
            className="
              lg:hidden p-2
              text-gray-600 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800
              rounded-lg transition-colors duration-200
            "
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Brand Pack
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Creative Automation
              </p>
            </div>
          </div>
        </div>

        {/* Right: User menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={onUserMenuClick}
              className="
                flex items-center gap-3 px-3 py-2
                hover:bg-gray-100 dark:hover:bg-gray-800
                rounded-lg transition-colors duration-200
              "
              aria-label="User menu"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={onUserMenuClick}
              className="
                px-4 py-2
                bg-blue-600 hover:bg-blue-700
                text-white text-sm font-medium
                rounded-lg transition-colors duration-200
              "
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;

