import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersScreen } from '../screens/Orders/OrdersScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import type { OrdersStackParamList } from './types';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
