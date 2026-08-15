import { deleteImage } from "@/app/prod/dataProduk";
import ThemedInput from "@/components/themed-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ImageLoad } from "@/components/ui/Imageload";
import Alerts from "@/constants/Alerts";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/utils/CartContext";
import { useTheme } from "@/utils/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function Akun() {
  const { isDark } = useTheme();
  const colorScheme = isDark ? "dark" : "light";
  const ColorBg = Colors[colorScheme].text;
  const ColorText = Colors[colorScheme].background;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [nama, setNama] = useState("");

  const [user, setUser] = useState<any>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setloading] = useState(0);
  const iconColor = Colors[isDark ? "dark" : "light"].text;
  const inIconColor = Colors[isDark ? "light" : "dark"].text;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [tokoSaya, setTokoSaya] = useState<any | null>(null);
  const { cart } = useCart();

  const [totalPesanan, setTotalPesanan] = useState({ belum_bayar: 0, dikemas: 0, dikirim: 0, selesai: 0 });

  const styles = StyleSheet.create({
    buttonAktifitas: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      width: `${100 / 2.1}%`,
      padding: 8,
      borderWidth: 1,
      borderColor: "#cccccc",
      borderRadius: 4,
    },
    button: {
      width: "49%",
      backgroundColor: ColorBg,
      paddingVertical: 13,
      borderRadius: 13,
    },
    buttonText: {
      textAlign: "center",
      color: ColorText,
    },
    logo: {
      width: 150,
      height: 100,
      backgroundColor: ColorText,
    },
    logoView: {
      justifyContent: "center",
      alignItems: "center",
      height: 100,
      marginTop: 30,
    },
    label: {
      marginVertical: 8,
    },
  });

  async function loadProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    setUser(user);

    const { data } = await supabase
      .from("mawam_profile")
      .select("*, mawam_toko(id,nama_toko)")
      .eq("id", user?.id)
      .single();

    if (data) {
      setTokoSaya(data.mawam_toko[0] ?? null)
      setNama(data.nama);
      setAvatar(data.avatar_url);
    }
  }
  async function loadPesanan() {
    const { data } = await supabase
      .from("mawam_orders")
      .select(`id, status`)
      .order("created_at", { ascending: false })
      .gt("status", 'cancelled')
      .eq("buyer_id", user?.id);
    if (data) {
      let belum = 0;
      let kemas = 0;
      let kirim = 0;
      let selesai = 0;
      data.map((item: any) => {
        ["pending_payment", "pending"].includes(item.status) && belum++;
        ["paid", "processed", "settlement"].includes(item.status) && kemas++;
        ["shipped"].includes(item.status) && kirim++;
        ["completed"].includes(item.status) && selesai++;
      })
      setTotalPesanan({
        ...totalPesanan,
        belum_bayar: belum,
        dikemas: kemas,
        dikirim: kirim,
        selesai,
      })
    }
  }

  useEffect(() => {
    user && loadPesanan();
  }, [user]);
  useEffect(() => {
    loadProfile();
  }, []);

  const convertToWebp = async (image: any) => {
    const result = await ImageManipulator.manipulateAsync(
      image.uri,
      [{ resize: { width: 700 } }],
      {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.WEBP,
      },
    );
    return result; // uri baru (webp)
  };

  const uploadImage = async (image: any) => {
    const response = await fetch(image.uri);
    const arrayBuffer = await response.arrayBuffer();
    image.mimeType = "image/webp";
    image.fileSize = arrayBuffer.byteLength;
    const fileExt = "webp";
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (image.fileSize && image.fileSize > MAX_SIZE) {
      Alerts(
        "Ukuran gambar " +
        Math.floor(image.fileSize / 1024 / 1024) +
        "MB melebihi 1MB",
        "error",
      );
    }

    const fileName = `${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("mawam")
      .upload(fileName, arrayBuffer, {
        upsert: true,
        contentType: image.mimeType,
      });

    if (error) {
      console.log(error);
      Alerts("Upload gagal", "error");
    }

    const { data: urlData } = supabase.storage
      .from("mawam")
      .getPublicUrl(fileName);
    if (urlData.publicUrl) {
      if (avatar) {
        await deleteImage(avatar);
      }
      await supabase
        .from("mawam_profile")
        .update({
          avatar_url: urlData.publicUrl,
        })
        .eq("id", user.id);
    }
    setAvatar(urlData.publicUrl);
  };

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
    });

    if (!result.canceled) {
      const image = result.assets[0];
      uploadImage(await convertToWebp(image));
    }
    return null;
  }

  async function updateProfile() {
    const { error } = await supabase
      .from("mawam_profile")
      .update({
        nama,
      })
      .eq("id", user.id);
    !error && Alerts("Berhasil Ganti", "success");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile();
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadProfile();
        setSession(session);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // LOGIN
  async function signIn() {
    if (email == '' || password == '') {
      return Alerts('Lengkapi Data Login', 'error');
    }
    setloading(1);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) Alerts(error.message, "error");
      else {
        Alerts('Berhasil login!');
        router.navigate("/produk");
      }
    } finally {
      setloading(0);
    }
  }

  // SIGNUP
  async function signUp() {
    if (email == '' || password == '' || nama == '') {
      return Alerts('Lengkapi Data Akun', 'error');
    }
    if (password.length < 6) {
      return Alerts('Password minimal 6 karakter', 'error');
    }
    setloading(2);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: nama ?? email.split('@')[0],
            app: 'mawam',
            redirect_to: `${window.location.origin}`
          },
        },
      });

      if (error) {
        Alerts('Terjadi kesalahan saat sign up', 'error');
      }
      else Alerts("Cek email untuk verifikasi", "info");
    } finally {
      setloading(0);
    }
  }

  // LOGOUT
  async function signOut() {
    setEmail("");
    setPassword("");
    setSession(null);
    setNama("");
    await supabase.auth.signOut();
  }

  const Widget = ({ text, tab, icon, total, width }: any) => (<TouchableOpacity
    style={{
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      width: width ?? `${100 / 4.1}%`,
    }}
    onPress={() => {
      router.navigate({
        pathname: "/pesanan/pesanan",
        params: { tab: tab ?? text },
      });
    }}
  >
    <View style={{ position: 'relative' }}>
      <ThemedText>
        <Ionicons name={icon} size={32} />
      </ThemedText>
      {total > 0 && <View style={{ position: 'absolute', backgroundColor: '#ff4a1c', width: 15, height: 15, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', right: -3, top: -3, opacity: 0.9 }}>
        <ThemedText style={{ color: '#ffffff', fontSize: 12 }} numberOfLines={1}>{total}</ThemedText>
      </View>}
    </View>
    <ThemedText numberOfLines={1} style={{ textAlign: 'center', fontSize: 13 }}>{text}</ThemedText>
  </TouchableOpacity>)

  if (!session) {
    return (
      <ThemedView style={{ padding: 20, flex: 1, opacity: loading == 1 ? 0.5 : 1 }}>
        <KeyboardAwareScrollView
          enableOnAndroid
          extraScrollHeight={20}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flex: 1, justifyContent: "center" }}
        >
          <ThemedView style={styles.logoView}>
            <ImageLoad
              source={
                isDark
                  ? require("@/assets/images/splash-icon-light.png")
                  : require("@/assets/images/splash-icon-dark.png")
              }
              style={styles.logo}
            />
            <ThemedText type="title" style={{ textAlign: "center" }}>
              Selamat datang
            </ThemedText>
            <ThemedText style={{ textAlign: "center", marginBottom: 70 }}>
              {isSignUp ? 'Signup' : 'Login'} untuk mulai berbelanja atau berjualan
            </ThemedText>
          </ThemedView>
          {isSignUp && <ThemedInput
            label={
              <ThemedText style={styles.label}>Nama</ThemedText>
            }
            onChangeText={setNama}
            autoComplete="name"
            textContentType="name"
            keyboardType="text"
          />}
          <ThemedInput
            label={
              <ThemedText style={styles.label}>Email</ThemedText>
            }
            onChangeText={setEmail}
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
          />
          <ThemedInput
            label={<ThemedText style={styles.label}>Password</ThemedText>}
            secureTextEntry={!isPasswordVisible}
            onChangeText={setPassword}
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={signIn}
            rightIcon={
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={{
                  position: "absolute",
                  zIndex: 2,
                  borderRadius: "50%",
                  padding: 5,
                  opacity: 0.6,
                  top: "50%",
                  right: 18,
                  transform: [{ translateY: "-50%" }],
                }}
              >
                <Ionicons
                  name={isPasswordVisible ? "eye-off" : "eye"}
                  size={20}
                  color={ColorBg}
                />
              </TouchableOpacity>
            }
          />

          <ThemedView style={{ flexDirection: "row", gap: 4, marginTop: 13 }}>
            <TouchableOpacity onPress={!isSignUp ? signIn : () => { setIsSignUp(!isSignUp) }} style={[styles.button, { opacity: isSignUp ? 0.8 : 1 }]}>
              {loading == 1 ? (
                <ActivityIndicator color={inIconColor} size="small" />
              ) : (
                <ThemedText style={[styles.buttonText]}>
                  {isSignUp ? 'Batal' : 'Log In'}
                </ThemedText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={isSignUp ? signUp : () => { setIsSignUp(!isSignUp) }}
              style={[styles.button, { opacity: isSignUp ? 1 : 0.8 }]}
            >
              {loading == 2 ? (
                <ActivityIndicator color={inIconColor} size="small" />
              ) : (
                <ThemedText style={[styles.buttonText]}>
                  {isSignUp ? 'Sign Up' : 'Akun Baru'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        </KeyboardAwareScrollView>
      </ThemedView>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <ThemedView
        style={{
          padding: 8,
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8
        }}
      >
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flex: 2 }}>
          <TouchableOpacity onPress={pickImage} style={{ width: 50, position: 'relative' }}>
            <ImageLoad
              source={{ uri: avatar ?? "https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp" }}
              style={{ width: 50, height: 50, borderRadius: "50%", }}
            />
            <ThemedView style={{ position: 'absolute', width: 18, height: 18, alignItems: 'center', bottom: -5, left: '50%', justifyContent: 'center', borderRadius: '50%', transform: [{ translateX: '-50%' }] }}>
              <Ionicons name="camera" size={15} color={iconColor} />
            </ThemedView>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText numberOfLines={1} style={{ fontWeight: "600" }}>{nama}</ThemedText>
            <ThemedText numberOfLines={1}>{user?.email}</ThemedText>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flex: 1, justifyContent: 'flex-end' }}>
          {/* <TouchableOpacity
            onPress={() => {
              Alerts('Pengaturan')
            }}
          >
            <ThemedText>
              <Ionicons name="cog-outline" size={25} />
            </ThemedText>
          </TouchableOpacity> */}
          <TouchableOpacity
            onPress={() => {
              router.navigate("cart");
            }}
            style={{ position: 'relative' }}
          >
            <ThemedText>
              <Ionicons name="cart-outline" size={25} />
            </ThemedText>
            {cart && cart.length > 0 && <View style={{ position: 'absolute', backgroundColor: '#ff4a1c', width: 15, height: 15, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', right: -3, top: -3, opacity: 0.9 }}>
              <ThemedText style={{ color: '#ffffff', fontSize: cart.length < 99 ? 12 : 6 }} numberOfLines={1}>{cart.length < 99 ? cart.length : '99+'}</ThemedText>
            </View>}
          </TouchableOpacity>
          {/* <TouchableOpacity
            onPress={() => {
              Alerts('Pesan')
            }}
          >
            <ThemedText>
              <Ionicons name="chatbox-outline" size={25} />
            </ThemedText>
          </TouchableOpacity> */}
        </View>
      </ThemedView>
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flex: 1, padding: 8 }}
      >
        <ThemedView style={{ padding: 8, borderRadius: 4, marginBottom: 8 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: 'wrap' }}
          >
            <ThemedText style={{ fontWeight: "600", }}>Pesanan Saya</ThemedText>
            <TouchableOpacity
              style={{ flexDirection: "row", gap: 4, justifyContent: 'flex-end' }}
              onPress={() => {
                router.navigate("/pesanan/pesanan");
              }}
            >
              <ThemedText style={{ opacity: 0.7 }}>
                Lihat Riwayat Pesanan
              </ThemedText>
              <ThemedText style={{ opacity: 0.7 }}>
                <Ionicons name="chevron-forward" size={16} />
              </ThemedText>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16, width: '95%' }}>
            <Widget text="Belum Bayar" icon="wallet-outline" total={totalPesanan.belum_bayar} />
            <Widget text="Dikemas" icon="cube-outline" total={totalPesanan.dikemas} />
            <Widget text="Dikirim" icon="car-outline" total={totalPesanan.dikirim} />
            <Widget text="Penilaian" tab="Selesai" icon="star-outline" total={totalPesanan.selesai} />
          </View>
        </ThemedView>
        <ThemedView style={{ padding: 8, borderRadius: 4, marginBottom: 8 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <ThemedText style={{ fontWeight: "600" }}>
              Aktivitas Saya
            </ThemedText>
            {/* <TouchableOpacity style={{ flexDirection: "row", gap: 4 }}>
              <ThemedText style={{ opacity: 0.7 }}>Lihat Semua</ThemedText>
              <ThemedText style={{ opacity: 0.7 }}>
                <Ionicons name="chevron-forward" size={16} />
              </ThemedText>
            </TouchableOpacity> */}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <TouchableOpacity
              style={styles.buttonAktifitas}
              onPress={() => {
                if (tokoSaya) {
                  router.navigate('/toko/detail/?toko=' + tokoSaya?.id)
                } else {
                  router.navigate('/toko/form');
                }
              }}
            >
              <ThemedText>
                <Ionicons name="storefront-outline" size={18} />
              </ThemedText>
              <ThemedText numberOfLines={1}>{tokoSaya?.nama_toko ?? 'Mulai Jual'}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buttonAktifitas}
              onPress={() => {
                router.navigate({ pathname: 'akun/alamat' })
              }}
            >
              <ThemedText>
                <Ionicons name="location-outline" size={18} />
              </ThemedText>
              <ThemedText numberOfLines={1}>Atur Alamat</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
        <ThemedView style={{ padding: 8, borderRadius: 4, marginBottom: 8 }}>
          <View>
            <ThemedText style={{ fontWeight: "600" }}>Bantuan</ThemedText>
          </View>
          <View style={{ gap: 8, marginTop: 16 }}>
            {/* <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <ThemedText>
                  <Ionicons name="help-circle-outline" size={18} />
                </ThemedText>
                <ThemedText>Pusat Bantuan</ThemedText>
              </View>
              <ThemedText style={{ opacity: 0.7 }}>
                <Ionicons name="chevron-forward" size={16} />
              </ThemedText>
            </TouchableOpacity> */}
            <Link
              target="_blank" href={encodeURI('https://api.whatsapp.com/send?phone=6282147288340&text=Halo Admin, Saya mau menanyakan tentang ')}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <ThemedText>
                  <Ionicons name="logo-whatsapp" size={18} />
                </ThemedText>
                <ThemedText>Costumer Service</ThemedText>
              </View>
              <ThemedText style={{ opacity: 0.7 }}>
                <Ionicons name="chevron-forward" size={16} />
              </ThemedText>
            </Link>
          </View>
        </ThemedView>
        <ThemedView style={{ padding: 8, borderRadius: 4, marginBottom: 8 }}>
          <View>
            <ThemedText style={{ fontWeight: "600" }}>Log</ThemedText>
          </View>
          <View style={{ gap: 8, marginTop: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "space-between",
                flexWrap: 'wrap'
              }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <ThemedText>
                  <Ionicons name="log-in-outline" size={18} />
                </ThemedText>
                <ThemedText>Terakhir login hari ini</ThemedText>
              </View>
              <ThemedText style={{ opacity: 0.5 }}>
                <Ionicons name="phone-portrait-outline" size={14} /> 1 Device
              </ThemedText>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "space-between",
                opacity: 0.7,
              }}
              onPress={signOut}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <ThemedText>
                  <Ionicons name="log-out-outline" size={18} />
                </ThemedText>
                <ThemedText>Keluar</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAwareScrollView>
    </View>
  );
}

