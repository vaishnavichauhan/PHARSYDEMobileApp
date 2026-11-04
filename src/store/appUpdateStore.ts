import { create } from 'zustand';
import { Linking, Alert } from 'react-native';
import {
  CURRENT_APP_VERSION,
  normalizeAppVersion,
  API_ENDPOINTS,
} from '../config/api';

export interface AppUpdateState {
  currentVersion: string;
  cleanCurrentVersion: string;
  latestVersion: string | null;
  minSupportedVersion: string | null;
  updateRequired: boolean;
  forceUpdate: boolean;
  downloadUrl: string;
  releaseNotes: string;
  status: 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'error';
  message: string;
  isModalVisible: boolean;
  lastChecked: string | null;

  // Actions
  checkForUpdates: (isManual?: boolean) => Promise<{ updateRequired: boolean; message: string }>;
  performUpdate: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
}

export const useAppUpdateStore = create<AppUpdateState>((set, get) => ({
  currentVersion: CURRENT_APP_VERSION,
  cleanCurrentVersion: normalizeAppVersion(CURRENT_APP_VERSION),
  latestVersion: null,
  minSupportedVersion: null,
  updateRequired: false,
  forceUpdate: false,
  downloadUrl: 'https://pharsyde.jeenhost.in/uploads/apk/app-release.apk',
  releaseNotes: 'Performance improvements, checkout optimizations, and bug fixes.',
  status: 'idle',
  message: '',
  isModalVisible: false,
  lastChecked: null,

  checkForUpdates: async (isManual = false) => {
    const { cleanCurrentVersion } = get();

    set({ status: 'checking', message: 'Checking backend for updates...' });

    try {
      const url = `${API_ENDPOINTS.checkUpdate}?version=${encodeURIComponent(cleanCurrentVersion)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-app-version': cleanCurrentVersion,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const latest = (data.latestVersion || cleanCurrentVersion).trim();
        const cleanLatest = normalizeAppVersion(latest);
        const isDifferent = cleanLatest !== cleanCurrentVersion;
        const updateRequired = Boolean(data.updateRequired || isDifferent);
        const forceUpdate = Boolean(data.forceUpdate);
        const downloadUrl = data.downloadUrl || API_ENDPOINTS.appDownload;
        const releaseNotes = data.releaseNotes || 'New features and security enhancements.';
        const message = updateRequired
          ? `A new version (v${latest}) is available.`
          : `App is up to date (v${cleanCurrentVersion}). No update required.`;

        set({
          latestVersion: latest,
          minSupportedVersion: data.minSupportedVersion || null,
          updateRequired,
          forceUpdate,
          downloadUrl,
          releaseNotes,
          status: updateRequired ? 'update-available' : 'up-to-date',
          message,
          lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          // Automatically show modal on launch if an update is required
          isModalVisible: updateRequired,
        });

        if (isManual) {
          if (updateRequired) {
            Alert.alert(
              'App Update Available',
              `Version ${latest} is now available (Current: ${cleanCurrentVersion}).\n\nRelease notes: ${releaseNotes}`,
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Update App',
                  style: 'default',
                  onPress: () => get().performUpdate(),
                },
              ],
            );
          } else {
            Alert.alert(
              'App Up to Date',
              `You are using the latest version of Pharsyde (v${cleanCurrentVersion}). No update is required.`,
              [{ text: 'Great', style: 'default' }],
            );
          }
        }

        return { updateRequired, message };
      } else {
        const fallbackMsg = data.message || 'Unable to verify app version.';
        set({
          status: 'up-to-date', // fallback gracefully
          message: fallbackMsg,
        });
        if (isManual) {
          Alert.alert('App Version Check', fallbackMsg);
        }
        return { updateRequired: false, message: fallbackMsg };
      }
    } catch (err: any) {
      console.warn('[AppUpdate] Version check failed:', err);
      const errorMsg = 'Could not reach server to verify version.';
      set({ status: 'error', message: errorMsg });
      if (isManual) {
        Alert.alert('Network Notice', 'Could not check for updates. Please check your internet connection.');
      }
      return { updateRequired: false, message: errorMsg };
    }
  },

  performUpdate: async () => {
    const { downloadUrl } = get();
    const targetUrl = downloadUrl || API_ENDPOINTS.appDownload;

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        // Fallback directly to API download URL
        await Linking.openURL(API_ENDPOINTS.appDownload);
      }
    } catch (err) {
      console.warn('[AppUpdate] Error opening download URL:', err);
      Alert.alert(
        'Update Link',
        `Please open this link in your browser to download the latest APK:\n\n${targetUrl}`,
        [
          { text: 'Copy Link', onPress: () => Linking.openURL(targetUrl) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  },

  openModal: () => set({ isModalVisible: true }),
  closeModal: () => set({ isModalVisible: false }),
}));

