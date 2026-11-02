/**
 * PharsydeApp – Root Application Entry
 *
 * Flow:
 *  1. App launches → initAgeVerification() loads AsyncStorage state
 *  2. If NOT verified → AgeGateModal blocks full screen (Modal overlay)
 *  3. User enters birth year + province → verifyAge() calls backend health check
 *  4. On success → isAgeVerified = true → modal closes → Home tab shown
 */

import React, { useEffect } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import AgeGateModal from './src/components/AgeGateModal';
import ProductDetailModal from './src/components/ProductDetailModal';
import CartModal from './src/components/CartModal';
import { useAgeVerificationStore } from './src/store/ageVerificationStore';

// ── Inner App (reads store after SafeAreaProvider is mounted) ───────────────
function AppContent() {
  const { isAgeVerified, isLoading, initAgeVerification } =
    useAgeVerificationStore();

  useEffect(() => {
    initAgeVerification();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Splash while AsyncStorage hydrates
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#8EF705" />
      </View>
    );
  }

  // Age not verified – show gate only (no navigator needed yet)
  if (!isAgeVerified) {
    return (
      <View style={styles.gateBackground}>
        <StatusBar barStyle="dark-content" />
        <AgeGateModal />
      </View>
    );
  }

  // Age verified – show the full app
  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <BottomTabNavigator />
      </NavigationContainer>
      <ProductDetailModal />
      <CartModal />
    </View>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  splash: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gateBackground: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
