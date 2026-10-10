import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { addCatalogCategory, createMenuItem, updateMenuItem, uploadMenuImage } from '../../api/menu';
import { CategoryPicker } from './CategoryPicker';
import { isAuthFailure, mediaUrl } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, typography } from '../../theme';
import { Button, Field, FieldButton, Icon, IconButton, Panel, Sheet, ToggleRow } from '../../ui';
import type { CustomVariant, FoodType, MenuCategory, MenuItem, MenuItemInput, SelectionMode, SizeOption } from '../../types';

const FOOD_TYPES: { value: Exclude<FoodType, 'OTHER'>; label: string }[] = [
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'VEG', label: 'Veg' },
  { value: 'NON_VEG', label: 'Non-Veg' },
  { value: 'EGG', label: 'Egg' },
];

export type DishFormMode = 'add' | 'edit';

type Props = {
  mode: DishFormMode;
  item?: MenuItem | null;
  categories: MenuCategory[];
  onClose: () => void;
  onSaved: () => void;
  /** A category this vendor just added to the shared list. */
  onCategoryAdded?: (category: MenuCategory) => void;
};

type SizeDraft = {
  key: string;
  id?: string;
  name: string;
  price: string;
};

type OptionDraft = {
  key: string;
  id?: string;
  name: string;
  foodType: Exclude<FoodType, 'OTHER'>;
  price: string;
};

type VariantDraft = {
  key: string;
  id?: string;
  name: string;
  enabled: boolean;
  required: boolean;
  selection: SelectionMode;
  priceIncreases: boolean;
  options: OptionDraft[];
};

type Picker =
  | null
  | { kind: 'category' }
  | { kind: 'food' }
  | { kind: 'option'; key: string };

