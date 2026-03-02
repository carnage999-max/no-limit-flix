import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { apiClient } from '../lib/api';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

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

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getSessions(true);
      setSessions(data.sessions || []);
      setHistory(data.history || []);
      setPrimaryDeviceId(data.primaryDeviceId || null);
      setMaxDevices(typeof data.maxDevices === 'number' ? data.maxDevices : null);
    } catch (error: any) {
      showToast({ message: error?.message || 'Failed to load devices.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleLogoutAll = () => {
    setConfirmAllOpen(true);
  };

  const handleLogoutDevice = (sessionId: string, isCurrent: boolean) => {
    setConfirmSession({ sessionId, isCurrent });
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
                  {session.deviceName
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
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => handleLogoutDevice(session.sessionId, session.isCurrent)}
              >
                <Text style={styles.logoutText}>Log out this device</Text>
              </TouchableOpacity>
              {session.deviceId && session.deviceId !== primaryDeviceId ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={async () => {
                    try {
                      await apiClient.setPrimaryDevice(session.deviceId);
                      setPrimaryDeviceId(session.deviceId);
                      showToast({ message: 'Primary device updated.', type: 'success' });
                      await loadSessions();
                    } catch (error: any) {
                      showToast({ message: error?.message || 'Failed to set primary device.', type: 'error' });
                    }
                  }}
                >
                  <Text style={styles.primaryButtonText}>Set as primary</Text>
                </TouchableOpacity>
              ) : null}
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
              {showHistory && (
                <View style={styles.historyList}>
                  {history.map((session) => (
                    <View key={`history-${session.id}`} style={styles.historyCard}>
                      <Text style={styles.historyLabel}>
                        {session.deviceName || session?.device?.deviceLabel || 'Device'}
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
            await apiClient.logoutAllSessions();
            showToast({ message: 'Logged out everywhere.', type: 'success' });
            await signOut();
          } catch (error: any) {
            showToast({ message: error?.message || 'Logout failed.', type: 'error' });
          }
        }}
      />
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
            showToast({ message: error?.message || 'Logout failed.', type: 'error' });
          }
        }}
      />
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
  logoutButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  logoutText: {
    color: COLORS.accent.red,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: '#93C5FD',
    fontWeight: '700',
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
});
