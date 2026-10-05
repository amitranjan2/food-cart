'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MenuItem } from '../../lib/api';
import { MenuItemCard } from './MenuItemCard';

// Survives Menu unmounting (cart open/close) so a revealed special stays revealed.
const revealedIds = new Set<string>();

export function SpecialCarousel({
  items,
  quantities,
  fallbackImage,
  onAdd,
  onQuantity,
}: {
  items: MenuItem[];
  quantities: Record<string, number>;
  fallbackImage?: string;
  onAdd: (item: MenuItem) => void;
  onQuantity: (item: MenuItem, quantity: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const settle = useRef(0);
  const [revealed, setRevealed] = useState(() => new Set(revealedIds));
  const copies = items.length > 1 ? 3 : 1;
  const slots = Array.from({ length: copies }, (_, copy) => items.map(item => ({ item, copy }))).flat();

  const cardsOf = (row: HTMLDivElement) => row.querySelectorAll<HTMLElement>('.special-slot');

  const layout = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const cards = cardsOf(row);
    if (cards.length === 0) return;
    const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;
    const center = row.scrollLeft + row.clientWidth / 2;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let changed = false;
    cards.forEach(card => {
      const offset = (card.offsetLeft + card.offsetWidth / 2 - center) / step;
      const distance = Math.min(Math.abs(offset), 2.5);
      const turn = Math.max(-42, Math.min(42, -offset * 30));
      card.style.transform = calm
        ? `scale(${1 - distance * 0.1})`
        : `perspective(900px) translateX(${-offset * 16}px) rotateY(${turn}deg) scale(${1 - distance * 0.14})`;
      card.style.zIndex = String(100 - Math.round(distance * 10));
      card.style.opacity = String(1 - Math.max(0, distance - 1) * 0.35);
      const id = card.dataset.id;
      if (id && distance < 0.3 && !revealedIds.has(id)) {
        revealedIds.add(id);
        changed = true;
      }
    });
    if (changed) setRevealed(new Set(revealedIds));
  }, []);

  const recenter = useCallback(() => {
    const row = rowRef.current;
    if (!row || copies < 3) return;
    const cards = cardsOf(row);
    const count = items.length;
    if (cards.length < count * 3) return;
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    const setWidth = cards[count].offsetLeft - cards[0].offsetLeft;
    const center = row.scrollLeft + row.clientWidth / 2;
    const index = Math.round((center - (cards[0].offsetLeft + cards[0].offsetWidth / 2)) / step);
    if (index < count) row.scrollLeft += setWidth;
    else if (index >= count * 2) row.scrollLeft -= setWidth;
  }, [copies, items.length]);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const cards = cardsOf(row);
    const start = cards[copies === 3 ? items.length : 0];
    if (start) row.scrollLeft = start.offsetLeft + start.offsetWidth / 2 - row.clientWidth / 2;
    layout();
  }, [items, copies, layout]);

  useEffect(() => {
    window.addEventListener('resize', layout);
    return () => {
      window.removeEventListener('resize', layout);
      cancelAnimationFrame(frame.current);
      window.clearTimeout(settle.current);
    };
  }, [layout]);

  function onScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(layout);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(recenter, 140);
  }

  return (
    <div className="hero-row special-row" ref={rowRef} onScroll={onScroll} aria-label="Specials">
      {slots.map(({ item, copy }) => (
        <div
          key={copy + '-' + item.id}
          className={'special-slot' + (revealed.has(item.id) ? ' revealed' : '')}
          data-id={item.id}
          aria-hidden={copies === 1 || copy === 1 ? undefined : true}
        >
          <MenuItemCard
            item={item}
            variant="feature"
            fallbackImage={fallbackImage}
            quantity={quantities[item.id] || 0}
            onAdd={() => onAdd(item)}
            onQuantity={next => onQuantity(item, next)}
          />
        </div>
      ))}
    </div>
  );
}
