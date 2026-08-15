import Toast from 'react-native-toast-message';

export default function Alerts(text: string, type: 'success' | 'error' | 'info' = 'info', position: 'top' | 'bottom' = 'bottom') {
    Toast.show({
        type: type,
        text1: text,
        position: position,
        visibilityTime: 3000,
        autoHide: true,
        props: {
            style: {
                zIndex: 9999,
                elevation: 9999,

            }
        }
    });
}
