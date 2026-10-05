import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoadingState } from '../components/LoadingState';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { useAuth } from '../state/AuthContext';
import { OrdersStack } from './OrdersStack';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { vendor, restoring } = useAuth();

  if (restoring) return <LoadingState message="Restoring session…" />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {vendor ? (
          <Stack.Screen name="App" component={OrdersStack} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
