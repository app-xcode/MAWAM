import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import Alerts from "@/constants/Alerts";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/utils/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

type ConfirmationState = "checking" | "success" | "pending" | "error";

export default function EmailConfirmedScreen() {
  const { isDark } = useTheme();
  const colorScheme = isDark ? "dark" : "light";
  const primaryColor = Colors[colorScheme].text;
  const [state, setState] = useState<ConfirmationState>("checking");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    const handleConfirmationUrl = async (url: string | null) => {
      if (!url) {
        if (isMounted) setState("error");
        return;
      }

      try {
        const hash = url.split("#")[1] || "";
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const code = new URL(url).searchParams.get("code");

        const result = code
          ? await supabase.auth.exchangeCodeForSession(code)
          : accessToken && refreshToken
            ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            : { error: new Error("Tautan konfirmasi tidak lengkap.") };

        if (result.error) throw result.error;

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user?.email) throw error || new Error("Data pengguna tidak ditemukan.");

        if (isMounted) {
          setEmail(user.email);
          setState(user.new_email ? "pending" : "success");
        }
      } catch (error) {
        console.log(error);
        Alerts("Tautan konfirmasi email tidak valid atau sudah kedaluwarsa.", "error");
        if (isMounted) setState("error");
      }
    };

    Linking.getInitialURL().then(handleConfirmationUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => handleConfirmationUrl(url));

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const content = {
    success: {
      icon: "checkmark-circle-outline" as const,
      title: "Email berhasil diperbarui",
      description: `Email akun Anda sekarang adalah ${email}.`,
    },
    pending: {
      icon: "mail-unread-outline" as const,
      title: "Konfirmasi masih diperlukan",
      description: "Supabase masih menunggu konfirmasi dari alamat email lainnya sebelum perubahan email diterapkan.",
    },
    error: {
      icon: "alert-circle-outline" as const,
      title: "Tautan tidak dapat digunakan",
      description: "Tautan mungkin sudah kedaluwarsa atau telah digunakan. Coba ajukan perubahan email kembali dari halaman akun.",
    },
  };

  if (state === "checking") {
    return <View style={styles.loading}><ActivityIndicator size="large" color={primaryColor} /><ThemedText>Memverifikasi perubahan email...</ThemedText></View>;
  }

  const current = content[state];
  return <>
    <Stack.Screen options={{ title: "Konfirmasi Email" }} />
    <ThemedView style={styles.page}>
      <ThemedView style={styles.card}>
        <View style={[styles.icon, { backgroundColor: `${primaryColor}1A` }]}><Ionicons name={current.icon} size={36} color={primaryColor} /></View>
        <ThemedText style={styles.title}>{current.title}</ThemedText>
        <ThemedText style={styles.description}>{current.description}</ThemedText>
        <TouchableOpacity onPress={() => router.replace("/akun")} style={[styles.button, { backgroundColor: primaryColor }]}>
          <ThemedText style={[styles.buttonText, { color: Colors[colorScheme].background }]}>Kembali ke Akun</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  </>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  page: { flex: 1, justifyContent: "center", padding: 20 },
  card: { borderRadius: 12, padding: 24, alignItems: "center", gap: 14 },
  icon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  description: { opacity: 0.72, textAlign: "center", lineHeight: 21 },
  button: { width: "100%", marginTop: 8, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { fontWeight: "700" },
});