export function DishFormSheet({ mode, item, categories, onClose, onSaved, onCategoryAdded }: Props) {
  const { token, logout } = useAuth();
  const keepIds = mode === 'edit';
  const startingCategory = categories.find(entry => entry.id === item?.categoryId);
  const [name, setName] = useState(item?.name ?? '');
  const [categoryLabel, setCategoryLabel] = useState(startingCategory?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(startingCategory ? item?.categoryId ?? null : null);
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [foodType, setFoodType] = useState<FoodType>(item?.foodType ?? 'VEG');
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '');
  const [sizeVariant, setSizeVariant] = useState(Boolean(item?.sizes?.length));
  const [sizes, setSizes] = useState<SizeDraft[]>(() => draftsFromSizes(item?.sizes));
  const [variants, setVariants] = useState<VariantDraft[]>(() => draftsFromVariants(item?.variants));
  const [picker, setPicker] = useState<Picker>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!item?.categoryId || categoryLabel) return;
    const category = categories.find(entry => entry.id === item.categoryId);
    if (!category) return;
    setCategoryLabel(category.name);
    setCategoryId(category.id);
  }, [categories, item?.categoryId, categoryLabel]);

  function togglePicker(next: Picker) {
    setPicker(current => (samePicker(current, next) ? null : next));
  }

  function toggleSizes() {
    setSizeVariant(on => {
      if (!on && sizes.length === 0) setSizes([blankSize()]);
      return !on;
    });
  }

  async function chooseImage() {
    if (!token) return;
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setMessage('Image upload is available in the browser for now.');
      return;
    }
    const file = await pickWebImage();
    if (!file) return;
    try {
      setBusy(true);
      setMessage('');
      const body = new FormData();
      body.append('file', file);
      setImageUrl(await uploadMenuImage(token, body));
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setMessage(e instanceof Error ? e.message : 'Could not upload image');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!token) return;
    const body = buildInput({
      name,
      categoryId,
      categoryLabel,
      categories,
      description,
      price,
      foodType,
      imageUrl,
      sizeVariant,
      sizes,
      variants,
      keepIds,
    });
    if (typeof body === 'string') {
      setMessage(body);
      setInvalid(invalidFrom(body, { sizes, variants, sizeVariant }));
      return;
    }
    try {
      setBusy(true);
      setMessage('');
      if (mode === 'edit' && item) await updateMenuItem(token, item.id, body);
      else await createMenuItem(token, body);
      onSaved();
      onClose();
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setMessage(e instanceof Error ? e.message : 'Could not save dish');
    } finally {
      setBusy(false);
    }
  }

  // A dish saved as OTHER (no longer offered) opens with an empty Type, so the vendor picks a real one before saving.
  const foodLabel = FOOD_TYPES.find(option => option.value === foodType)?.label ?? 'Type';
  const typedName = name.trim();
  const title = scrolled && typedName ? typedName : mode === 'edit' ? 'Edit dish' : 'Add dish';
  const primaryLabel = mode === 'edit' ? 'Save changes' : 'Add dish';

  function clearInvalid(key: string) {
    setInvalid(current => (current[key] ? { ...current, [key]: false } : current));
  }

  return (
    <Sheet
      inline
      title={title}
      onClose={onClose}
      onScrollY={y => setScrolled(current => (current === y > 12 ? current : y > 12))}
      footer={
        <>
          <Button label={primaryLabel} grow busy={busy} onPress={save} />
          <Button label="Cancel" variant="secondary" grow onPress={onClose} />
        </>
      }
    >
      <Field
        value={name}
        onChangeText={value => {
          setName(value);
          clearInvalid('name');
        }}
        placeholder="Name"
        invalid={invalid.name}
        accessibilityLabel="Dish name"
      />
      <FieldButton
        value={categoryLabel}
        placeholder="Category"
        active={picker?.kind === 'category'}
        invalid={invalid.category}
        onPress={() => {
          togglePicker({ kind: 'category' });
          clearInvalid('category');
        }}
      />
      {picker?.kind === 'category' ? (
        <CategoryPicker
          categories={categories}
          onPick={category => {
            setCategoryId(category.id);
            setCategoryLabel(category.name);
            setPicker(null);
            clearInvalid('category');
          }}
          onAdd={async typed => {
            if (!token) throw new Error('Sign in again to add a category.');
            try {
              const { category } = await addCatalogCategory(token, typed);
              onCategoryAdded?.(category);
              return category;
            } catch (e) {
              if (isAuthFailure(e)) await logout();
              throw e;
            }
          }}
        />
      ) : null}

      <Field value={description} onChangeText={setDescription} placeholder="Description" accessibilityLabel="Description" />

      <View style={styles.splitRow}>
        <Field
          value={price}
          onChangeText={value => {
            setPrice(value);
            clearInvalid('price');
          }}
          placeholder="Price"
          keyboardType="decimal-pad"
          invalid={invalid.price}
          style={styles.split}
          accessibilityLabel="Price"
        />
        <FieldButton
          value={FOOD_TYPES.some(option => option.value === foodType) ? foodLabel : ''}
          placeholder="Type"
          active={picker?.kind === 'food'}
          invalid={invalid.food}
          style={styles.split}
          onPress={() => {
            togglePicker({ kind: 'food' });
            clearInvalid('food');
          }}
        />
      </View>
      {picker?.kind === 'food' ? (
        <FoodMenu
          value={foodType}
          onPick={value => {
            setFoodType(value);
            setPicker(null);
          }}
        />
      ) : null}

      <Pressable
        onPress={() => {
          clearInvalid('image');
          void chooseImage();
        }}
        style={styles.imageRow}
        accessibilityRole="button"
        accessibilityLabel={imageUrl ? 'Change dish image' : 'Add dish image'}
      >
        <View style={[styles.imageSlot, invalid.image && styles.invalid]}>
          {imageUrl ? <Image source={{ uri: mediaUrl(imageUrl) }} style={styles.imagePreview} /> : <Icon name="image" size={24} color={colors.muted} />}
        </View>
        <View style={styles.imageCopy}>
          <Text style={typography.bodyStrong}>{imageUrl ? 'Dish photo' : 'Add a photo'}</Text>
          <Text style={typography.caption}>{imageUrl ? 'Tap to change' : 'Required. Customers order by sight.'}</Text>
        </View>
      </Pressable>

      <Panel>
        <Pressable onPress={toggleSizes} style={styles.panelHead} accessibilityRole="checkbox" accessibilityState={{ checked: sizeVariant }}>
          <Checkbox checked={sizeVariant} />
          <Text style={typography.bodyStrong}>Size variants</Text>
        </Pressable>
        {sizeVariant ? (
          <>
            {sizes.map(size => (
              <View key={size.key} style={styles.optionRow}>
                <Field
                  value={size.name}
                  onChangeText={value => {
                    setSizes(current => current.map(entry => (entry.key === size.key ? { ...entry, name: value } : entry)));
                    clearInvalid(`size-${size.key}-name`);
                  }}
                  placeholder="Size"
                  compact
                  invalid={invalid[`size-${size.key}-name`]}
                  style={styles.sizeName}
                />
                <Field
                  value={size.price}
                  onChangeText={value => {
                    setSizes(current => current.map(entry => (entry.key === size.key ? { ...entry, price: value } : entry)));
                    clearInvalid(`size-${size.key}-price`);
                  }}
                  placeholder="Price"
                  keyboardType="decimal-pad"
                  compact
                  invalid={invalid[`size-${size.key}-price`]}
                  style={styles.sizePrice}
                />
                <IconButton icon="close" label="Remove size" tone="none" size={32} color={colors.muted} onPress={() => setSizes(current => current.filter(entry => entry.key !== size.key))} />
              </View>
            ))}
            <Button label="Add size" icon="plus" variant="quiet" size="sm" onPress={() => setSizes(current => [...current, blankSize()])} />
          </>
        ) : null}
      </Panel>

      {variants.map(variant => (
        <Panel key={variant.key}>
          <View style={styles.panelHead}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: variant.enabled }}
              accessibilityLabel={variant.enabled ? 'Turn off custom variant' : 'Turn on custom variant'}
              onPress={() => setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, enabled: !entry.enabled } : entry)))}
              hitSlop={6}
            >
              <Checkbox checked={variant.enabled} />
            </Pressable>
            <Field
              value={variant.name}
              onChangeText={value => {
                setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, name: value } : entry)));
                clearInvalid(`variant-${variant.key}`);
              }}
              placeholder="Variant name, e.g. Spice level"
              compact
              invalid={invalid[`variant-${variant.key}`]}
              style={styles.grow}
              accessibilityLabel="Variant name"
            />
          </View>
          {variant.enabled ? (
            <>
              <ToggleRow
                label={variant.required ? 'Mandatory' : 'Optional'}
                value={variant.required}
                onChange={value => setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, required: value } : entry)))}
              />
              <ToggleRow
                label={variant.selection === 'MULTIPLE' ? 'Multiple choice' : 'Single choice'}
                value={variant.selection === 'MULTIPLE'}
                onChange={value =>
                  setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, selection: value ? 'MULTIPLE' : 'SINGLE' } : entry)))
                }
              />
              <ToggleRow
                label={variant.priceIncreases ? 'Adds to the price' : 'No extra price'}
                value={variant.priceIncreases}
                onChange={value => setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, priceIncreases: value } : entry)))}
              />
              {variant.options.map(option => (
                <View key={option.key}>
                  <View style={styles.optionRow}>
                    <Field
                      value={option.name}
                      onChangeText={value => {
                        updateOption(setVariants, variant.key, option.key, { name: value });
                        clearInvalid(`option-${option.key}-name`);
                      }}
                      placeholder="Option"
                      compact
                      invalid={invalid[`option-${option.key}-name`]}
                      style={styles.optionName}
                    />
                    <FieldButton
                      value={FOOD_TYPES.find(entry => entry.value === option.foodType)?.label}
                      placeholder="Type"
                      compact
                      active={picker?.kind === 'option' && picker.key === option.key}
                      style={styles.optionType}
                      onPress={() => togglePicker({ kind: 'option', key: option.key })}
                    />
                    {variant.priceIncreases ? (
                      <Field
                        value={option.price}
                        onChangeText={value => {
                          updateOption(setVariants, variant.key, option.key, { price: value });
                          clearInvalid(`option-${option.key}-price`);
                        }}
                        placeholder="₹"
                        keyboardType="decimal-pad"
                        compact
                        invalid={invalid[`option-${option.key}-price`]}
                        style={styles.optionPrice}
                        accessibilityLabel="Option price"
                      />
                    ) : null}
                    <IconButton
                      icon="close"
                      label="Remove option"
                      tone="none"
                      size={32}
                      color={colors.muted}
                      onPress={() =>
                        setVariants(current =>
                          current.map(entry => (entry.key === variant.key ? { ...entry, options: entry.options.filter(row => row.key !== option.key) } : entry)),
                        )
                      }
                    />
                  </View>
                  {picker?.kind === 'option' && picker.key === option.key ? (
                    <FoodMenu
                      value={option.foodType}
                      onPick={value => {
                        updateOption(setVariants, variant.key, option.key, { foodType: value });
                        setPicker(null);
                      }}
                    />
                  ) : null}
                </View>
              ))}
              <Button
                label="Add option"
                icon="plus"
                variant="quiet"
                size="sm"
                onPress={() =>
                  setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, options: [...entry.options, blankOption()] } : entry)))
                }
              />
            </>
          ) : null}
        </Panel>
      ))}

      <Button label="Add variant" icon="plus" variant="secondary" onPress={() => setVariants(current => [...current, blankVariant()])} accessibilityLabel="Add variant" />

      {message ? <Text style={styles.error}>{message}</Text> : null}
    </Sheet>
  );
}

