// constants/Alerts.ts

import Toast from 'react-native-toast-message';

type AlertType = 'success' | 'error' | 'info';
type AlertPosition = 'top' | 'bottom';

export interface AlertOptions {
    confirm?: boolean;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
}

export default function Alerts(
    text: string,
    type: AlertType = 'info',
    position: AlertPosition = 'bottom',
    options?: AlertOptions
) {
    if (options?.confirm) {
        Toast.show({
            type: 'custom_confirm',
            position: 'top',
            visibilityTime: 0,
            autoHide: false,
            props: {
                title: options.title || 'Konfirmasi',
                message: text,
                type,
                confirmText: options.confirmText || 'Ya',
                cancelText: options.cancelText || 'Batal',
                onConfirm: () => {
                    Toast.hide();
                    options.onConfirm?.();
                },

                onCancel: () => {
                    Toast.hide();
                    options.onCancel?.();
                },
            },
        });

        return;
    }

    Toast.show({
        type,
        text1: text,
        position,
        visibilityTime: 3000,
        autoHide: true,
        props: {
            style: {
                zIndex: 9999,
                elevation: 9999,
            },
        },
    });
}