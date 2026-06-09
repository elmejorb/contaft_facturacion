import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getDb } from './src/db';
import { useNetworkStore } from './src/stores/networkStore';
import { initAutoSync } from './src/services/autoSync';

export default function App() {
  useEffect(() => {
    getDb().catch((e) => console.warn('SQLite init error:', e));
    const unsubNet = useNetworkStore.getState().init();
    const unsubSync = initAutoSync();
    return () => {
      unsubNet();
      unsubSync();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