/** The food-type choices under a Type field. */
function FoodMenu({ value, onPick }: { value: FoodType; onPick: (value: Exclude<FoodType, 'OTHER'>) => void }) {
  return (
    <Panel style={styles.menu}>
      {FOOD_TYPES.map(option => (
        <Pressable key={option.value} onPress={() => onPick(option.value)} style={styles.menuItem} accessibilityRole="button" accessibilityState={{ selected: value === option.value }}>
          <Text style={typography.body}>{option.label}</Text>
          {value === option.value ? <Icon name="check" size={16} /> : null}
        </Pressable>
      ))}
    </Panel>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return <View style={[styles.checkbox, checked && styles.checkboxOn]}>{checked ? <Icon name="check" size={13} color={colors.onPrimary} /> : null}</View>;
}

function updateOption(
  setVariants: Dispatch<SetStateAction<VariantDraft[]>>,
  variantKey: string,
  optionKey: string,
  patch: Partial<OptionDraft>,
) {
  setVariants(current =>
    current.map(entry =>
      entry.key === variantKey
        ? { ...entry, options: entry.options.map(option => (option.key === optionKey ? { ...option, ...patch } : option)) }
        : entry,
    ),
  );
}

function buildInput(form: {
  name: string;
  categoryId: string | null;
  categoryLabel: string;
  categories: MenuCategory[];
  description: string;
  price: string;
  foodType: FoodType;
  imageUrl: string;
  sizeVariant: boolean;
  sizes: SizeDraft[];
  variants: VariantDraft[];
  keepIds: boolean;
}): MenuItemInput | string {
  if (!form.name.trim()) return 'Add a dish name.';
  const category = form.categories.find(entry => entry.id === form.categoryId)
    ?? form.categories.find(entry => entry.name.trim().toLowerCase() === form.categoryLabel.trim().toLowerCase());
  if (!category) return 'Choose a category.';
  const price = amount(form.price);
  if (price == null) return 'Add a valid price.';
  if (!FOOD_TYPES.some(option => option.value === form.foodType)) return 'Choose Vegan, Veg, Non-Veg, or Egg.';
  if (!form.imageUrl.trim()) return 'Add an image.';

  const sizes: SizeOption[] = [];
  if (form.sizeVariant) {
    if (form.sizes.length === 0) return 'Name each size.';
    for (const size of form.sizes) {
      const extra = amount(size.price);
      if (!size.name.trim()) return 'Name each size.';
      if (extra == null) return 'Add a valid price for each size.';
      sizes.push({ ...(form.keepIds && size.id ? { id: size.id } : {}), name: size.name.trim(), price: extra });
    }
  }

  const variants: CustomVariant[] = [];
  for (const variant of form.variants.filter(entry => entry.enabled)) {
    if (!variant.name.trim()) return 'Name each custom variant.';
    if (variant.options.length === 0) return 'Add at least one option to each variant.';
    const options = [];
    for (const option of variant.options) {
      if (!option.name.trim()) return 'Name each option.';
      const optionPrice = variant.priceIncreases ? amount(option.price) : 0;
      if (optionPrice == null) return 'Add a valid price for each option.';
      options.push({
        ...(form.keepIds && option.id ? { id: option.id } : {}),
        name: option.name.trim(),
        foodType: option.foodType,
        price: optionPrice,
      });
    }
    variants.push({
      ...(form.keepIds && variant.id ? { id: variant.id } : {}),
      name: variant.name.trim(),
      required: variant.required,
      selection: variant.selection,
      priceIncreases: variant.priceIncreases,
      options,
    });
  }

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price,
    foodType: form.foodType,
    imageUrl: form.imageUrl.trim(),
    categoryId: category.id,
    sizes,
    variants,
  };
}

