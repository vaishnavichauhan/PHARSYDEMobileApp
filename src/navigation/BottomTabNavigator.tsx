import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import {
  House,
  ChartColumn,
  PackageCheck,
  LayoutGridCircles,
} from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import OrderScreen from '../screens/OrderScreen';
import MenuScreen from '../screens/MenuScreen';

const Tab = createBottomTabNavigator();

const ACTIVE_COLOR = '#488203';
const CARD_BG = '#FFFFFF';
const MUTED = '#64748B';

/** Renders a tab icon with lucide-react icon + label */
function TabIcon({
  Icon,
  label,
  focused,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Icon
        size={22}
        color={focused ? ACTIVE_COLOR : MUTED}
        strokeWidth={focused ? 2.4 : 1.8}
      />
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={House} label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={ChartColumn} label="Categories" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Order"
        component={OrderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={PackageCheck} label="Order" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={LayoutGridCircles} label="Menu" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 14,
    width: 74,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(142, 247, 5, 0.18)',
  },
  label: {
    fontSize: 9.5,
    color: MUTED,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
});

export default BottomTabNavigator;
