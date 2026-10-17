import type { MenuItem } from '../../lib/api';

export type CustomizationChoice = {
  id: string;
  name: string;
  price: number;
  foodType?: MenuItem['foodType'];
};

export type CustomizationGroup = {
  id: string;
  name: string;
  selection: 'single' | 'multiple';
  required: boolean;
  kind: 'size' | 'portion' | 'variant';
  choices: CustomizationChoice[];
};

export type ItemCustomization = {
  groups: CustomizationGroup[];
  basePrice: number;
};

export type StoredOption = {
  variantId: string;
  optionIds: string[];
};

export type StoredConfiguration = {
  sizeId?: string;
  portion: 'HALF' | 'FULL';
  options: StoredOption[];
  unitPrice: number;
  summary: string;
  barLabel: string;
};

export function formatRupee(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `₹${rounded}` : `₹${rounded.toFixed(2)}`;
}

export function customizationFor(item: MenuItem): ItemCustomization {
  const groups: CustomizationGroup[] = [];
  const basePrice = Number(item.price);
  const sizes = (item.sizes ?? []).filter(size => size.id && size.name);
  if (sizes.length > 0) {
    groups.push({
      id: 'size',
      name: 'Choose Size',
      selection: 'single',
      required: true,
      kind: 'size',
      choices: sizes.map(size => ({
        id: size.id as string,
        name: size.name,
        price: Number(size.price) || 0,
      })),
    });
  } else if (item.halfPrice != null && item.halfAvailable !== false) {
    groups.push({
      id: 'portion',
      name: 'Choose Size',
      selection: 'single',
      required: true,
      kind: 'portion',
      choices: [
        { id: 'half', name: 'Half', price: Number(item.halfPrice) },
        { id: 'full', name: 'Full', price: basePrice },
      ],
    });
  }

  for (const variant of item.variants ?? []) {
    const options = (variant.options ?? []).filter(option => option.id && option.name);
    if (!variant.id || options.length === 0) continue;
    groups.push({
      id: variant.id,
      name: variant.name,
      selection: variant.selection === 'MULTIPLE' ? 'multiple' : 'single',
      required: variant.required,
      kind: 'variant',
      choices: options.map(option => ({
        id: option.id as string,
        name: option.name,
        price: variant.priceIncreases ? Number(option.price) || 0 : 0,
        foodType: option.foodType,
      })),
    });
  }

  return { groups, basePrice };
}

export function initialSelection(spec: ItemCustomization): Record<string, string[]> {
  const selected: Record<string, string[]> = {};
  for (const group of spec.groups) {
    selected[group.id] = [];
  }
  return selected;
}

export function autoSelection(spec: ItemCustomization): Record<string, string[]> {
  const selected: Record<string, string[]> = {};
  for (const group of spec.groups) {
    selected[group.id] = group.choices.length === 1 ? [group.choices[0].id] : [];
  }
  return selected;
}

export function needsCustomization(spec: ItemCustomization) {
  return spec.groups.some(group => group.choices.length > 1);
}

export function selectionReady(spec: ItemCustomization, selected: Record<string, string[]>) {
  return spec.groups.every(group => !group.required || (selected[group.id]?.length ?? 0) > 0);
}

export function configurationFrom(
  item: MenuItem,
  spec: ItemCustomization,
  selected: Record<string, string[]>,
): StoredConfiguration {
  const sizeGroup = spec.groups.find(group => group.kind === 'size');
  const portionGroup = spec.groups.find(group => group.kind === 'portion');
  const size = sizeGroup?.choices.find(choice => selected[sizeGroup.id]?.includes(choice.id));
  const portionChoice = portionGroup?.choices.find(choice => selected[portionGroup.id]?.includes(choice.id));

  let unitPrice = spec.basePrice;
  let portion: StoredConfiguration['portion'] = 'FULL';
  let sizeName = '';
  if (size) {
    unitPrice += size.price;
    sizeName = size.name;
  } else if (portionChoice) {
    unitPrice = portionChoice.price;
    portion = portionChoice.id === 'half' ? 'HALF' : 'FULL';
    sizeName = portionChoice.name;
  }

  const options: StoredOption[] = [];
  const optionNames: string[] = [];
  for (const group of spec.groups) {
    if (group.kind !== 'variant') continue;
    const chosen = group.choices.filter(choice => selected[group.id]?.includes(choice.id));
    if (chosen.length === 0) continue;
    options.push({ variantId: group.id, optionIds: chosen.map(choice => choice.id) });
    for (const choice of chosen) {
      unitPrice += choice.price;
      optionNames.push(choice.name);
    }
  }

  const summary = [sizeName, optionNames.join(', ')].filter(Boolean).join(' | ');
  return {
    sizeId: size?.id,
    portion,
    options,
    unitPrice: Math.round(unitPrice * 100) / 100,
    summary,
    barLabel: summary ? `[${item.name} | ${summary}]` : `[${item.name}]`,
  };
}