function invalidFrom(
  message: string,
  form: { sizes: SizeDraft[]; variants: VariantDraft[]; sizeVariant: boolean },
): Record<string, boolean> {
  if (message.includes('dish name')) return { name: true };
  if (message.includes('category')) return { category: true };
  if (message.includes('valid price.') && !message.includes('size') && !message.includes('option')) return { price: true };
  if (message.includes('Vegan')) return { food: true };
  if (message.includes('image')) return { image: true };
  if (message.includes('size')) {
    const flags: Record<string, boolean> = {};
    for (const size of form.sizes) {
      if (!size.name.trim()) flags[`size-${size.key}-name`] = true;
      if (amount(size.price) == null) flags[`size-${size.key}-price`] = true;
    }
    return flags;
  }
  if (message.includes('custom variant')) {
    const flags: Record<string, boolean> = {};
    for (const variant of form.variants.filter(entry => entry.enabled)) {
      if (!variant.name.trim()) flags[`variant-${variant.key}`] = true;
    }
    return flags;
  }
  if (message.includes('option')) {
    const flags: Record<string, boolean> = {};
    for (const variant of form.variants.filter(entry => entry.enabled)) {
      for (const option of variant.options) {
        if (!option.name.trim()) flags[`option-${option.key}-name`] = true;
        if (variant.priceIncreases && amount(option.price) == null) flags[`option-${option.key}-price`] = true;
      }
    }
    return flags;
  }
  return {};
}

