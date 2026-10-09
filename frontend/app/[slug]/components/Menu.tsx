'use client';

import type { ReactNode } from 'react';
import type { MenuCategory, MenuItem } from '../../lib/api';
import { MenuItemCard } from './MenuItemCard';
import { SpecialCarousel } from './SpecialCarousel';

function sectionsFor(items: MenuItem[], categories: MenuCategory[]) {
  const known = new Set(categories.map(category => category.id));
  const grouped = new Map<string, MenuItem[]>();
  const loose: MenuItem[] = [];
  for (const item of items) {
    if (item.categoryId && known.has(item.categoryId)) {
      const list = grouped.get(item.categoryId) ?? [];
      list.push(item);
      grouped.set(item.categoryId, list);
    } else {
      loose.push(item);
    }
  }
  const sections = categories
    .filter(category => grouped.has(category.id))
    .map(category => ({ id: category.id, name: category.name, items: grouped.get(category.id) ?? [] }));
  if (loose.length > 0) {
    sections.push({ id: 'more', name: categories.length > 0 ? 'More' : 'Menu', items: loose });
  }
  return sections;
}

function DishRow({
  items,
  variant,
  quantities,
  fallbackImage,
  onAdd,
  onQuantity,
  className,
  label,
}: {
  items: MenuItem[];
  variant: 'feature' | 'compact';
  quantities: Record<string, number>;
  fallbackImage?: string;
  onAdd: (item: MenuItem) => void;
  onQuantity: (item: MenuItem, quantity: number) => void;
  className: string;
  label: string;
}) {
  return (
    <div className={className} aria-label={label}>
      {items.map(item => (
        <MenuItemCard
          key={variant + '-' + item.id}
          item={item}
          variant={variant}
          fallbackImage={fallbackImage}
          quantity={quantities[item.id] || 0}
          onAdd={() => onAdd(item)}
          onQuantity={next => onQuantity(item, next)}
        />
      ))}
    </div>
  );
}

export function Menu({
  items,
  categories,
  quantities,
  onAdd,
  onQuantity,
  nav,
  searching,
  fallbackImage,
}: {
  items: MenuItem[];
  categories: MenuCategory[];
  quantities: Record<string, number>;
  onAdd: (item: MenuItem) => void;
  onQuantity: (item: MenuItem, quantity: number) => void;
  nav?: ReactNode;
  searching?: boolean;
  fallbackImage?: string;
}) {
  if (items.length === 0) {
    return <p className="menu-empty">{searching ? 'No dishes match your search.' : 'Nothing on the menu yet.'}</p>;
  }
  const sections = sectionsFor(items, categories);
  // The vendor stars these in the vendor app; no carousel when nothing is starred.
  const specials = items.filter(item => item.special);
  return (
    <div id="menu-start">
      {!searching && (
        <>
          {specials.length > 0 && <SpecialCarousel items={specials} quantities={quantities} fallbackImage={fallbackImage} onAdd={onAdd} onQuantity={onQuantity} />}
          <section className="menu-section" aria-label="Order again">
            <h2>ORDER AGAIN!</h2>
            <DishRow items={items} variant="compact" quantities={quantities} fallbackImage={fallbackImage} onAdd={onAdd} onQuantity={onQuantity} className="card-row" label="Order again" />
          </section>
        </>
      )}
      {nav}
      {sections.map(section => (
        <section key={section.id} id={'menu-category-' + section.id} className="menu-section" aria-label={section.name}>
          <h2>{section.name}</h2>
          <div className="card-row">
            {section.items.map(item => (
              <MenuItemCard
                key={section.id + '-' + item.id}
                item={item}
                variant="compact"
                fallbackImage={fallbackImage}
                quantity={quantities[item.id] || 0}
                onAdd={() => onAdd(item)}
                onQuantity={next => onQuantity(item, next)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
