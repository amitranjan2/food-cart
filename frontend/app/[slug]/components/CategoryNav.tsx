'use client';

import type { ReactNode } from 'react';
import type { MenuCategory } from '../../lib/api';

function glyph(name: string): ReactNode {
  const n = name.toLowerCase();
  if (n.includes('drink') || n.includes('coffee') || n.includes('tea') || n.includes('juice') || n.includes('beverage')) {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M29 28h14l-1.4 16h-11.2z" />
        <path d="M43 32h4.2a3 3 0 0 1 0 6H42" />
        <path d="M33 23c.4-2 1.8-2 2.2 0M38 23c.4-2 1.8-2 2.2 0" />
      </g>
    );
  }
  if (n.includes('roll') || n.includes('wrap') || n.includes('sandwich')) {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <rect x="23" y="30" width="26" height="12" rx="6" />
        <path d="M30 30v12M36 30v12M42 30v12" />
      </g>
    );
  }
  if (n.includes('momo') || n.includes('dumpling')) {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 34c0-5 3.4-8 7-8s7 3 7 8c0 4-3 7-7 7s-7-3-7-7z" />
        <path d="M31 31c1.2 1.4 2.6 1.4 4 0M31 34.5c1.2 1.4 2.6 1.4 4 0" />
        <path d="M40 40c2 3 5 5 9 5 3 0 5-1.4 6-3" />
        <path d="M44 37c.8 1.2 2 1.2 3 0" />
      </g>
    );
  }
  if (n.includes('rice') || n.includes('bowl') || n.includes('noodle') || n.includes('pasta')) {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M23 34h26" />
        <path d="M25 34c1 10 4.2 14 11 14s10-4 11-14" />
        <path d="M29 30c1-3 2.6-4 7-4s6 1 7 4" />
      </g>
    );
  }
  if (n.includes('thali')) {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="36" cy="36" r="12" />
        <circle cx="36" cy="32" r="3" />
        <circle cx="31" cy="40" r="2.3" />
        <circle cx="41" cy="40" r="2.3" />
      </g>
    );
  }
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <ellipse cx="36" cy="40" rx="13" ry="4.5" />
      <path d="M26 39c1-8 4.5-12 10-12s9 4 10 12" />
      <path d="M36 25v-2" />
    </g>
  );
}

export function CategoryNav({
  categories,
  selectedId,
  onSelect,
}: {
  categories: MenuCategory[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
}) {
  if (categories.length === 0) return null;
  return (
    <section className="mind" id="store-categories" aria-label="Menu categories">
      <h2>What&apos;s on your mind?</h2>
      <div className="mind-row">
        {categories.map(category => {
          const selected = category.id === selectedId;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(category.id)}
              className={'cat-chip' + (selected ? ' selected' : '')}
            >
              {category.imageUrl ? (
                // Approved category art (line drawing on a plate); categories without one get a drawn glyph.
                <img className="cat-chip-art" src={category.imageUrl} alt="" />
              ) : (
                <svg viewBox="0 0 72 72" aria-hidden="true">
                  <circle cx="36" cy="36" r="33" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="36" cy="36" r="27" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  {glyph(category.name)}
                </svg>
              )}
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
