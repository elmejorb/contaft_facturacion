import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { RootStackParamList } from './types';
import { BottomTabs } from './BottomTabs';
import { useAuthStore } from '../stores/authStore';

import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { VincularEmpresaScreen } from '../screens/VincularEmpresaScreen';
import { CreateOrderScreen } from '../screens/CreateOrderScreen';
import { CreateInvoiceScreen } from '../screens/CreateInvoiceScreen';
import { CreateClientScreen } from '../screens/CreateClientScreen';
import { ClientDetailScreen } from '../screens/ClientDetailScreen';
import { EditClientScreen } from '../screens/EditClientScreen';
import { InvoiceDetailScreen } from '../screens/InvoiceDetailScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { SyncScreen } from '../screens/SyncScreen';
import { MiCargueScreen } from '../screens/MiCargueScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export const RootNavigator: React.FC = () => {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const pairing = useAuthStore((s) => s.pairing);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <SplashScreen />;
  }

  const isPaired = !!pairing;
  const isAuthed = !!token;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {!isPaired ? (
          // Sin pairing: obligar a vincular con código de empresa (WhatsApp/QR).
          <Stack.Screen name="VincularEmpresa" component={VincularEmpresaScreen} />
        ) : !isAuthed ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={BottomTabs} />
            <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
            <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
            <Stack.Screen name="CreateClient" component={CreateClientScreen} />
            <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
            <Stack.Screen name="EditClient" component={EditClientScreen} />
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
            <Stack.Screen name="Products" component={ProductsScreen} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            <Stack.Screen name="Sync" component={SyncScreen} />
            <Stack.Screen name="MiCargue" component={MiCargueScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
