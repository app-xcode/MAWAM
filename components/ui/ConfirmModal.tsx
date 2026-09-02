import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/utils/theme';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: React.ReactNode;
};

export default function ConfirmModal({
  visible, title, message, confirmText = 'Ya', cancelText = 'Batal',
  variant = 'default', loading = false, onConfirm, onCancel,
}: ConfirmModalProps) {
  const { isDark } = useTheme();
  const scheme = isDark ? 'dark' : 'light';
  const destructive = variant === 'destructive';
  const color = destructive ? '#d32f2f' : Colors[scheme].tint;
  const icon = destructive ? 'trash-outline' : variant === 'success' ? 'checkmark-circle-outline' : variant === 'warning' ? 'warning-outline' : 'information-circle-outline';
  const close = () => { if (!loading) onCancel(); };

  const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, borderRadius: 16, padding: 22, alignItems: 'center' },
  title: { fontSize: 19, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  message: { marginTop: 8, textAlign: 'center', opacity: 0.8, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 },
  button: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  cancel: { borderWidth: 1 },
  confirmText: { color:isDark?'#000':'#fff', fontWeight: '700' },
  disabled: { opacity: 0.55 },
});

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <ThemedView style={styles.card}>
          <Ionicons name={icon as any} size={36} color={color} />
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>
          <View style={styles.actions}>
            <TouchableOpacity disabled={loading} onPress={close} style={[styles.button, styles.cancel, { borderColor: color }]}>
              <ThemedText style={{ color }}>{cancelText}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity disabled={loading} onPress={onConfirm} style={[styles.button, { backgroundColor: color }, loading && styles.disabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.confirmText}>{confirmText}</ThemedText>}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}


