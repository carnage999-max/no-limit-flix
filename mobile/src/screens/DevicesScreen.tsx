import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { apiClient } from '../lib/api';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getUserFacingError } from '../lib/errors';

export const DevicesScreen = ({ navigation }: any) => {
  const { signOut, user } = useSession();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [primaryDeviceId, setPrimaryDeviceId] = useState<string | null>(null);
  const [maxDevices, setMaxDevices] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [confirmSession, setConfirmSession] = useState<{ sessionId: string; isCurrent: boolean } | null>(null);
  const [confirmPrimary, setConfirmPrimary] = useState<any | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [keepPrimary, setKeepPrimary] = useState(true);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [draftNickname, setDraftNickname] = useState('');
  const [draftEmoji, setDraftEmoji] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const emojiOptions = [
    { label: 'Work', emoji: '💼' },
    { label: 'Home', emoji: '🏠' },
    { label: 'Shop', emoji: '🛍️' },
    { label: 'Church', emoji: '⛪' },
    { label: 'Travel', emoji: '✈️' },
    { label: 'Studio', emoji: '🎬' },
    { label: 'Gym', emoji: '🏋️' },
    { label: 'Cafe', emoji: '☕' },
    { label: 'Gaming', emoji: '🎮' },
  ];

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getSessions(true);
      setSessions(data.sessions || []);
      setHistory(data.history || []);
      setPrimaryDeviceId(data.primaryDeviceId || null);
      setMaxDevices(typeof data.maxDevices === 'number' ? data.maxDevices : null);
    } catch (error: any) {
      showToast({ message: getUserFacingError(error, ['failed to fetch sessions', 'failed to load devices']), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleLogoutAll = () => {
    setKeepPrimary(true);
    setConfirmAllOpen(true);
  };

  const handleLogoutDevice = (sessionId: string, isCurrent: boolean) => {
    setConfirmSession({ sessionId, isCurrent });
  };

  const handleSaveLabel = async (deviceId: string) => {
    try {
      await apiClient.updateDeviceLabel({ deviceId, nickname: draftNickname, emoji: draftEmoji });
      showToast({ message: 'Device label updated.', type: 'success' });
      setEditingDeviceId(null);
      await loadSessions();
    } catch (error: any) {
      showToast({ message: getUserFacingError(error, ['failed to update device label']), type: 'error' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Devices</Text>
        <View style={styles.headerSpacer} />
      </View>
      {maxDevices ? (
        <Text style={styles.subTitle}>{sessions.length}/{maxDevices} active devices</Text>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold.mid} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {sessions.map((session) => (
            <View key={session.sessionId} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.deviceLabel}>
                  {session.deviceEmoji ? `${session.deviceEmoji} ` : ''}
                  {session.deviceNickname
                    ? session.deviceNickname
                    : session.deviceName
                      ? (user?.username ? `${user.username}'s ${session.deviceName}` : session.deviceName)
                      : (session?.device?.deviceLabel || 'Device')}
                </Text>
                {session.isCurrent ? <Text style={styles.currentTag}>This device</Text> : null}
                {session.deviceId && primaryDeviceId === session.deviceId ? (
                  <Text style={styles.primaryTag}>Primary</Text>
                ) : null}
              </View>
              <Text style={styles.metaText}>
                {session?.location?.city || 'Unknown city'} · {session?.location?.country || 'Unknown country'}
              </Text>
              <Text style={styles.metaText}>
                Last active {new Date(session.lastUsedAt || session.createdAt).toLocaleString()}
              </Text>
              <View style={styles.menuWrapper}>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setOpenMenuId((prev) => (prev === session.sessionId ? null : session.sessionId))}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.text} />
                  <Text style={styles.menuButtonText}>Manage</Text>
                </TouchableOpacity>
                {openMenuId === session.sessionId ? (
                  <View style={styles.menuPanel}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setOpenMenuId(null);
                        setEditingDeviceId(session.deviceId);
                        setDraftNickname(session.deviceNickname || '');
                        setDraftEmoji(session.deviceEmoji || '');
                      }}
                    >
                      <Text style={styles.menuItemText}>Edit label</Text>
                    </TouchableOpacity>
                    {session.deviceId && session.deviceId !== primaryDeviceId ? (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setOpenMenuId(null);
                          setConfirmPrimary(session);
                        }}
                      >
                        <Text style={[styles.menuItemText, styles.menuItemPrimary]}>Set as primary</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setOpenMenuId(null);
                        handleLogoutDevice(session.sessionId, session.isCurrent);
                      }}
                    >
                      <Text style={[styles.menuItemText, styles.menuItemDanger]}>Log out this device</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
          {sessions.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No active sessions.</Text>
            </View>
          )}

          <View style={styles.logoutAllCard}>
            <Text style={styles.logoutAllTitle}>Log out everywhere</Text>
            <Text style={styles.logoutAllSubtitle}>
              Ends all active sessions on every device.
            </Text>
            <TouchableOpacity onPress={handleLogoutAll} style={styles.logoutAllAction}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.background} />
              <Text style={styles.logoutAllActionText}>Log out all devices</Text>
            </TouchableOpacity>
          </View>

          {history.length > 0 && (
            <View style={styles.historySection}>
              <TouchableOpacity onPress={() => setShowHistory((prev) => !prev)} style={styles.historyToggle}>
                <Text style={styles.historyToggleText}>{showHistory ? 'Hide' : 'View'} device history</Text>
                <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.silver} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirmClearHistory(true)} style={styles.clearHistoryButton}>
                <Text style={styles.clearHistoryText}>Clear history</Text>
              </TouchableOpacity>
              {showHistory && (
                <View style={styles.historyList}>
                  {history.map((session) => (
                    <View key={`history-${session.id}`} style={styles.historyCard}>
                      <Text style={styles.historyLabel}>
                        {session.deviceEmoji ? `${session.deviceEmoji} ` : ''}
                        {session.deviceNickname || session.deviceName || session?.device?.deviceLabel || 'Device'}
                      </Text>
                      <Text style={styles.metaText}>
                        Last active {new Date(session.lastUsedAt || session.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
      <ConfirmDialog
        visible={confirmAllOpen}
        title="Log out everywhere"
        message="This will sign you out on all devices."
        confirmText="Log out"
        tone="danger"
        onCancel={() => setConfirmAllOpen(false)}
        onConfirm={async () => {
          setConfirmAllOpen(false);
          try {
            const res = await apiClient.logoutAllSessions(keepPrimary);
            showToast({ message: keepPrimary ? 'Logged out other devices.' : 'Logged out everywhere.', type: 'success' });
            if (res?.loggedOutCurrent) {
              await signOut();
            } else {
              await loadSessions();
            }
          } catch (error: any) {
            showToast({ message: getUserFacingError(error, ['failed to log out all devices', 'logout failed']), type: 'error' });
          }
        }}
      >
        <TouchableOpacity
          onPress={() => setKeepPrimary((prev) => !prev)}
          style={styles.checkboxRow}
        >
          <View style={[styles.checkboxBox, !keepPrimary && styles.checkboxBoxActive]}>
            {!keepPrimary ? <Ionicons name="checkmark" size={14} color={COLORS.background} /> : null}
          </View>
          <Text style={styles.checkboxText}>Also log out the primary device</Text>
        </TouchableOpacity>
      </ConfirmDialog>
      <ConfirmDialog
        visible={!!confirmSession}
        title="Log out device"
        message="This device will be signed out."
        confirmText="Log out"
        tone="danger"
        onCancel={() => setConfirmSession(null)}
        onConfirm={async () => {
          if (!confirmSession) return;
          const { sessionId, isCurrent } = confirmSession;
          setConfirmSession(null);
          try {
            const res = await apiClient.logoutSession(sessionId);
            showToast({ message: 'Device logged out.', type: 'success' });
            if (res?.loggedOutCurrent || isCurrent) {
              await signOut();
            } else {
              await loadSessions();
            }
          } catch (error: any) {
            showToast({ message: getUserFacingError(error, ['failed to log out device', 'logout failed']), type: 'error' });
          }
        }}
      />
      <ConfirmDialog
        visible={!!confirmPrimary}
        title="Set as primary"
        message="This device will become your primary device."
        confirmText="Set primary"
        tone="default"
        onCancel={() => setConfirmPrimary(null)}
        onConfirm={async () => {
          if (!confirmPrimary?.deviceId) return;
          setConfirmPrimary(null);
          try {
            await apiClient.setPrimaryDevice(confirmPrimary.deviceId);
            setPrimaryDeviceId(confirmPrimary.deviceId);
            showToast({ message: 'Primary device updated.', type: 'success' });
            await loadSessions();
          } catch (error: any) {
            showToast({ message: getUserFacingError(error, ['failed to set primary device']), type: 'error' });
          }
        }}
      />
      <ConfirmDialog
        visible={confirmClearHistory}
        title="Clear device history"
        message="This will remove signed-out device history."
        confirmText="Clear history"
        tone="danger"
        onCancel={() => setConfirmClearHistory(false)}
        onConfirm={async () => {
          setConfirmClearHistory(false);
          try {
            await apiClient.clearDeviceHistory();
            showToast({ message: 'Device history cleared.', type: 'success' });
            await loadSessions();
          } catch (error: any) {
            showToast({ message: getUserFacingError(error, ['failed to clear device history']), type: 'error' });
          }
        }}
      />
      <ConfirmDialog
        visible={!!editingDeviceId}
        title="Edit device label"
        message="Choose an emoji and nickname for this device."
        confirmText="Save label"
        tone="default"
        onCancel={() => setEditingDeviceId(null)}
        onConfirm={async () => {
          if (!editingDeviceId) return;
          await handleSaveLabel(editingDeviceId);
        }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
          {emojiOptions.map((option) => (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.emojiChip,
                draftEmoji === option.emoji && styles.emojiChipActive
              ]}
              onPress={() => setDraftEmoji(option.emoji)}
            >
              <Text style={styles.emojiChipText}>{option.emoji} {option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={styles.nicknameInput}
          placeholder="Nickname (e.g. John’s Pixel)"
          placeholderTextColor={COLORS.silver}
          value={draftNickname}
          onChangeText={setDraftNickname}
        />
      </ConfirmDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 20,
  },
  subTitle: {
    color: COLORS.silver,
    fontSize: 12,
    paddingHorizontal: SPACING.xl,
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 32,
    height: 32,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 60,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  currentTag: {
    color: COLORS.gold.mid,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  primaryTag: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaText: {
    color: COLORS.silver,
    fontSize: 12,
  },
  menuWrapper: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  menuButton: {
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  menuButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 12,
  },
  menuPanel: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.2)',
    backgroundColor: 'rgba(14,14,16,0.98)',
    padding: 8,
    gap: 6,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  menuItemText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 12,
  },
  menuItemPrimary: {
    color: '#93C5FD',
  },
  menuItemDanger: {
    color: COLORS.accent.red,
  },
  emojiRow: {
    gap: 8,
    paddingVertical: 4,
  },
  emojiChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emojiChipActive: {
    borderColor: 'rgba(212,175,55,0.6)',
    backgroundColor: 'rgba(212,175,55,0.2)',
  },
  emojiChipText: {
    color: COLORS.text,
    fontSize: 12,
  },
  nicknameInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.25)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.silver,
  },
  logoutAllCard: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    padding: 16,
    gap: 10,
  },
  logoutAllTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutAllSubtitle: {
    color: COLORS.silver,
    fontSize: 12,
    lineHeight: 18,
  },
  logoutAllAction: {
    marginTop: 4,
    backgroundColor: COLORS.accent.red,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutAllActionText: {
    color: COLORS.background,
    fontWeight: '800',
  },
  historySection: {
    marginTop: 16,
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  historyToggleText: {
    color: COLORS.silver,
    fontWeight: '600',
  },
  clearHistoryButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  clearHistoryText: {
    color: COLORS.accent.red,
    fontWeight: '700',
  },
  historyList: {
    marginTop: 8,
    gap: 10,
  },
  historyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.15)',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  historyLabel: {
    color: COLORS.text,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: COLORS.accent.red,
    borderColor: COLORS.accent.red,
  },
  checkboxText: {
    color: COLORS.silver,
    fontSize: 12,
  },
});
