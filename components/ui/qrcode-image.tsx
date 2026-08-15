import { View, StyleSheet } from 'react-native';
import { ImageLoad } from './Imageload';
export const QrCodeImage = (props: any) => {
    return (
        <View
            style={[styles.container, {
                width: props.size, height: props.size
            }]}
        >
            <ImageLoad
                ref={props.ref}
                source={{ uri: createUrlQr(props, 500) }}
                style={[styles.image, props.bgStyle, { width: props.size }]}
                contentFit="cover"
                contentPosition="center"
            />
            {props.children}
        </View>
    );
};
export function createUrlQr(props: any, size=500) {
    const bg = props.backgroundColor ? props.backgroundColor.replace(`#`, ``) : 'ffffff';
    const color = props.color ? props.color.replace(`#`, ``) : 'ffffff';
    return `https://qrcode-image-xcode.vercel.app/qrcode.png?text=${encodeURIComponent(props.value)}&logo=${encodeURIComponent(props?.logo)}&size=${size}&bg=${bg}&color=${color}`;
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        overflow: 'hidden',
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center'
    },
    image: {
        width: "100%",
        aspectRatio: 1 / 1
    },
});