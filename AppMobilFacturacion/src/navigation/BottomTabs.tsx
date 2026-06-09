import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors } from '../theme';
import { MainTabsParamList } from './types';

import { DashboardScreen } from '../screens/DashboardScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { InvoicesScreen } from '../screens/InvoicesScreen';
import { MoreScreen } from '../screens/MoreScreen';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export const BottomTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 86 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Orders')
            iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Invoices')
            iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'More')
            iconName = focused ? 'grid' : 'grid-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ tabBarLabel: 'Pedidos' }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ tabBarLabel: 'Facturas' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'Más' }} />
    </Tab.Navigator>
  );
};
