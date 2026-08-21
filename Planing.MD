Hasil analisa: ada tiga area utama yang perlu diperbaiki.

## 1. Tombol dark mode di halaman Akun

Lokasi yang tepat adalah baris tombol notifikasi dan keranjang di [app/(tabs)/akun.tsx](C:\Android\Expo-RectNative\MAWAM\app\(tabs)\akun.tsx:573).

Susunan yang disarankan:

```tsx
<View style={styles.headerActions}>
  <TouchableOpacity onPress={handleNotificationPress}>
    <Ionicons name="notifications-outline" size={25} color={iconColor} />
  </TouchableOpacity>

  <TouchableOpacity onPress={toggleTheme}>
    <Ionicons
      name={isDark ? "sunny-outline" : "moon-outline"}
      size={25}
      color={iconColor}
    />
  </TouchableOpacity>

  <TouchableOpacity onPress={() => router.navigate("cart")}>
    <Ionicons name="cart-outline" size={25} color={iconColor} />
  </TouchableOpacity>
</View>
```

`toggleTheme` sudah tersedia dari context, tetapi belum diambil di halaman Akun.

Catatan penting: implementasi tema di [app/_layout.tsx](C:\Android\Expo-RectNative\MAWAM\app\_layout.tsx:29) saat ini bermasalah:

```tsx
const colorScheme = 'dark';
const darkSy = colorScheme != 'dark';
const [isDark, setIsDark] = useState(darkSy);
```

Karena logikanya terbalik, `isDark` justru dimulai sebagai `false`. Selain itu, `useEffect` pada baris 36-38 dapat menimpa perubahan manual dari tombol.

Rencana perbaikannya:

- Gunakan `useColorScheme()` kembali.
- Inisialisasi `isDark` dengan nilai yang benar.
- Jangan reset state setiap kali render.
- Simpan pilihan user agar tidak hilang saat aplikasi dibuka ulang.
- Pastikan `ThemeProvider`, `SafeAreaView`, `StatusBar`, dan seluruh komponen memakai state tema yang sama.

## 2. Audit dukungan dark mode

Fondasi tema sudah tersedia di:

- [constants/theme.ts](C:\Android\Expo-RectNative\MAWAM\constants\theme.ts:11)
- [utils/theme.ts](C:\Android\Expo-RectNative\MAWAM\utils\theme.ts:3)
- [hooks/use-theme-color.ts](C:\Android\Expo-RectNative\MAWAM\hooks\use-theme-color.ts:5)
- [components/themed-text.tsx](C:\Android\Expo-RectNative\MAWAM\components\themed-text.tsx:11)
- [components/themed-view.tsx](C:\Android\Expo-RectNative\MAWAM\components\themed-view.tsx:10)
- [components/themed-input.tsx](C:\Android\Expo-RectNative\MAWAM\components\themed-input.tsx:5)

Namun, audit perlu dilakukan pada seluruh halaman karena masih banyak warna hardcoded.

Prioritas perubahan:

1. **Root layout**
   - Perbaiki logika `isDark`.
   - Samakan warna navigation header dengan `Colors.light` dan `Colors.dark`.
   - Pastikan background root tidak tetap putih.

2. **Halaman Akun**
   - Ganti border `#cccccc` dengan `Colors[colorScheme].border`.
   - Berikan `color={iconColor}` secara eksplisit pada semua `Ionicons`.
   - Rapikan penamaan `ColorBg` dan `ColorText`, karena saat ini nama variabelnya membingungkan.
   - Pastikan teks tombol login tetap kontras pada kedua tema.

3. **Komponen global**
   - `ThemedText` sudah benar, tetapi warna `link` dan `unlink` masih hardcoded.
   - `ThemedInput` sudah cukup baik dan perlu dijadikan standar untuk seluruh input.
   - `ThemedView` perlu dipakai pada container utama halaman, bukan `View` biasa dengan background default.

