'use client';

import type { ReactNode } from 'react';

export function StoreHeader({
  children,
  query,
  onQueryChange,
  onClose,
}: {
  children: ReactNode;
  query: string;
  onQueryChange: (query: string) => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="store-header-top">
        <div className="store-eta" aria-label="25 Mins">
          <span className="store-eta-num">25</span>
          <span className="store-eta-unit">Mins</span>
        </div>
        {children}
      </div>
      <div className="store-search-dock">
        <label className="store-search">
          <input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            aria-label="Search menu"
            placeholder="Search menu"
            tabIndex={onClose ? -1 : undefined}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30404e" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </label>
        <div className="store-scallop" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
        </div>
      </div>
    </>
  );
}
