'use client';

import { useEffect, useState } from 'react';
import type { MenuCategory } from '../../lib/api';

export function CategoryMenu({
  categories,
  counts,
  selectedId,
  raised,
  onSelect,
}: {
  categories: MenuCategory[];
  counts: Record<string, number>;
  selectedId: string | null;
  raised?: boolean;
  onSelect: (categoryId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pastCategories, setPastCategories] = useState(false);

  useEffect(() => {
    function check() {
      const section = document.getElementById('store-categories');
      const dock = document.querySelector('.store-search-dock');
      const top = dock ? dock.getBoundingClientRect().bottom : 0;
      setPastCategories(!section || section.getBoundingClientRect().bottom <= top);
    }
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [categories]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (categories.length === 0) return null;

  return (
    <div className={'cat-pop' + (raised ? ' raised' : '') + (pastCategories || open ? ' shown' : '')} aria-hidden={pastCategories || open ? undefined : true}>
      {open && <button type="button" className="cat-backdrop" aria-label="Close categories" onClick={() => setOpen(false)} />}
      <div className={'cat-pop-panel' + (open ? ' open' : '')}>
        {open && (
          <ul aria-label="Menu categories">
            {categories.map(category => (
              <li key={category.id}>
                <button
                  type="button"
                  aria-current={category.id === selectedId ? 'true' : undefined}
                  onClick={() => {
                    onSelect(category.id);
                    setOpen(false);
                  }}
                >
                  <span>{category.name}</span>
                  <span>{counts[category.id] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="cat-fab"
          aria-expanded={open}
          aria-label={open ? 'Close menu categories' : 'Open menu categories'}
          onClick={() => setOpen(value => !value)}
        >
          <span className={'menu-flip' + (open ? ' is-open' : '')}>
            <img src="/menu-utensils.png" alt="" />
          </span>
        </button>
      </div>
    </div>
  );
}