4. **Halaman yang berisiko tinggi**
   Banyak file masih memakai warna literal seperti `#ffffff`, `#151718`, `Colors.dark.text`, atau `Colors.light.tint`, misalnya:

   - [app/(tabs)/cart.tsx](C:\Android\Expo-RectNative\MAWAM\app\(tabs)\cart.tsx)
   - [app/(tabs)/produk.tsx](C:\Android\Expo-RectNative\MAWAM\app\(tabs)\produk.tsx)
   - [app/pesanan/pesanan.tsx](C:\Android\Expo-RectNative\MAWAM\app\pesanan\pesanan.tsx)
   - [app/pesanan/rincian.tsx](C:\Android\Expo-RectNative\MAWAM\app\pesanan\rincian.tsx)
   - [app/prod/penilaian.tsx](C:\Android\Expo-RectNative\MAWAM\app\prod\penilaian.tsx)
   - [app/toko/penjualan.tsx](C:\Android\Expo-RectNative\MAWAM\app\toko\penjualan.tsx)
   - [app/toko/pembatalan/[orderId].tsx](C:\Android\Expo-RectNative\MAWAM\app\toko\pembatalan\[orderId].tsx)
   - [app/scan.tsx](C:\Android\Expo-RectNative\MAWAM\app\scan.tsx)

Pola yang perlu dihindari:

```tsx
color: Colors.dark.text
backgroundColor: Colors.light.tint
backgroundColor: "#ffffff"
```

Sebaiknya menggunakan:

```tsx
const palette = Colors[isDark ? "dark" : "light"];

color: palette.text;
backgroundColor: palette.background;
borderColor: palette.border;
```

Badge seperti merah/oranye dan warna status pembayaran boleh tetap hardcoded karena bersifat semantik, tetapi teks di atasnya harus selalu putih dan diuji di kedua tema.

Untuk web, [assets/style/global.css](C:\Android\Expo-RectNative\MAWAM\assets\style\global.css:1) masih memaksa `body` dan `#root` berwarna putih. File ini juga perlu mengikuti tema aktif. Selain itu, listener di [components/themeupdate.tsx](C:\Android\Expo-RectNative\MAWAM\components\themeupdate.tsx:18) langsung dilepas setelah dipasang, sehingga perubahan tema dari sistem tidak akan terpantau dengan benar.

## 3. Perbaikan judul halaman

`Pesanan Saya` sebenarnya sudah benar di [app/_layout.tsx](C:\Android\Expo-RectNative\MAWAM\app\_layout.tsx:85), dan juga di [app/pesanan/pesanan.tsx](C:\Android\Expo-RectNative\MAWAM\app\pesanan\pesanan.tsx:241).

Masalahnya, beberapa route lain belum memiliki `Stack.Screen`, sehingga Expo Router menampilkan nama file atau path sebagai judul.

Route yang perlu ditambahkan atau dikonfirmasi:

| Route | Judul |
|---|---|
| `notifikasi/page` | Notifikasi |
| `prod/showQrCode` | Tampilkan QR Code |
| `prod/imageFull` | Header disembunyikan |
| `toko/Produks` | Produk Toko |
| `toko/atur-pengiriman/[orderId]` | Atur Pengiriman |
| `toko/pembatalan/[orderId]` | Rincian Pembatalan |
| `toko/pengiriman/[pengirimanId]` | Update Lokasi Paket |
| `toko/pesanan/[orderId]` | Rincian Pesanan |
| `toko/review/[orderId]` | Penilaian Produk |
| `scan` | Scan QR |

Sebagian halaman sudah memiliki `Stack.Screen` lokal, tetapi belum semuanya. Untuk route statis, judul bisa diletakkan di [app/_layout.tsx](C:\Android\Expo-RectNative\MAWAM\app\_layout.tsx:78). Untuk route dinamis, judul lebih aman diletakkan di file halaman masing-masing.

## Urutan pengerjaan yang disarankan

1. Perbaiki state tema di `app/_layout.tsx`.
2. Pindahkan tombol dark mode ke header Akun.
3. Perbaiki warna header, background, teks, border, dan input global.
4. Audit halaman utama: Akun, Produk, Cart, Pesanan, Checkout.
5. Audit halaman toko dan pembayaran.
6. Lengkapi seluruh `Stack.Screen` yang belum punya judul.
7. Uji light/dark mode di Android, iOS, dan web.
8. Uji navigasi langsung ke setiap route untuk memastikan tidak ada judul seperti `pesanan/pesanan`.

Belum ada perubahan kode yang dilakukan; ini masih hasil analisa dan rencana implementasi.