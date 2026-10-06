import type { MenuItem } from '../../lib/api';

/**
 * Customization groups are not on the public menu API yet.
 * Full (and Half, when the item has halfPrice) come from the catalog.
 * Large and the vegetable add-ons are local stand-ins marked source: "mock"
 * so the screen can later read a modifiers payload without changing the UI.
 */
export type CustomizationSource = 'catalog' | 'mock';

export type CustomizationChoice = {
  id: string;
  name: string;
  price: number;
  source: CustomizationSource;
  foodType?: MenuItem['foodType'];
};

export type CustomizationGroup = {
  id: string;
  name: string;
  selection: 'single' | 'multiple';
  source: CustomizationSource;
  choices: CustomizationChoice[];
};

export type ItemCustomization = {
  groups: CustomizationGroup[];
};

export type StoredConfiguration = {
  sizeId: string;
  addonIds: string[];
  unitPrice: number;
  summary: string;
  barLabel: string;
};

const MOCK_VEGETABLES: CustomizationChoice[] = [
  { id: 'tomato', name: 'Tomato', price: 10, source: 'mock', foodType: 'VEG' },
  { id: 'onion', name: 'Onion', price: 10, source: 'mock', foodType: 'VEG' },
  { id: 'lettuce', name: 'Lettuce', price: 15, source: 'mock', foodType: 'VEG' },
];

const MOCK_SIDES: CustomizationChoice[] = [
  { id: 'coke', name: 'Coke', price: 30, source: 'mock' },
  { id: 'lassi', name: 'Lassi', price: 40, source: 'mock' },
  { id: 'lemonade', name: 'Lemonade', price: 35, source: 'mock' },
];

export function formatRupee(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `₹${rounded}` : `₹${rounded.toFixed(2)}`;
}

export function customizationFor(item: MenuItem): ItemCustomization {
  const full = Number(item.price);
  const halfFromCatalog = item.halfPrice != null && item.halfAvailable !== false;
  const half = halfFromCatalog ? Number(item.halfPrice) : Math.round(full / 2);
  const step = Math.max(full - half, Math.round(full * 0.35));
  const large = Math.round(full + step);

  return {
    groups: [
      {
        id: 'size',
        name: 'Choose Size',
        selection: 'single',
        source: 'catalog',
        choices: [
          { id: 'half', name: 'Half', price: half, source: halfFromCatalog ? 'catalog' : 'mock' },
          { id: 'full', name: 'Full', price: full, source: 'catalog' },
          { id: 'large', name: 'Large', price: large, source: 'mock' },
        ],
      },
      {
        id: 'vegetables',
        name: 'Vegetables',
        selection: 'multiple',
        source: 'mock',
        choices: MOCK_VEGETABLES,
      },
      {
        id: 'sides',
        name: 'Sides',
        selection: 'single',
        source: 'mock',
        choices: MOCK_SIDES,
      },
    ],
  };
}

export function initialSelection(spec: ItemCustomization): Record<string, string[]> {
  const selected: Record<string, string[]> = {};
  for (const group of spec.groups) {
    if (group.selection === 'single') {
      const preferred =
        group.id === 'size'
          ? group.choices.find(choice => choice.id === 'full') ?? group.choices[0]
          : group.choices[0];
      selected[group.id] = preferred ? [preferred.id] : [];
    } else {
      selected[group.id] = [];
    }
  }
  return selected;
}

export function configurationFrom(
  item: MenuItem,
  spec: ItemCustomization,
  selected: Record<string, string[]>,
): StoredConfiguration {
  const sizeGroup = spec.groups.find(group => group.id === 'size');
  const size = sizeGroup?.choices.find(choice => selected[sizeGroup.id]?.includes(choice.id)) ?? sizeGroup?.choices[0];
  const sideGroup = spec.groups.find(group => group.id === 'sides');
  const side = sideGroup?.choices.find(choice => selected[sideGroup.id]?.includes(choice.id));
  const addons = spec.groups
    .filter(group => group.selection === 'multiple')
    .flatMap(group => group.choices.filter(choice => selected[group.id]?.includes(choice.id)));
  const unitPrice =
    (size?.price ?? Number(item.price))
    + addons.reduce((sum, choice) => sum + choice.price, 0)
    + (side?.price ?? 0);
  const addonLabel = addons.map(choice => choice.name).join(', ');
  const sizeName = size?.name ?? 'Full';
  const detail = [addonLabel, side?.name].filter(Boolean).join(', ');
  const summary = detail ? `${sizeName} | ${detail}` : sizeName;
  return {
    sizeId: size?.id ?? 'full',
    addonIds: addons.map(choice => choice.id),
    unitPrice,
    summary,
    barLabel: `[${item.name} | ${summary}]`,
  };
}

export function sizeDeltaLabel(choice: CustomizationChoice, baseline: number) {
  return `${choice.name} [+${formatRupee(choice.price - baseline)}]`;
}
