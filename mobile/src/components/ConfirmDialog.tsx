import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../theme/tokens';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, tone === 'danger' && styles.dangerButton]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmText, tone === 'danger' && styles.dangerText]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: COLORS.silver,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.4)',
  },
  cancelText: {
    color: COLORS.silver,
    fontWeight: '600',
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.gold.mid,
  },
  confirmText: {
    color: COLORS.background,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: COLORS.accent.red,
  },
  dangerText: {
    color: '#fff',
  },
});
