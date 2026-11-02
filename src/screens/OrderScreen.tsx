import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OrderScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container} />
    </SafeAreaView>
  );
};

const BG = '#F8FAFC';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
});

export default OrderScreen;
