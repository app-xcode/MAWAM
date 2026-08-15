import * as Device from 'expo-device';
import { Image } from 'expo-image';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Animated, Platform, View } from 'react-native';

const ImageLoadIOS = (props: any) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const [complete, setComplete] = useState(false);
    const animation = useRef<Animated.CompositeAnimation | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [currentSource, setCurrentSource] = useState(props.source);
    useEffect(() => {
        setCurrentSource(props.source);
    }, [props.source]);
    const handleError = () => {
        animation.current?.stop();
        setComplete(true); // Stop loading animation
        setCurrentSource({ uri: 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp' });
    };
    const onLoadStart = () => {
        if (complete) return;

        animation.current = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: Platform.OS !== "web",
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: Platform.OS !== "web",
                }),
            ])
        );

        animation.current.start();
    };
    const onLoadEnd = () => {
        animation.current?.stop(); // 🔥 penting
        setComplete(true);
    };
    const onLoad = () => {
        let times = 0;
        intervalRef.current = setInterval(() => {
            if (complete) {
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: Platform.OS !== "web",
                }).start();
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
            else if (times > 2) {
                setComplete(true);
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
            times++;
        }, 500);
    };

    useEffect(() => {
        return () => {
            animation.current?.stop();
        };
    }, []);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        complete && onLoad();
        setTimeout(() => {
            opacity.setValue(1);
        }, 2000);
    }, [complete]);
    return (
        <Animated.View style={{ opacity }}>
            <View style={[{ overflow: 'hidden' }, props.style]}>
                <Image
                    source={currentSource} // Pakai state currentSource
                    style={props.style}
                    onLoadStart={onLoadStart}
                    onLoadEnd={onLoadEnd}
                    onError={handleError} // 🔥 Tambahkan ini
                    onLoad={props.onLoad}
                    contentFit={props.contentFit || props.resizeMode || 'cover'}
                    ref={props.ref}
                    id='area-qr'
                />
            </View>
        </Animated.View>
    );
};

const ImageLoadAndroid = forwardRef((props: any, ref: any) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentSource, setCurrentSource] = useState(props.source);
    useEffect(() => {
        setCurrentSource(props.source);
    }, [props.source]);
    const handleError = () => {
        setCurrentSource({ uri: 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp' });
    };
    return (
        <View style={[{ overflow: 'hidden' }, props.style]}>
            <Image
                source={currentSource}
                style={[
                    props.style,
                    { opacity: isLoaded ? 1 : 0 }
                ]}
                onLoadEnd={() => setIsLoaded(true)}
                onError={handleError} // 🔥 Tambahkan ini
                onLoad={props.onLoad}
                contentFit={props.contentFit ?? 'cover'}
                ref={ref}
            />

            {/* Tampilan Placeholder selama proses muat */}
            {!isLoaded && (
                <View style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: '#79797928'
                }} />
            )}
        </View>
    );
});

export const ImageLoad = (props: any) => {
    const url = props?.source?.uri;
    let size = props?.style?.height || props?.style?.width;
    if (!size) {
        const targetStyle = props?.style?.find((s: any) => s.width || s.height);
        size = targetStyle?.width || targetStyle?.height;
    }
    if (typeof size == 'string' && size.includes('%')) {
        size = parseInt(size.replace('%', ''))
        size = 500 * (size / 100);
    }
    if (url && url.startsWith('https://') && size) {
        const newUrl = `https://cros-image.vercel.app/?quest=` + encodeURIComponent(url) + `&size=${size}`
        props.source.uri = newUrl;
    }
    const isHighEnd = (Device.totalMemory ?? 0) > 3000000000;
    if (Platform.OS === 'android') {
        return isHighEnd ? <ImageLoadIOS {...props} /> : <ImageLoadAndroid {...props} />;
    }
    return <ImageLoadIOS {...props} />;
}