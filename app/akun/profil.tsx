import ThemedInput from "@/components/themed-input";
import { ThemedText } from "@/components/themed-text";
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

export default function ProfilScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const colorScheme = isDark ? "dark" : "light";
  const primaryColor = Colors[colorScheme].text;
  const contrastColor = Colors[colorScheme].background;
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (user === null) {
        router.replace("/akun");
        return;
      }

      const { data, error } = await supabase
        .from("mawam_profile")
        .select("nama")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        Alerts("Data akun tidak dapat dimuat.", "error");
      }

      setNama(data?.nama || user.user_metadata?.name || "");
      setEmail(user.email || "");
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const saveProfile = async () => {
    const normalizedName = nama.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!user || !normalizedName || !normalizedEmail) {
      Alerts("Nama dan email wajib diisi.", "error");
      return;
    }

    setSaving(true);
    const { error: profileError } = await supabase
      .from("mawam_profile")
      .update({ nama: normalizedName })
      .eq("id", user.id);

    if (profileError) {
      setSaving(false);
      Alerts("Nama akun gagal diperbarui.", "error");
      return;
    }

    const isEmailChanged = normalizedEmail !== user.email?.toLowerCase();
    const { error: authError } = await supabase.auth.updateUser(
      {
        ...(isEmailChanged ? { email: normalizedEmail } : {}),
        data: { ...user.user_metadata, name: normalizedName },
      },
      { emailRedirectTo: Linking.createURL("/akun/email-confirmed") },
    );
    setSaving(false);

    if (authError) {
      Alerts(authError.message, "error");
      return;
    }

    if (isEmailChanged) {
      Alerts("Nama diperbarui. Konfirmasi perubahan email melalui email yang dikirim Supabase.", "success");
      router.back();
      return;
    }

    Alerts("Data akun berhasil diperbarui.", "success");
    router.back();
  };

  return <>
    <Stack.Screen options={{ title: "Edit Akun" }} />
    <ThemedView style={styles.page}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.card}>
          <View style={[styles.icon, { backgroundColor: `${primaryColor}1A` }]}>
            <Ionicons name="person-outline" size={30} color={primaryColor} />
          </View>
          <ThemedText style={styles.title}>Data akun</ThemedText>
          <ThemedText style={styles.description}>Perbarui nama dan alamat email yang digunakan untuk akun Anda.</ThemedText>

          {loading ? <View style={styles.loading}><ActivityIndicator color={primaryColor} /></View> : <>
            <ThemedInput
              label={<ThemedText style={styles.label}>Nama</ThemedText>}
              value={nama}
              onChangeText={setNama}
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              editable={!saving}
            />
            <ThemedInput
              label={<ThemedText style={styles.label}>Email</ThemedText>}
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={saveProfile}
            />
            <ThemedView style={styles.notice}>
              <Ionicons name="information-circle-outline" size={19} color={primaryColor} />
              <ThemedText style={styles.noticeText}>Perubahan email memerlukan konfirmasi melalui email.</ThemedText>
            </ThemedView>
            <TouchableOpacity disabled={saving} onPress={saveProfile} style={[styles.button, { backgroundColor: primaryColor }, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color={contrastColor} /> : <ThemedText style={[styles.buttonText, { color: contrastColor }]}>Simpan Perubahan</ThemedText>}
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
  loading: { alignItems: "center", paddingVertical: 30 },
  notice: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 8, backgroundColor: "#8888881A" },
  noticeText: { flex: 1, opacity: 0.8, lineHeight: 19 },
  button: { marginTop: 8, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
