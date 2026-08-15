import { View, Image, useColorScheme } from "react-native";

export default function SplashScreen() {
  const theme = useColorScheme(); // 'dark' | 'light'

  const isDark = theme === "dark";

  return (
    <View
      key={Date.now().toString()}
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Image
        source={isDark ? require("@/assets/images/splash-icon-light.png") : require("@/assets/images/splash-icon-dark.png")}
        style={{ width: 200, height: 200, marginBottom: 20 }}
        resizeMode="contain"
      />
    </View>
  );
}