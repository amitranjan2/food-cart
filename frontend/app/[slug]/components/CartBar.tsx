'use client';

export function CartBar({
  itemCount,
  total,
  onOpen,
}: {
  itemCount: number;
  total: number;
  onOpen: () => void;
}) {
  return (
    <button type="button" onClick={onOpen} className="store-cartbar">
      <b>{itemCount} {itemCount === 1 ? 'item' : 'items'}</b>
      <span>₹{total} →</span>
    </button>
  );
}
