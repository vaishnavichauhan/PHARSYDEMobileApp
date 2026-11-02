/**
 * @format
 *
 * NOTE: react-native-gesture-handler MUST be the very first import.
 * DO NOT call enableScreens() – React Native 0.88 uses New Architecture
 * (Bridgeless mode) which handles screens natively and does NOT support
 * the legacy enableScreens() call.
 */

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