function amount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function draftsFromSizes(sizes?: MenuItem['sizes']) {
  return (sizes ?? []).map(size => ({
    key: size.id ?? draftKey(),
    id: size.id,
    name: size.name,
    price: String(size.price),
  }));
}

function draftsFromVariants(variants?: MenuItem['variants']): VariantDraft[] {
  return (variants ?? []).map(variant => ({
    key: variant.id ?? draftKey(),
    id: variant.id,
    name: variant.name,
    enabled: true,
    required: variant.required,
    selection: variant.selection,
    priceIncreases: variant.priceIncreases,
    options: variant.options.map(option => ({
      key: option.id ?? draftKey(),
      id: option.id,
      name: option.name,
      foodType: option.foodType === 'OTHER' ? 'VEG' : option.foodType,
      price: variant.priceIncreases ? String(option.price) : '',
    })),
  }));
}

function blankSize(): SizeDraft {
  return { key: draftKey(), name: '', price: '' };
}

function blankOption(): OptionDraft {
  return { key: draftKey(), name: '', foodType: 'VEG', price: '' };
}

function blankVariant(): VariantDraft {
  return {
    key: draftKey(),
    name: '',
    enabled: true,
    required: false,
    selection: 'SINGLE',
    priceIncreases: false,
    options: [blankOption()],
  };
}

function draftKey() {
  return Math.random().toString(36).slice(2);
}

function samePicker(current: Picker, next: Picker) {
  if (!current || !next) return false;
  if (current.kind !== next.kind) return false;
  if (current.kind === 'option' && next.kind === 'option') return current.key === next.key;
  return true;
}

function pickWebImage() {
  return new Promise<File | null>(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

const styles = StyleSheet.create({
  splitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  split: {
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  menu: {
    padding: 4,
    gap: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageSlot: {
    width: 64,
    height: 64,
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  invalid: {
    borderColor: colors.danger,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageCopy: {
    flex: 1,
    gap: 2,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeName: {
    flex: 2.4,
    minWidth: 0,
  },
  sizePrice: {
    flex: 1,
    minWidth: 0,
    maxWidth: 96,
  },
  optionName: {
    flex: 2,
    minWidth: 0,
  },
  optionType: {
    width: 92,
  },
  optionPrice: {
    width: 64,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
