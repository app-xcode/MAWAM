import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
export function BackgroundImage(props: any) {
  const [currentSource, setCurrentSource] = useState(props.source);
  useEffect(() => {
    setCurrentSource(props.source);
  }, [props.source]);
  const handleError = () => {
    setCurrentSource({uri:'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp'});
  };
  return (
    <View style={[styles.container]}>
      <Image
        source={currentSource}
        style={[styles.image, props.bgStyle]}
        contentFit="cover"
        contentPosition="center"
        blurRadius={props.blurRadius || 0} // ✅ pindahkan ke sini
        onError={handleError} // 🔥 Tangani error di sini
      />
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1, 
    transform:[{scale:1.3}]
  },
});