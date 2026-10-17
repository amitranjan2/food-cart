'use client';

import { useState } from 'react';
import type { MenuItem } from '../../lib/api';
import { foodMark } from '../lib/foodMark';

export function MenuItemCard({
  item,
  quantity,
  variant,
  fallbackImage,
  onAdd,
  onQuantity,
}: {
  item: MenuItem;
  quantity: number;
  variant: 'feature' | 'compact';
  fallbackImage?: string;
  onAdd: () => void;
  onQuantity: (quantity: number) => void;
}) {
  const [broken, setBroken] = useState(false);
  const mark = foodMark(item.foodType);
  const photo = item.imageUrl || fallbackImage;

  return (
    <article id={'menu-item-' + item.id} className={'dish-card ' + (variant === 'feature' ? 'dish-feature' : 'dish-compact')}>
      <div className="media">
        {photo && !broken ? (
          <img src={photo} alt="" onError={() => setBroken(true)} />
        ) : (
          <span className="media-fallback" />
        )}
        {mark && (
          <span className="food-mark" style={{ color: mark.color }}>
            <i />
            <span className="sr-only">{mark.label}</span>
          </span>
        )}
      </div>
      <h3 className="clamp">{item.name}</h3>
      <p className="dish-copy">{item.description}</p>
      <footer className="dish-foot">
        <b>₹{item.price}</b>
        {quantity > 0 ? (
          <span className="qty">
            <button type="button" aria-label={'Remove one ' + item.name} onClick={() => onQuantity(quantity - 1)}>−</button>
            <span>{quantity}</span>
            <button type="button" aria-label={'Add one ' + item.name} onClick={() => onQuantity(quantity + 1)} disabled={!item.available}>+</button>
          </span>
        ) : item.available ? (
          <button type="button" className="add-btn" onClick={onAdd}>ADD</button>
        ) : (
          <span className="sold-out">SOLD OUT</span>
        )}
      </footer>
    </article>
  );
}
