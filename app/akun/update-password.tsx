import { ThemedText } from "@/components/themed-text";
import ThemedInput from "@/components/themed-input";
import { ThemedView } from "@/components/themed-view";
import Alerts from "@/constants/Alerts";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/utils/auth";
import { useTheme } from "@/utils/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function UpdatePasswordScreen() {
  const { session } = useAuth();
  const { isDark } = useTheme();
  const colorScheme = isDark ? "dark" : "light";
  const primaryColor = Colors[colorScheme].text;
  const contrastColor = Colors[colorScheme].background;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleRecoveryUrl = async (url: string | null) => {
      if (!url) {
        if (isMounted) setCheckingLink(false);
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
            : { error: new Error("Tautan pemulihan tidak lengkap.") };

        if (result.error) throw result.error;
        if (isMounted) setRecoverySessionReady(true);
      } catch (error) {
        console.log(error);
        Alerts("Tautan reset password tidak valid atau sudah kedaluwarsa.", "error");
      } finally {
        if (isMounted) setCheckingLink(false);
      }
    };

    Linking.getInitialURL().then(handleRecoveryUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => handleRecoveryUrl(url));

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const canUpdatePassword = Boolean(session) || recoverySessionReady;

  const updatePassword = async () => {
    if (!canUpdatePassword) {
      Alerts("Buka halaman ini melalui tautan reset password dari email.", "error");
      return;
    }
    if (password.length < 6) {
      Alerts("Password minimal 6 karakter.", "error");
      return;
    }
    if (password !== confirmation) {
      Alerts("Konfirmasi password belum sama.", "error");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      Alerts(error.message, "error");
      return;
    }

    Alerts("Password berhasil diperbarui. Silakan masuk kembali.", "success");
    await supabase.auth.signOut();
    router.replace("/akun");
  };

  return <>
    <Stack.Screen options={{ title: "Atur Ulang Password" }} />
    <ThemedView style={styles.page}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.card}>
          <View style={[styles.icon, { backgroundColor: `${primaryColor}1A` }]}>
            <Ionicons name="lock-closed-outline" size={30} color={primaryColor} />
          </View>
          <ThemedText style={styles.title}>Buat password baru</ThemedText>
          <ThemedText style={styles.description}>Gunakan password baru minimal 6 karakter untuk akun MAWAM Anda.</ThemedText>

          {checkingLink ? <View style={styles.status}><ActivityIndicator color={primaryColor} /><ThemedText>Memverifikasi tautan...</ThemedText></View> : <>
            {!canUpdatePassword && <ThemedView style={styles.warning}><ThemedText style={styles.warningText}>Tautan reset tidak ditemukan. Kembali ke halaman akun untuk mengirim tautan baru.</ThemedText></ThemedView>}
            <ThemedInput
              label={<ThemedText style={styles.label}>Password baru</ThemedText>}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={canUpdatePassword && !submitting}
            />
            <ThemedInput
              label={<ThemedText style={styles.label}>Konfirmasi password baru</ThemedText>}
              value={confirmation}
              onChangeText={setConfirmation}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={updatePassword}
              editable={canUpdatePassword && !submitting}
            />
            <TouchableOpacity disabled={submitting} onPress={() => setShowPassword(!showPassword)} style={styles.showPassword}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={primaryColor} />
              <ThemedText style={{ color: primaryColor }}>{showPassword ? "Sembunyikan password" : "Tampilkan password"}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity disabled={!canUpdatePassword || submitting} onPress={updatePassword} style={[styles.button, { backgroundColor: primaryColor }, (!canUpdatePassword || submitting) && styles.disabled]}>
              {submitting ? <ActivityIndicator color={contrastColor} /> : <ThemedText style={[styles.buttonText, { color: contrastColor }]}>Simpan Password Baru</ThemedText>}
            </TouchableOpacity>
          </>}
        </ThemedView>
      </KeyboardAwareScrollView>
    </ThemedView>
  </>;
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  card: { borderRadius: 12, padding: 20, gap: 12 },
  icon: { alignSelf: "center", width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  description: { opacity: 0.7, textAlign: "center", lineHeight: 20, marginBottom: 6 },
  label: { marginBottom: 8 },
  status: { alignItems: "center", gap: 10, paddingVertical: 20 },
  warning: { padding: 12, borderRadius: 8, backgroundColor: "#F59E0B1A" },
  warningText: { opacity: 0.8, lineHeight: 19 },
  showPassword: { alignSelf: "flex-end", flexDirection: "row", gap: 6, alignItems: "center", marginTop: -2 },
  button: { marginTop: 8, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
