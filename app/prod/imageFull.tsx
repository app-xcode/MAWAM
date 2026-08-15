import { ThemedText } from "@/components/themed-text"
import { Colors } from '@/constants/theme'
import Ionicons from "@expo/vector-icons/Ionicons"
import React, { useState } from "react"
import { Dimensions, Platform, StyleSheet, TouchableOpacity, View } from "react-native"
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
const imageDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';


const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

export default function ImageFull({ ShowImage, setShowImage, ratio }: any) {
    const iconSize = 16;
    const { height } = Dimensions.get("window");

    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = e.scale;
        });

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = e.translationX;
            translateY.value = e.translationY;
        });

    const gesture = Gesture.Simultaneous(pinch, pan);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ]
    }));
    const [currentSource, setCurrentSource] = useState(ShowImage ? {
        uri: ShowImage?.startsWith('https://') ?
            'https://cros-image.vercel.app/?quest=' + encodeURIComponent(ShowImage) + '&size=' + height : ShowImage

    } : {uri:imageDefault});
    return (
        <React.Fragment>
            <GestureDetector gesture={gesture}>
                <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: -5 }}>

                    <Animated.Image
                        source={currentSource}
                        style={[
                            { width: Platform.OS === 'web' ? 'auto' : 'auto', borderRadius: 10, aspectRatio: ratio, height: height - 150, objectFit: 'contain', resizeMode: 'contain', marginVertical: 'auto' },
                            animatedStyle
                        ]}
                        onError={() => {
                            setCurrentSource({uri:imageDefault});
                        }}
                    />
                </Animated.View>
            </GestureDetector>
            <TouchableOpacity onPress={() => { setShowImage(false) }} style={[{ position: 'absolute', left: '50%', zIndex: 2, bottom: 0, width: '100%', opacity: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15, borderRadius: 20, transform: [{ translateX: '-50%' }] }, styles.button]}>
                <View style={{ flexDirection: 'row', justifyContent:'center',alignItems:'center'}}>
                    <Ionicons name="arrow-back" size={iconSize} color={styles.buttonText.color} />
                    <ThemedText style={[{ marginLeft: 5 }, styles.buttonText]}>Kembali</ThemedText>
                </View>
            </TouchableOpacity>
        </React.Fragment>
    )
}



const styles = StyleSheet.create({
    button: {
        marginTop: 10,
        backgroundColor: ColorDark,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },

    buttonText: {
        color: ColorLight,
        fontWeight: '600',
    },
})