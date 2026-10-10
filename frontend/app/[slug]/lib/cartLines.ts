import type { StoredConfiguration } from './customization';

/**
 * One cart line = one dish with one set of choices. Half and Full of the same dish, or the same dish with
 * different options, are separate lines; adding the same choices again adds to that line's quantity.
 */
export type CartEntry = {
  key: string;
  itemId: string;
  quantity: number;
  config: StoredConfiguration;
  /** Bumped every time this line is added to; "Repeat last" repeats the highest. */
  touched: number;
};

export function lineKey(itemId: string, config: StoredConfiguration) {
  const options = config.options
    .map(option => option.variantId + ':' + [...option.optionIds].sort().join(','))
    .sort()
    .join(';');
  return [itemId, config.portion, config.sizeId ?? '', options].join('|');
}

let clock = 0;

/** Adds one of the dish with these choices: to its existing line if the choices match, else as a new line. */
export function addLine(lines: CartEntry[], itemId: string, config: StoredConfiguration): CartEntry[] {
  const key = lineKey(itemId, config);
  const touched = ++clock;
  if (lines.some(line => line.key === key)) {
    return lines.map(line => (line.key === key ? { ...line, quantity: line.quantity + 1, touched } : line));
  }
  return [...lines, { key, itemId, quantity: 1, config, touched }];
}

export function setLineQuantity(lines: CartEntry[], key: string, quantity: number): CartEntry[] {
  if (quantity < 1) return lines.filter(line => line.key !== key);
  return lines.map(line => (line.key === key ? { ...line, quantity, touched: ++clock } : line));
}

/** Total quantity of each dish across its lines, for the + / − on menu cards. */
export function quantitiesByItem(lines: CartEntry[]) {
  return lines.reduce<Record<string, number>>((all, line) => {
    all[line.itemId] = (all[line.itemId] ?? 0) + line.quantity;
    return all;
  }, {});
}

export function linesOf(lines: CartEntry[], itemId: string) {
  return lines.filter(line => line.itemId === itemId);
}

/** The line of this dish that was added to most recently. */
export function lastLineOf(lines: CartEntry[], itemId: string) {
  return linesOf(lines, itemId).reduce<CartEntry | undefined>((last, line) => (!last || line.touched > last.touched ? line : last), undefined);
}
