'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export function StoreHeader({ children }: { children: ReactNode }) {
  return (
    <div className="store-header-top">
      <div className="store-eta" aria-label="25 Mins">
        <span className="store-eta-num">25</span>
        <span className="store-eta-unit">Mins</span>
      </div>
      {children}
    </div>
  );
}

export function StoreSearch({
  query,
  onQueryChange,
  onClose,
  headerRef,
  measureRef,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onClose?: () => void;
  headerRef: RefObject<HTMLDivElement | null>;
  measureRef?: RefObject<HTMLDivElement>;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [dockHeight, setDockHeight] = useState(0);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    function sync() {
      const node = dockRef.current;
      if (!node) return;
      setDockHeight(node.offsetHeight);
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      setPinned(headerBottom <= 0);
    }

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    const observer = new ResizeObserver(sync);
    observer.observe(dock);
    if (headerRef.current) observer.observe(headerRef.current);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      observer.disconnect();
    };
  }, [headerRef]);

  return (
    <div
      ref={measureRef}
      className="store-search-anchor"
      style={pinned && dockHeight > 0 ? { height: dockHeight } : undefined}
    >
      <div ref={dockRef} className={'store-search-dock' + (pinned ? ' pinned' : '')}>
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
    </div>
  );
}
