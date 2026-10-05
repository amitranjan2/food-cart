export type FoodType = 'VEG' | 'NON_VEG' | 'EGG' | 'OTHER';

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
};

export type MenuCategory = {
  id: string;
  vendorId?: string;
  name: string;
  sortOrder?: number;
};

export type VendorMenu = {
  items: MenuItem[];
  categories?: MenuCategory[];
};
