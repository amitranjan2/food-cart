import { useEffect, useState } from 'react';
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
import { createMenuItem, uploadMenuImage } from '../../api/menu';
import { isAuthFailure, mediaUrl } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme';
import type { FoodType, MenuCategory, MenuItem } from '../../types';

const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: 'VEG', label: 'Veg' },
  { value: 'NON_VEG', label: 'Non-veg' },
  { value: 'EGG', label: 'Egg' },
  { value: 'OTHER', label: 'Other' },
];

export type DishFormMode = 'add' | 'edit';

type Props = {
  mode: DishFormMode;
  item?: MenuItem | null;
  categories: MenuCategory[];
  onClose: () => void;
  onSaved: () => void;
};

export function DishFormSheet({ mode, item, categories, onClose, onSaved }: Props) {
  const { token, logout } = useAuth();
  const startingCategory = categories.find(entry => entry.id === item?.categoryId);
  const [name, setName] = useState(item?.name ?? '');
  const [categoryLabel, setCategoryLabel] = useState(startingCategory?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(item?.categoryId ?? null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [foodType, setFoodType] = useState<FoodType>(item?.foodType ?? 'VEG');
  const [typeOpen, setTypeOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sizeVariant, setSizeVariant] = useState(item ? item.halfPrice != null : true);
  const [halfPrice, setHalfPrice] = useState(item?.halfPrice != null ? String(item.halfPrice) : '');
  const [customVariant, setCustomVariant] = useState(false);
  const [customOption, setCustomOption] = useState('');
  const [customType, setCustomType] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    if (!item?.categoryId || categoryLabel) return;
    const category = categories.find(entry => entry.id === item.categoryId);
    if (category) setCategoryLabel(category.name);
  }, [categories, item?.categoryId, categoryLabel]);

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
    if (!name.trim() || !price.trim()) {
      setMessage('Add a dish name and price.');
      return;
    }
    if (mode === 'edit') {
      setMessage('Saving edits is not available yet.');
      return;
    }
    try {
      setBusy(true);
      setMessage('');
      await createMenuItem(token, {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        halfPrice: sizeVariant && halfPrice.trim() ? Number(halfPrice) : null,
        foodType,
        imageUrl,
        categoryId,
      });
      onSaved();
      onClose();
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setMessage(e instanceof Error ? e.message : 'Could not save dish');
    } finally {
      setBusy(false);
    }
  }

  const foodLabel = FOOD_TYPES.find(option => option.value === foodType)?.label ?? 'Type';
  const title = mode === 'edit' ? 'EDIT DISH' : 'ADD DISH';

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <ScrollView
            style={styles.scroller}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.screenTitle}>{title}</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#98a8b6"
              style={styles.field}
            />

            <Pressable onPress={() => setCategoryOpen(open => !open)} style={styles.field}>
              <Text style={categoryLabel ? styles.fieldValue : styles.fieldPlaceholder}>
                {categoryLabel || 'Category'}
              </Text>
            </Pressable>
            {categoryOpen ? (
              <View style={styles.menu}>
                {categories.length === 0 ? (
                  <Text style={styles.menuEmpty}>No categories yet</Text>
                ) : (
                  categories.map(category => (
                    <Pressable
                      key={category.id}
                      onPress={() => {
                        setCategoryId(category.id);
                        setCategoryLabel(category.name);
                        setCategoryOpen(false);
                      }}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuItemLabel}>{category.name}</Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColor="#98a8b6"
              style={styles.field}
            />

            <View style={styles.splitRow}>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="Price"
                placeholderTextColor="#98a8b6"
                keyboardType="decimal-pad"
                style={[styles.field, styles.splitField]}
              />
              <Pressable onPress={() => setTypeOpen(open => !open)} style={[styles.field, styles.splitField]}>
                <Text style={styles.fieldValue}>{foodLabel}</Text>
              </Pressable>
            </View>
            {typeOpen ? (
              <View style={styles.menu}>
                {FOOD_TYPES.map(option => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setFoodType(option.value);
                      setTypeOpen(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Text style={styles.menuItemLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Pressable onPress={chooseImage} style={styles.imageSlot}>
              {imageUrl ? (
                <Image source={{ uri: mediaUrl(imageUrl) }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imagePlus}>+</Text>
              )}
            </Pressable>

            <View style={styles.variantCard}>
              <Pressable onPress={() => setSizeVariant(on => !on)} style={styles.variantHead}>
                <View style={styles.variantHeadLeft}>
                  <Checkbox checked={sizeVariant} />
                  <Text style={styles.variantTitle}>Size Variant</Text>
                </View>
              </Pressable>
              {sizeVariant ? (
                <>
                  <View style={styles.optionRow}>
                    <View style={styles.optionPill}>
                      <Text style={styles.optionPillLabel}>Full</Text>
                    </View>
                    <TextInput
                      value={price}
                      onChangeText={setPrice}
                      placeholder="Price"
                      placeholderTextColor="#7f95a8"
                      keyboardType="decimal-pad"
                      style={styles.optionInput}
                    />
                  </View>
                  <View style={styles.optionRow}>
                    <View style={styles.optionPill}>
                      <Text style={styles.optionPillLabel}>Half</Text>
                    </View>
                    <TextInput
                      value={halfPrice}
                      onChangeText={setHalfPrice}
                      placeholder="Price"
                      placeholderTextColor="#7f95a8"
                      keyboardType="decimal-pad"
                      style={styles.optionInput}
                    />
                  </View>
                  <Text style={styles.rowAdd}>+</Text>
                </>
              ) : null}
            </View>

            <View style={styles.variantCard}>
              <View style={styles.variantHead}>
                <Pressable onPress={() => setCustomVariant(on => !on)} style={styles.variantHeadLeft}>
                  <Checkbox checked={customVariant} />
                  <Text style={styles.variantTitle}>Custom</Text>
                </Pressable>
                <View style={styles.variantTools}>
                  <Text style={styles.toolIcon}>☰</Text>
                  <Text style={styles.toolIcon}>↑</Text>
                </View>
              </View>
              {customVariant ? (
                <>
                  <View style={styles.optionRow}>
                    <TextInput
                      value={customOption}
                      onChangeText={setCustomOption}
                      placeholder="Option 1"
                      placeholderTextColor="#7f95a8"
                      style={[styles.optionInput, styles.optionWide]}
                    />
                    <TextInput
                      value={customType}
                      onChangeText={setCustomType}
                      placeholder="Type"
                      placeholderTextColor="#7f95a8"
                      style={styles.optionInput}
                    />
                    <TextInput
                      value={customPrice}
                      onChangeText={setCustomPrice}
                      placeholder="Price"
                      placeholderTextColor="#7f95a8"
                      keyboardType="decimal-pad"
                      style={styles.optionInput}
                    />
                  </View>
                  <Text style={styles.rowAdd}>+</Text>
                </>
              ) : null}
            </View>

            <Pressable style={styles.addVariant}>
              <Text style={styles.addVariantLabel}>+ Variant</Text>
            </Pressable>

            {message ? <Text style={styles.error}>{message}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable disabled={busy} onPress={save} style={styles.done}>
              <Text style={styles.doneLabel}>{busy ? 'Saving…' : 'Done'}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
    </View>
  );
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
  scroller: {
    flexGrow: 0,
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
  menuEmpty: {
    padding: 12,
    fontSize: 12,
    color: '#667085',
  },
  menuItem: {
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
  },
  variantHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  variantHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3d5366',
  },
  variantTools: {
    flexDirection: 'row',
    gap: 10,
  },
  toolIcon: {
    fontSize: 14,
    color: '#667085',
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
  optionPill: {
    backgroundColor: '#d8ecff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  optionPillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3d5366',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#d8ecff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#3d5366',
  },
  optionWide: {
    flex: 1.2,
  },
  rowAdd: {
    textAlign: 'center',
    fontSize: 18,
    color: '#667085',
    marginTop: 2,
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
