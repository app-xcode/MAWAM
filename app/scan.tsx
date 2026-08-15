import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import WebScanner from "@/components/webscanner";
import Alerts from "@/constants/Alerts";
import { Colors } from "@/constants/theme";
import Ionicons from '@expo/vector-icons/Ionicons';
import { decode as atob } from "base-64";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Platform, Text, TouchableOpacity, View } from "react-native";

const { width, height } = Dimensions.get("window");
const scanSize = 250;
const scanTop = (height / 2) - (scanSize / 2) - 60;
const scanleft = (width / 2) - (scanSize / 2);
const colorOverlay = "rgba(0, 0, 0, 0.09)";

export default function QRScanner() {
  const [permissionCamera, requestPermissionCamera] = useCameraPermissions();
  const [targetTop, settargetTop] = useState(scanTop);
  const [targetLeft, settargetLeft] = useState(scanleft);
  const [targetWidth, settargetWidth] = useState(scanSize);
  const [targetHeight, settargetHeight] = useState(scanSize);
  const [heightOld, setHeightOld] = useState(scanSize);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [data, setData] = useState<string | null>(null);

  const scanLine = useRef(new Animated.Value(0)).current;
  const [flash, setFlash] = useState<"off" | "on">("off");
  const resetSize = () => {
    settargetWidth(scanSize);
    settargetHeight(scanSize);
    settargetTop((height / 2) - (scanSize / 2) - 60);
    settargetLeft((width / 2) - (scanSize / 2));
    setScanned(false);

  }
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }

    return () => {
      if (Platform.OS === 'android') {
        ScreenOrientation.unlockAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (!scanned) {
      resetSize();
    }
  }, [scanned]);

  const startAnimation = useCallback(() => {
    scanLine.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    ).start();
  }, [scanLine]);

  useEffect(() => {
    const diff = heightOld > targetHeight ? heightOld - targetHeight : targetHeight - heightOld;
    if (diff > 100 || heightOld == targetHeight) {
      setHeightOld(targetHeight);
      startAnimation(); // mulai animasi baru
    }
  }, [targetHeight, startAnimation]);

  useFocusEffect(
    useCallback(() => {
      setDetailOpen(false);
      setScanned(false); // Reset status scan agar bisa scan lagi
      startAnimation();  // <--- Jalankan animasi di sini

      return () => {
        scanLine.stopAnimation(); // Bersihkan saat meninggalkan halaman
        setDetailOpen(true);
      };
    }, [startAnimation])
  );

  const decode = (id: string) => {
    id = id.replace(/X/g, '=')
    try {
      return atob(id);
    } catch (error) {
      return null;
    }
  }

  const handleScan = (result: any) => {
    if (result.bounds) {
      const top = result.bounds.origin.y;
      const left = result.bounds.origin.x;
      const w = result.bounds.size.width;
      const h = result.bounds.size.height;
      settargetTop(Platform.OS === 'android' ? (left < height / 2 ? left + 30 : top + 300) : top);
      settargetLeft(Platform.OS === 'android' ? (width - ((top - (w / 2) + w)) - 50) : left);
      settargetWidth(Platform.OS === 'android' ? h : w);
      settargetHeight(Platform.OS === 'android' ? w : h);
    }
    if (!scanned || (data != result.data && result.data)) {
      // const found = produk.find((item) => item.id === result.data);
      setScanned(true);
      setData(result.data);
      setTimeout(() => {
        let idTarget = result.data;
        const isUrl = /^http/i.test(idTarget)
        try {
          if (isUrl) {
            idTarget = idTarget.split('/');
            idTarget = idTarget.pop();
            if (idTarget.includes('id=')) {
              //maksud saya ubah ke url dulu
              const url = new URLSearchParams(result.data.split('?')[1]);
              idTarget = url.get('id') || idTarget;
            }
            const hasWord = !(/[a-z]/i.test(idTarget))
            idTarget = hasWord ? idTarget : decode(idTarget);
          }
          if (typeof idTarget === 'number' || !isNaN(Number(idTarget))) {
            setDetailOpen(true);
            router.navigate({
              pathname: "/prod/detail",
              params: { id: idTarget }
            });
          }
        } catch (error) {
          console.log("error navigating to detail", error);
          if (!isUrl) return;
          if (process.env.EXPO_OS !== 'web') {
            openBrowserAsync(result.data, {
              presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
            });
          }
          else window.open(result.data, '_blank');
          setDetailOpen(true);
        }
      }, 500);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setScanned(false);
    }, 200);

  };

  if (!permissionCamera) {
    return <View />;
  }

  const openLink = (url: string) => {
    const newTab = window.open(url, '_blank');
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      window.location.href = url;
    }
  };


  if (Platform.OS === 'web') {
    return (
      <React.Fragment>
        <WebScanner onflesh={flashOn} onScan={(id: any) => {
          let idTarget = id;
          const isUrl = /^http/i.test(idTarget)
          if (isUrl) {
            idTarget = idTarget.split('/');
            idTarget = idTarget.pop();
            if (idTarget.includes('id=')) {
              //maksud saya ubah ke url dulu
              const url = new URLSearchParams(id.split('?')[1]);
              idTarget = url.get('id') || idTarget;
            }
            const hasWord = !(/[a-z]/i.test(idTarget))
            idTarget = hasWord ? idTarget : decode(idTarget);
          }
          if (idTarget && (typeof idTarget === 'number' || !isNaN(Number(idTarget)))) {
            router.navigate(`/prod/detail?id=${idTarget}`), setFlashOn(false);
            return;
          } else {
            if (isUrl) {
              openLink(id);
              setFlashOn(false);
              return;
            }
            Alerts(id, "error");
          }
        }} key={Date.now()} />
        <TouchableOpacity
          onPress={() => setFlashOn(!flashOn)}
          style={{
            position: "absolute",
            bottom: 50,
            alignSelf: "center",
            backgroundColor: "#00000080",
            borderRadius: 50,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 13,
            aspectRatio: 1 / 1
          }}
        >
          <Ionicons
            name={flashOn ? "flash" : "flash-off"}
            size={16}
            color="white"
          />
        </TouchableOpacity>
      </React.Fragment>
    )
  } else {
    if (!permissionCamera.granted) {
      return (
        <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <ThemedText style={{ marginBottom: 8 }}>Kamera perlu izin</ThemedText>
          <TouchableOpacity onPress={requestPermissionCamera} style={{ backgroundColor: Colors['dark'].background, borderWidth: 1, borderColor: Colors['dark'].text, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 8, width: '100%' }}>
            <ThemedText style={{ color: Colors['dark'].text, textAlign: 'center' }}>
              Izinkan Kamera
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }
    return (
      <ThemedView style={{ flex: 1 }}>

        {!detailOpen && (
          <React.Fragment>
            <CameraView
              style={{ flex: 1, width, height }}
              // barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={detailOpen ? undefined : handleScan}
              enableTorch={flash === "on"}
              ratio="16:9"
              zoom={0}

            />
            {/* Area scan */}
            <View
              style={{
                width: targetWidth / 5,
                height: targetHeight / 5,
                borderTopWidth: targetWidth * 0.02,
                borderLeftWidth: targetWidth * 0.02,
                borderColor: "#00ffcc",
                position: 'absolute',
                top: targetTop,
                left: targetLeft
              }}
            ></View>
            <View
              style={{
                width: targetWidth / 5,
                height: targetHeight / 5,
                borderTopWidth: targetWidth * 0.02,
                borderRightWidth: targetWidth * 0.02,
                borderColor: "#00ffcc",
                position: 'absolute',
                top: targetTop,
                left: (targetLeft + targetWidth) - targetWidth / 5
              }}
            ></View>
            <View
              style={{
                width: targetWidth / 5,
                height: targetHeight / 5,
                borderBottomWidth: targetWidth * 0.02,
                borderRightWidth: targetWidth * 0.02,
                borderColor: "#00ffcc",
                position: 'absolute',
                top: (targetTop + targetHeight) - targetHeight / 5,
                left: (targetLeft + targetWidth) - targetWidth / 5
              }}
            ></View>
            <View
              style={{
                width: targetWidth / 5,
                height: targetHeight / 5,
                borderBottomWidth: targetWidth * 0.02,
                borderLeftWidth: targetWidth * 0.02,
                borderColor: "#00ffcc",
                position: 'absolute',
                top: (targetTop + targetHeight) - targetHeight / 5,
                left: targetLeft
              }}
            ></View>
            <View style={{ position: 'absolute', top: targetTop, width: targetWidth, left: targetLeft, height: targetHeight, backgroundColor: '#ffffff52' }}>
              <Animated.View
                style={{
                  left: 0,
                  top: 0,
                  width: targetWidth,
                  height: targetHeight * 0.005,
                  backgroundColor: "#00ffcc",
                  position: 'absolute',
                  transform: [{
                    translateY: scanLine.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, targetHeight]
                    })
                  }]
                }}
              />
            </View>
            <View style={{
              position: "absolute",
              top: 0,
              width: width,
              height: targetTop,
              backgroundColor: colorOverlay
            }} />
            {/* bawah */}
            <View style={{
              position: "absolute",
              top: targetHeight + targetTop,
              width: width,
              height: height - (targetHeight + targetTop),
              backgroundColor: colorOverlay
            }} />
            {/* kiri */}
            <View style={{
              position: "absolute",
              left: 0,
              top: targetTop,
              width: targetLeft,
              height: targetHeight,
              backgroundColor: colorOverlay
            }} />
            {/* kanan */}
            <View style={{
              position: "absolute",
              left: targetLeft + targetWidth,
              top: targetTop,
              width: width - (targetLeft + targetWidth),
              height: targetHeight,
              backgroundColor: colorOverlay
            }} />
            <TouchableOpacity
              onPress={() => setFlash(flash === "on" ? "off" : "on")}
              style={{
                position: "absolute",
                bottom: 50,
                alignSelf: "center",
                backgroundColor: "#00000080",
                padding: 12,
                borderRadius: 30
              }}
            >
               <Ionicons name={flash == "on" ? "flash" : "flash-off"} size={24} color="white" />
            </TouchableOpacity>
          </React.Fragment>
        )}
        {data && scanned && (
          <View
            style={{
              position: 'absolute',
              left: targetLeft,
              top: targetTop,
              width: targetWidth,
              height: targetHeight,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#00000025',
            }}
          >
            <Text
              numberOfLines={targetWidth < 100 ? 1 : 5}
              adjustsFontSizeToFit
              style={{
                color: "white",
                textAlign: 'center',
                width: "90%", // biar ada padding kiri kanan
              }}
            >
              {detailOpen ? '' : data}
            </Text>
          </View>
        )}
        {detailOpen && (<React.Fragment>
          <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', }}>
            <ThemedText>Menampilkan Hasil...</ThemedText>
            <TouchableOpacity onPress={() => {
              setDetailOpen(false);
              setScanned(false);
            }} style={{ marginTop: 20, backgroundColor: Colors['dark'].background, borderWidth: 1, borderColor: Colors['dark'].text, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 8 }}>
              <ThemedText style={{ color: Colors['dark'].text }}>
                Scan Lagi
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </React.Fragment>)}

      </ThemedView>
    );
  }
}