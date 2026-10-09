export type FoodType = 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN' | 'OTHER';

export type SizeOption = {
  id?: string;
  name: string;
  price: number;
};

export type VariantOption = {
  id?: string;
  name: string;
  foodType: FoodType;
  price: number;
};

export type SelectionMode = 'SINGLE' | 'MULTIPLE';

export type CustomVariant = {
  id?: string;
  name: string;
  required: boolean;
  selection: SelectionMode;
  priceIncreases: boolean;
  options: VariantOption[];
};

export type MenuItem = {
  id: string;
  vendorId?: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  foodType?: FoodType;
  price: number;
  halfPrice?: number | null;
  active: boolean;
  available: boolean;
  halfAvailable?: boolean;
  sortOrder?: number;
  /** Shown in the storefront's specials carousel. */
  special?: boolean;
  sizes?: SizeOption[] | null;
  variants?: CustomVariant[] | null;
};

export type MenuCategory = {
  id: string;
  vendorId?: string;
  name: string;
  imageUrl?: string | null;
  sortOrder?: number;
};

export type VendorMenu = {
  items: MenuItem[];
  categories?: MenuCategory[];
};

export type MenuItemInput = {
  name: string;
  description?: string;
  price: number;
  foodType: FoodType;
  imageUrl: string;
  categoryId: string;
  sizes: SizeOption[];
  variants: CustomVariant[];
};
