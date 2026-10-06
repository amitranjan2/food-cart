'use client';

import type { ReactNode } from 'react';
import type { MenuItem } from '../../lib/api';

export function CartSheet({
  lines,
  total,
  onClose,
  onQuantity,
  children,
}: {
  lines: { item: MenuItem; quantity: number; unitPrice: number; summary?: string }[];
  total: number;
  onClose: () => void;
  onQuantity: (item: MenuItem, quantity: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 bg-black/50 p-4">
      <div className="mx-auto mt-12 max-w-lg rounded-[28px] bg-white p-5">
        <button type="button" onClick={onClose} className="float-right">✕</button>
        <h2 className="text-3xl">Your cart</h2>
        {lines.map(line => (
          <div className="mt-4 flex items-center justify-between gap-3" key={line.item.id}>
            <span className="min-w-0 flex-1">
              {line.item.name}
              <small className="block truncate">{line.summary ? `${line.summary} · ` : ''}₹{line.unitPrice}</small>
            </span>
            <span className="shrink-0">
              <button type="button" onClick={() => onQuantity(line.item, line.quantity - 1)}>−</button>
              {' '}{line.quantity}{' '}
              <button type="button" onClick={() => onQuantity(line.item, line.quantity + 1)}>+</button>
            </span>
          </div>
        ))}
        <hr className="my-5" />
        <b>Total ₹{total}</b>
        {children}
      </div>
    </div>
  );
}
