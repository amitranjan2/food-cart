export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type OrderType = 'PICKUP' | 'DINE_IN';
export type Portion = 'FULL' | 'HALF';

export type OrderItem = {
  menuItemId?: string | null;
  name: string;
  portion?: string;
  summary?: string | null;
  price: number;
  lineTotal: number;
  quantity: number;
};

export type Order = {
  id: string;
  orderNumber: number;
  vendorId: string;
  customerId: string;
  customerMobile?: string | null;
  type?: OrderType | string;
  /** Start of the customer's 30-minute slot (ISO instant). */
  scheduledFor?: string | null;
  paymentMethod?: string | null;
  rejectionReason?: string | null;
  rejectionNote?: string | null;
  status: OrderStatus;
  items: OrderItem[];
  subtotal?: number;
  total: number;
  createdAt?: string;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  completedAt?: string | null;
  rejectedAt?: string | null;
};
