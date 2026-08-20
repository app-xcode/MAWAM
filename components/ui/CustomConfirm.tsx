// components/CustomConfirm.tsx

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/utils/theme';

interface Props {
  text1?: string;
  props?: {
    title?: string;
    message?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  };
}

export default function CustomConfirm({ props }: Props) {
  const { isDark } = useTheme();
  const scheme = isDark ? 'dark' : 'light';

  const [loading, setLoading] = React.useState(false);

  const icon =
    props?.type === 'success'
      ? 'checkmark-circle-outline'
      : props?.type === 'error'
        ? 'close-circle-outline'
        : props?.type === 'warning'
          ? 'warning-outline'
          : 'information-circle-outline';

  const color = Colors[scheme].tint;

  const handleConfirm = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await props?.onConfirm?.();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    props?.onCancel?.();
  };

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: Colors[scheme].background,
          },
        ]}
      >
        <Ionicons name={icon as any} size={42} color={color} />

        <Text
          style={[
            styles.title,
            { color: Colors[scheme].text },
          ]}
        >
          {props?.title || 'Konfirmasi'}
        </Text>

        <Text
          style={[
            styles.message,
            { color: Colors[scheme].text },
          ]}
        >
          {props?.message}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            disabled={loading}
            onPress={handleCancel}
            style={[
              styles.cancelButton,
              { borderColor: color },
            ]}
          >
            <Text style={{ color, fontWeight: '700' }}>
              {props?.cancelText || 'Batal'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={loading}
            onPress={handleConfirm}
            style={[
              styles.confirmButton,
              { backgroundColor: color },
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>
                {props?.confirmText || 'Ya'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    elevation: 10,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  title: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },

  message: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.75,
    marginTop: 8,
    textAlign: 'center',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 20,
  },

  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
  },

  confirmButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmText: {
    color: '#fff',
    fontWeight: '700',
  },

  disabled: {
    opacity: 0.55,
  },
});