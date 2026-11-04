import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownCircle,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react-native';
import { useAppUpdateStore } from '../store/appUpdateStore';

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT_LIME = '#8EF705';
const ACCENT_GREEN = '#488203';

export default function AppUpdateModal() {
  const isModalVisible = useAppUpdateStore(state => state.isModalVisible);
  const cleanCurrentVersion = useAppUpdateStore(state => state.cleanCurrentVersion);
  const latestVersion = useAppUpdateStore(state => state.latestVersion);
  const forceUpdate = useAppUpdateStore(state => state.forceUpdate);
  const releaseNotes = useAppUpdateStore(state => state.releaseNotes);
  const performUpdate = useAppUpdateStore(state => state.performUpdate);
  const closeModal = useAppUpdateStore(state => state.closeModal);

  if (!isModalVisible) return null;

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="fade"
      onRequestClose={forceUpdate ? undefined : closeModal}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Close button (if not mandatory update) */}
          {!forceUpdate && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={closeModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          )}

          {/* Icon Header */}
          <View style={styles.iconCircle}>
            <ArrowDownCircle size={36} color={ACCENT_GREEN} strokeWidth={2.4} />
          </View>

          {/* Badge Tag */}
          <View style={[styles.badge, forceUpdate && styles.badgeMandatory]}>
            <Text style={[styles.badgeText, forceUpdate && styles.badgeTextMandatory]}>
              {forceUpdate ? 'MANDATORY UPDATE' : 'NEW VERSION AVAILABLE'}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Update Pharsyde App</Text>
          <Text style={styles.subtitle}>
            A newer version of the application is available on the server. Update now to enjoy the latest features and performance enhancements.
          </Text>

          {/* Version Comparison Card */}
          <View style={styles.versionCard}>
            <View style={styles.versionCol}>
              <Text style={styles.versionLabel}>Current</Text>
              <View style={styles.currentPill}>
                <Text style={styles.currentPillText}>v{cleanCurrentVersion}</Text>
              </View>
            </View>

            <ArrowRight size={20} color="#94A3B8" />

            <View style={styles.versionCol}>
              <Text style={styles.versionLabel}>Latest</Text>
              <View style={styles.latestPill}>
                <Sparkles size={12} color="#0F172A" style={{ marginRight: 4 }} />
                <Text style={styles.latestPillText}>v{latestVersion || 'Latest'}</Text>
              </View>
            </View>
          </View>

          {/* Release Notes */}
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <ShieldCheck size={14} color={ACCENT_GREEN} />
              <Text style={styles.notesHeaderTitle}>What&apos;s New:</Text>
            </View>
            <ScrollView style={styles.notesScroll} nestedScrollEnabled>
              <Text style={styles.notesText}>{releaseNotes}</Text>
            </ScrollView>
          </View>

          {/* CTA Action Buttons */}
          <View style={styles.actionsCol}>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={performUpdate}
              activeOpacity={0.85}>
              <ArrowDownCircle size={18} color="#0F172A" strokeWidth={2.4} />
              <Text style={styles.updateButtonText}>UPDATE APP NOW</Text>
            </TouchableOpacity>

            {!forceUpdate && (
              <TouchableOpacity
                style={styles.laterButton}
                onPress={closeModal}
                activeOpacity={0.75}>
                <Text style={styles.laterButtonText}>Remind Me Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(142, 247, 5, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(72, 130, 3, 0.12)',
    marginBottom: 8,
  },
  badgeMandatory: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: ACCENT_GREEN,
    letterSpacing: 0.8,
  },
  badgeTextMandatory: {
    color: '#DC2626',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: TEXT,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 16,
  },
  versionCol: {
    alignItems: 'center',
    gap: 4,
  },
  versionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  latestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_LIME,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  latestPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  notesCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 12,
    maxHeight: 120,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notesHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT,
    textTransform: 'uppercase',
  },
  notesScroll: {
    maxHeight: 80,
  },
  notesText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  actionsCol: {
    width: '100%',
    gap: 8,
    marginTop: 18,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT_LIME,
    height: 48,
    borderRadius: 14,
    shadowColor: ACCENT_LIME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  updateButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  laterButton: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
});

