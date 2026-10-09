import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addCatalogCategory, createMenuItem, updateMenuItem, uploadMenuImage } from '../../api/menu';
import { CategoryPicker } from './CategoryPicker';
import { isAuthFailure, mediaUrl } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme';
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
  const [focused, setFocused] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'dish-form-focus';
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = `
      input:focus, textarea:focus { outline: none !important; box-shadow: none !important; }
      input[placeholder="Name"]:focus, input[placeholder="Description"]:focus,
      input[placeholder="Price"]:focus {
        background-color: #ffffff !important;
        color: #3d5366 !important;
        caret-color: #3d5366;
        border-color: #3d5366 !important;
      }
      input[placeholder="Option"]:focus, input[placeholder="Size"]:focus,
      input[placeholder="Variant name"]:focus {
        background-color: #d8ecff !important;
        color: #3d5366 !important;
        caret-color: #3d5366;
        border-color: #3d5366 !important;
      }
    `;
  }, []);

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

  const foodLabel = FOOD_TYPES.find(option => option.value === foodType)?.label ?? (foodType === 'OTHER' ? 'Other' : 'Type');
  const typedName = name.trim();
  const title = scrolled && typedName ? typedName : mode === 'edit' ? 'Edit Dish' : 'Add Dish';
  const primaryLabel = busy ? 'Saving…' : typedName ? 'Done' : 'Add Dish';

  function bind(key: string) {
    return {
      onFocus: () => setFocused(key),
      onBlur: () => setFocused(current => (current === key ? null : current)),
      ...(Platform.OS === 'web'
        ? { onClick: () => setFocused(key) }
        : { onTouchStart: () => setFocused(key) }),
    };
  }

  function paint(key: string) {
    return [focused === key && styles.fieldFocus, invalid[key] && styles.fieldError];
  }

  function clearInvalid(key: string) {
    setInvalid(current => (current[key] ? { ...current, [key]: false } : current));
  }

  function textTone(_key: string, filled: boolean) {
    return filled ? styles.fieldValue : styles.fieldPlaceholder;
  }

  return (
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.sheet}>
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>
        <View style={styles.namePin}>
          <Text style={styles.screenTitle} numberOfLines={1}>{title}</Text>
        </View>
        <ScrollView
          style={styles.scroller}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={event => {
            const next = event.nativeEvent.contentOffset.y > 12;
            setScrolled(current => (current === next ? current : next));
          }}
        >
          <TextInput
            value={name}
            onChangeText={value => {
              setName(value);
              clearInvalid('name');
            }}
            placeholder="Name"
            placeholderTextColor="#98a8b6"
            underlineColorAndroid="transparent"
            selectionColor={colors.header}
            {...bind('name')}
            style={[styles.field, ...paint('name')]}
          />
          <Pressable
            onPress={() => {
              togglePicker({ kind: 'category' });
              setFocused('category');
              clearInvalid('category');
            }}
            style={[styles.field, ...paint('category')]}
          >
            <Text style={textTone('category', Boolean(categoryLabel))}>{categoryLabel || 'Category'}</Text>
          </Pressable>
          {picker?.kind === 'category' ? (
            <CategoryPicker
              categories={categories}
              onPick={category => {
                setCategoryId(category.id);
                setCategoryLabel(category.name);
                setPicker(null);
                setFocused(null);
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

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor="#98a8b6"
            underlineColorAndroid="transparent"
            selectionColor={colors.header}
            {...bind('description')}
            style={[styles.field, ...paint('description')]}
          />

          <View style={styles.splitRow}>
            <TextInput
              value={price}
              onChangeText={value => {
                setPrice(value);
                clearInvalid('price');
              }}
              placeholder="Price"
              placeholderTextColor="#98a8b6"
              keyboardType="decimal-pad"
              underlineColorAndroid="transparent"
              selectionColor={colors.header}
              {...bind('price')}
              style={[styles.field, styles.splitField, ...paint('price')]}
            />
            <Pressable
              onPress={() => {
                togglePicker({ kind: 'food' });
                setFocused('food');
                clearInvalid('food');
              }}
              style={[styles.field, styles.splitField, ...paint('food')]}
            >
              <Text style={textTone('food', true)}>{foodLabel}</Text>
            </Pressable>
          </View>
          {picker?.kind === 'food' ? (
            <View style={styles.menu}>
              {FOOD_TYPES.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setFoodType(option.value);
                    setPicker(null);
                    setFocused(null);
                  }}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              clearInvalid('image');
              void chooseImage();
            }}
            style={[styles.imageSlot, invalid.image && styles.fieldError]}
            accessibilityLabel="Add dish image"
          >
            {imageUrl ? (
              <Image source={{ uri: mediaUrl(imageUrl) }} style={styles.imagePreview} />
            ) : (
              <Text style={styles.imagePlus}>+</Text>
            )}
          </Pressable>

          <View style={styles.variantCard}>
            <Pressable onPress={toggleSizes} style={styles.variantHead}>
              <View style={styles.variantHeadLeft}>
                <Checkbox checked={sizeVariant} />
                <Text style={styles.variantTitle}>Size Variant</Text>
              </View>
            </Pressable>
            {sizeVariant ? (
              <>
                {sizes.map(size => (
                  <View key={size.key} style={styles.optionRow}>
                    <TextInput
                      value={size.name}
                      onChangeText={value => {
                        setSizes(current => current.map(entry => (entry.key === size.key ? { ...entry, name: value } : entry)));
                        clearInvalid(`size-${size.key}-name`);
                      }}
                      placeholder="Size"
                      placeholderTextColor="#7f95a8"
                      underlineColorAndroid="transparent"
                      selectionColor={colors.header}
                      {...bind(`size-${size.key}-name`)}
                      style={[styles.optionInput, styles.sizeName, ...paint(`size-${size.key}-name`)]}
                    />
                    <TextInput
                      value={size.price}
                      onChangeText={value => {
                        setSizes(current => current.map(entry => (entry.key === size.key ? { ...entry, price: value } : entry)));
                        clearInvalid(`size-${size.key}-price`);
                      }}
                      placeholder="Price"
                      placeholderTextColor="#7f95a8"
                      keyboardType="decimal-pad"
                      underlineColorAndroid="transparent"
                      selectionColor={colors.header}
                      {...bind(`size-${size.key}-price`)}
                      style={[styles.optionInput, styles.sizePrice, ...paint(`size-${size.key}-price`)]}
                    />
                    <Pressable
                      accessibilityLabel="Remove size"
                      onPress={() => setSizes(current => current.filter(entry => entry.key !== size.key))}
                      style={styles.remove}
                    >
                      <Text style={styles.removeLabel}>×</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  accessibilityLabel="Add size"
                  onPress={() => setSizes(current => [...current, blankSize()])}
                  style={styles.rowAdd}
                >
                  <Text style={styles.rowAddLabel}>+</Text>
                </Pressable>
              </>
            ) : null}
          </View>

          {variants.map(variant => (
            <View key={variant.key} style={styles.variantCard}>
              <View style={styles.variantHead}>
                <Pressable
                  accessibilityLabel={variant.enabled ? 'Turn off custom variant' : 'Turn on custom variant'}
                  onPress={() => setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, enabled: !entry.enabled } : entry)))}
                >
                  <Checkbox checked={variant.enabled} />
                </Pressable>
                <TextInput
                  value={variant.name}
                  onChangeText={value => {
                    setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, name: value } : entry)));
                    clearInvalid(`variant-${variant.key}`);
                  }}
                  placeholder="Variant name"
                  placeholderTextColor="#98a8b6"
                  underlineColorAndroid="transparent"
                  selectionColor={colors.header}
                  {...bind(`variant-${variant.key}`)}
                  style={[styles.variantName, ...paint(`variant-${variant.key}`)]}
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
                    label={variant.selection === 'MULTIPLE' ? 'Multiple' : 'Single'}
                    value={variant.selection === 'MULTIPLE'}
                    onChange={value =>
                      setVariants(current =>
                        current.map(entry => (entry.key === variant.key ? { ...entry, selection: value ? 'MULTIPLE' : 'SINGLE' } : entry)),
                      )
                    }
                  />
                  <ToggleRow
                    label={variant.priceIncreases ? 'Adds price' : 'No price'}
                    value={variant.priceIncreases}
                    onChange={value => setVariants(current => current.map(entry => (entry.key === variant.key ? { ...entry, priceIncreases: value } : entry)))}
                  />
                  {variant.options.map(option => (
                    <View key={option.key}>
                      <View style={styles.optionRow}>
                        <TextInput
                          value={option.name}
                          onChangeText={value => {
                            updateOption(setVariants, variant.key, option.key, { name: value });
                            clearInvalid(`option-${option.key}-name`);
                          }}
                          placeholder="Option"
                          placeholderTextColor="#7f95a8"
                          underlineColorAndroid="transparent"
                          selectionColor={colors.header}
                          {...bind(`option-${option.key}-name`)}
                          style={[styles.optionInput, styles.optionName, ...paint(`option-${option.key}-name`)]}
                        />
                        <Pressable
                          onPress={() => {
                            togglePicker({ kind: 'option', key: option.key });
                            setFocused(`option-${option.key}-type`);
                          }}
                          style={[styles.optionType, ...paint(`option-${option.key}-type`)]}
                        >
                          <Text style={styles.optionTypeLabel} numberOfLines={1}>
                            {FOOD_TYPES.find(entry => entry.value === option.foodType)?.label}
                          </Text>
                        </Pressable>
                        {variant.priceIncreases ? (
                          <TextInput
                            value={option.price}
                            onChangeText={value => {
                              updateOption(setVariants, variant.key, option.key, { price: value });
                              clearInvalid(`option-${option.key}-price`);
                            }}
                            placeholder="Price"
                            placeholderTextColor="#7f95a8"
                            keyboardType="decimal-pad"
                            underlineColorAndroid="transparent"
                            selectionColor={colors.header}
                            {...bind(`option-${option.key}-price`)}
                            style={[styles.optionInput, styles.optionPrice, ...paint(`option-${option.key}-price`)]}
                          />
                        ) : null}
                        <Pressable
                          accessibilityLabel="Remove option"
                          onPress={() =>
                            setVariants(current =>
                              current.map(entry =>
                                entry.key === variant.key ? { ...entry, options: entry.options.filter(row => row.key !== option.key) } : entry,
                              ),
                            )
                          }
                          style={styles.remove}
                        >
                          <Text style={styles.removeLabel}>×</Text>
                        </Pressable>
                      </View>
                      {picker?.kind === 'option' && picker.key === option.key ? (
                        <View style={styles.menu}>
                          {FOOD_TYPES.map(entry => (
                            <Pressable
                              key={entry.value}
                              onPress={() => {
                                updateOption(setVariants, variant.key, option.key, { foodType: entry.value });
                                setPicker(null);
                                setFocused(null);
                              }}
                              style={styles.menuItem}
                            >
                              <Text style={styles.menuItemLabel}>{entry.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                  <Pressable
                    accessibilityLabel="Add option"
                    onPress={() =>
                      setVariants(current =>
                        current.map(entry => (entry.key === variant.key ? { ...entry, options: [...entry.options, blankOption()] } : entry)),
                      )
                    }
                    style={styles.rowAdd}
                  >
                    <Text style={styles.rowAddLabel}>+</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ))}

          <Pressable
            accessibilityLabel="Add variant"
            onPress={() => setVariants(current => [...current, blankVariant()])}
            style={styles.addVariant}
            hitSlop={8}
          >
            <Text style={styles.addVariantLabel}>+ Variant</Text>
          </Pressable>

          {message ? <Text style={styles.error}>{message}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable disabled={busy} onPress={save} style={styles.done}>
            <Text style={styles.doneLabel}>{primaryLabel}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={styles.thumb} />
      </View>
    </Pressable>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
    </View>
  );
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
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(29, 41, 57, 0.4)',
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: colors.page,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  namePin: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    backgroundColor: colors.page,
    zIndex: 2,
  },
  scroller: {
    flexGrow: 1,
    flexShrink: 1,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2f3f4f',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  field: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#3d5366',
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({ web: { outlineStyle: 'none', outlineWidth: 0 }, default: {} }),
  },
  fieldFocus: {
    borderColor: colors.header,
  },
  fieldError: {
    borderColor: colors.error,
  },
  fieldPlaceholder: {
    fontSize: 14,
    color: '#98a8b6',
  },
  fieldValue: {
    fontSize: 14,
    color: '#3d5366',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  splitField: {
    flex: 1,
  },
  menu: {
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemLabel: {
    fontSize: 14,
    color: '#3d5366',
  },
  imageSlot: {
    width: 56,
    height: 56,
    backgroundColor: colors.white,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  imagePlus: {
    fontSize: 28,
    lineHeight: 30,
    color: '#667085',
    fontWeight: '300',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  variantCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  variantHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  variantHeadLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3d5366',
  },
  variantName: {
    flex: 1,
    backgroundColor: '#d8ecff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#3d5366',
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({ web: { outlineStyle: 'none', outlineWidth: 0 }, default: {} }),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#d8ecff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3d5366',
  },
  track: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#c5d4e2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  trackOn: {
    backgroundColor: '#3d5366',
    justifyContent: 'flex-end',
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#98a8b6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: '#3d5366',
    backgroundColor: '#eef4f8',
  },
  checkmark: {
    fontSize: 11,
    color: '#3d5366',
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#d8ecff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#3d5366',
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({ web: { outlineStyle: 'none', outlineWidth: 0 }, default: {} }),
  },
  sizeName: {
    flex: 2.4,
  },
  sizePrice: {
    flex: 1,
    maxWidth: 96,
  },
  optionName: {
    flex: 2.2,
  },
  optionPrice: {
    flex: 1,
    maxWidth: 72,
  },
  optionType: {
    width: 84,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#d8ecff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionTypeLabel: {
    fontSize: 13,
    color: '#3d5366',
  },
  remove: {
    width: 22,
    alignItems: 'center',
  },
  removeLabel: {
    fontSize: 18,
    color: '#667085',
  },
  rowAdd: {
    alignItems: 'center',
    paddingTop: 2,
  },
  rowAddLabel: {
    fontSize: 18,
    color: '#667085',
  },
  addVariant: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  addVariantLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F6BFF',
  },
  error: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.page,
  },
  done: {
    flex: 1,
    backgroundColor: '#3d5366',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  cancel: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelLabel: {
    color: '#3d5366',
    fontSize: 15,
    fontWeight: '700',
  },
});
