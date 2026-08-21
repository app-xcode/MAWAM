// constants/Alerts.ts

import Toast from 'react-native-toast-message';

type AlertType = 'success' | 'error' | 'info';
type AlertPosition = 'top' | 'bottom';

export default function Alerts(
    text: string,
    type: AlertType = 'info',
    position: AlertPosition = 'bottom'
) {
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
