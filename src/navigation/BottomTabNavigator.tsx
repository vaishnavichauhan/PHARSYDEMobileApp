import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  PackageCheck,
  LayoutGridCircles,
  Cigarette,
  Cannabis,
} from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import CannabisScreen from '../screens/CannabisScreen';
import NicotineScreen from '../screens/NicotineScreen';
import OrderScreen from '../screens/OrderScreen';
import MenuScreen from '../screens/MenuScreen';

const Tab = createBottomTabNavigator();

const ACTIVE_COLOR = '#0166dc';
const CARD_BG = '#FFFFFF';
const MUTED = '#64748B';

/** Renders a tab icon with lucide-react icon or custom image + label */
function TabIcon({
  Icon,
  imageSource,
  label,
  focused,
}: {
  Icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  imageSource?: any;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      {imageSource ? (
        <View style={[styles.tabImageWrapper, focused && styles.tabImageWrapperActive]}>
          <Image
            source={imageSource}
            style={styles.tabImage}
            resizeMode="cover"
          />
        </View>
      ) : Icon ? (
        <Icon
          size={20}
          color={focused ? ACTIVE_COLOR : MUTED}
          strokeWidth={focused ? 2.4 : 1.8}
        />
      ) : null}
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? 24 : Math.max(insets.bottom, 12);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          {
            height: Platform.OS === 'ios' ? 88 : 62 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
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
        name="Cannabis"
        component={CannabisScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
            Icon={Cannabis}
              // imageSource={require('../assets/Images/Nicotine.png')}
              label="Cannabis"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Nicotine"
        component={NicotineScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
            Icon={Cigarette}
              // imageSource={require('../assets/Images/cannabis.png')}
              label="Nicotine"
              focused={focused}
            />
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

      {/* Legacy Categories route fallback (hidden from tab bar) */}
      <Tab.Screen
        name="Categories"
        component={CannabisScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
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
    elevation: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 12,
    minWidth: 56,
    maxWidth: 68,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  tabImageWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabImageWrapperActive: {
    borderColor: ACTIVE_COLOR,
    backgroundColor: '#DBEAFE',
  },
  tabImage: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 9,
    color: MUTED,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '800',
  },
});

export default BottomTabNavigator;
