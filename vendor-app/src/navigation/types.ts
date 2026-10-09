import type { OrderStatus } from '../types';

export type OrdersStackParamList = {
  OrdersList: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  App: undefined;
};

export type StatusFilter = OrderStatus | 'ALL';
