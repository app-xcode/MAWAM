# Rencana: Satu Modal Konfirmasi untuk Android, iOS, dan Web

## Tujuan

Menghapus ketergantungan pada `Alert.alert(...)` dan `confirm(...)` untuk tindakan yang membutuhkan persetujuan pengguna. Keduanya tidak konsisten di web. Semua konfirmasi akan memakai satu komponen React Native `Modal` yang tampil sama di Android, iOS, dan web.

Notifikasi informasi biasa seperti sukses, gagal, atau field wajib diisi tetap memakai `Alerts(...)` (toast). Modal baru hanya digunakan saat pengguna harus memilih **Batal** atau **Lanjut/Hapus/Setujui**.

## Kondisi kode saat ini

1. `Alert.alert(...)` masih dipakai di layar keranjang, kategori, detail produk, notifikasi, pengiriman, dan atur pengiriman.
2. `confirm(...)` (browser) dipakai di layar keranjang, kategori, detail produk, dan form produk. Akibatnya alur hapus gambar di form produk hanya berjalan di web; Android/iOS tidak menjalankan aksi hapus tersebut.
3. Beberapa halaman pesanan sudah memiliki `<Modal>` konfirmasi sendiri, tetapi markup, state, dan style-nya berulang.
4. `components/ui/CustomConfirm.tsx` saat ini adalah konfirmasi berbasis toast melalui `constants/Alerts.ts`. Pemanggilan di `app/toko/atur-pengiriman/[orderId].tsx` tidak mengirim `confirm: true`, sehingga toast konfirmasi tidak muncul dan `Promise` dapat menunggu terus.

## Batasan pekerjaan

- Fokus pada aplikasi aktif di folder `app/`; jangan ubah file yang namanya `*-lama.*`.
- Jangan mengubah proses Supabase, status pesanan, atau query database. Hanya cara meminta persetujuan pengguna yang diubah.
- Modal penolakan pembatalan yang memerlukan input alasan (`TextInput`) tidak dipindahkan ke komponen konfirmasi umum, karena bentuknya memang berbeda.

## Desain komponen baru

### 1. Buat `components/ui/ConfirmModal.tsx`

Buat komponen reusable bernama `ConfirmModal`. Komponen ini harus membungkus React Native:

```tsx
<Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
```

Props minimal yang harus tersedia:

```ts
type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;       // default: "Ya"
  cancelText?: string;        // default: "Batal"
  variant?: "default" | "destructive" | "success" | "warning";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};
```

Aturan komponen:

1. Gunakan `ThemedView`, `ThemedText`, `Colors`, dan `useTheme` agar tampilan mengikuti tema aplikasi.
2. Tampilkan overlay gelap, kartu modal di tengah, ikon sesuai `variant`, judul, pesan, tombol batal, dan tombol konfirmasi.
3. Untuk `variant: "destructive"`, tombol konfirmasi harus merah dan cocok untuk hapus data.
4. Saat `loading === true`, kedua tombol dan tombol kembali/backdrop tidak boleh menutup modal. Tombol konfirmasi menampilkan `ActivityIndicator`.
5. Ketuk tombol Batal, area backdrop, atau tombol back perangkat memanggil `onCancel` hanya bila tidak loading.
6. Komponen tidak mengubah data sendiri. Halaman pemanggil tetap mengatur state target, memanggil API, lalu menutup modal hanya setelah aksi berhasil.

Contoh pola pemakaian di halaman:

```tsx
const [itemPendingDelete, setItemPendingDelete] = useState<Item | null>(null);
const [deleting, setDeleting] = useState(false);

const confirmDelete = async () => {
  if (!itemPendingDelete) return;
  setDeleting(true);
  try {
    const berhasil = await hapusData(itemPendingDelete.id);
    if (berhasil) setItemPendingDelete(null);
  } finally {
    setDeleting(false);
  }
};

<ConfirmModal
  visible={Boolean(itemPendingDelete)}
  title="Hapus data?"
  message="Data yang dihapus tidak dapat dikembalikan."
  confirmText="Hapus"
  variant="destructive"
  loading={deleting}
  onCancel={() => setItemPendingDelete(null)}
  onConfirm={confirmDelete}
/>
```

## Langkah implementasi

### 2. Ganti konfirmasi hapus keranjang

File: `app/(tabs)/cart.tsx`

1. Hapus import `Alert` dan `Platform` jika setelah migrasi tidak dipakai lagi.
2. Tambahkan state `cartPendingDeletion` (simpan item keranjang yang akan dihapus) dan `isDeletingCart`.
3. Buat satu fungsi `requestRemoveCart(item)` untuk membuka modal dan satu fungsi `confirmRemoveCart()` untuk memanggil `removeCart(item.cart_id)`.
4. Gunakan `requestRemoveCart(item)` pada tombol silang dan saat tombol minus ditekan ketika jumlah produk adalah 1.
5. Render satu `<ConfirmModal>` di level halaman, bukan satu modal untuk setiap item list.
6. Hapus semua cabang `Platform.OS` dan semua `confirm(...)`/`Alert.alert(...)` pada aksi ini.

### 3. Ganti konfirmasi hapus kategori

File: `app/kategori/index.tsx`

1. Ganti `handleDelete(id)` agar hanya mengisi state `kategoriPendingDeletion`.
2. Jalankan `runHapus(id)` dari `onConfirm` pada `ConfirmModal`.
3. Gunakan `variant="destructive"`, judul `Hapus kategori?`, dan tombol `Hapus`.
4. Hapus import serta cabang `Alert`, `Platform`, dan `confirm` yang tidak lagi dipakai.

### 4. Ganti konfirmasi hapus produk dan gambar produk

File: `app/prod/info.tsx`

1. Ganti `handleHapus(id)` agar membuka `ConfirmModal`.
2. Saat konfirmasi berhasil, tetap jalankan callback lama: `hapusProduk`, `router.dismissAll()`, dan navigasi `/produk?aksi=delete&id=...`.
3. Hapus `Alert`, `Platform`, dan `confirm` bila sudah tidak digunakan oleh fitur lain dalam file.

File: `app/prod/form.tsx`

1. Tambahkan state untuk URI/item gambar yang akan dihapus.
2. Tombol sampah pada carousel hanya membuka modal, tanpa memeriksa `Platform.OS`.
3. Pindahkan filter `imageUploads` dan `newImage` ke fungsi `confirmDeleteImage()`.
4. Jalankan fungsi tersebut dari `onConfirm` modal. Dengan ini hapus gambar bekerja di web, Android, dan iOS.
5. Pastikan gambar utama (`index === 0`) tetap tidak memiliki tombol hapus seperti perilaku lama.

### 5. Ganti konfirmasi hapus notifikasi

File: `app/notifikasi/page.tsx`

1. Hapus import `Alert`.
2. Tambahkan state terpisah untuk `notificationPendingDeletion`, `showDeleteReadConfirmation`, dan loading aksi hapus.
3. Tombol sampah per notifikasi mengisi `notificationPendingDeletion`; `ConfirmModal` pertama memanggil `deleteNotification`.
4. Tombol `Hapus yang sudah dibaca` membuka `ConfirmModal` kedua; setelah setuju panggil `deleteReadNotifications`.
5. Pertahankan pembaruan state lokal dan `refreshUnreadCount` yang sudah ada setelah delete berhasil.
6. Gunakan pesan yang jelas bahwa data notifikasi yang dihapus tidak dapat dikembalikan.

### 6. Ubah `Alert.alert` informatif menjadi toast `Alerts`

`Alert.alert` tanpa pilihan Batal/Lanjut bukan konfirmasi. Ganti menjadi toast agar tetap tampil di web.

File dan perubahan:

| File | Ganti menjadi |
| --- | --- |
| `app/toko/atur-pengiriman/[orderId].tsx` | Sukses simpan resi: `Alerts(..., "success")`; gagal simpan: `Alerts(..., "error")`. |
| `app/toko/pengiriman/[pengirimanId].tsx` | Akses ditolak, data belum lengkap, gagal simpan: `Alerts(..., "error")`; lokasi diperbarui: `Alerts(..., "success")`. Setelah akses ditolak, toast dipanggil sebelum `router.back()`. |

Di kedua file, hapus import `Alert` setelah tidak dipakai.

### 7. Pindahkan konfirmasi pengiriman manual ke modal baru

File: `app/toko/atur-pengiriman/[orderId].tsx`

1. Hapus pola `new Promise<boolean>(...)` dan pemanggilan `Alerts(..., options)` untuk konfirmasi timpa pengiriman.
2. Pecah `submitManual()` menjadi dua tahap:
   - `requestSubmitManual()`: validasi kurir/resi, cek pengiriman lama, lalu membuka modal bila perlu.
   - `saveManualShipment()`: berisi proses insert/update pengiriman lama yang sekarang ada di `submitManual()`.
3. Jika pengiriman sudah ada, tampilkan `ConfirmModal` dengan judul `Timpa pengiriman?`, tombol `Lanjut`, dan pesan yang menjelaskan data lama akan diganti.
4. Jika belum ada pengiriman, langsung jalankan `saveManualShipment()`.
5. Modal ditutup setelah proses timpa berhasil atau saat pengguna menekan Batal.

### 8. Konsolidasikan modal konfirmasi yang markup-nya sudah berulang

Ganti modal konfirmasi sederhana yang sudah ada dengan `ConfirmModal`, supaya desain dan perilakunya seragam:

- `app/pesanan/pesanan.tsx`: konfirmasi `Pesanan Selesai`.
- `app/pesanan/rincian.tsx`: konfirmasi batalkan pengajuan dan pesanan selesai.
- `app/pesanan/batalkan.tsx`: kirim permintaan pembatalan, batalkan pengajuan, dan hapus rekening refund.
- `app/toko/pembatalan/[orderId].tsx`: setujui pembatalan.

Jangan migrasikan modal penolakan di `app/toko/pembatalan/[orderId].tsx`, karena modal itu memiliki `TextInput` alasan penolakan dan bukan modal konfirmasi standar.

Saat migrasi, hapus style khusus modal yang sudah tidak dipakai (`modalOverlay`, `modalCard`, `modalActions`, dan sejenisnya), tetapi hanya setelah memastikan style tersebut tidak dipakai modal input lain dalam file.

### 9. Bersihkan mekanisme konfirmasi toast lama

Setelah semua pemakaian `Alerts(..., options konfirmasi)` dipindahkan:

1. Sederhanakan `constants/Alerts.ts` agar hanya menangani toast informasi (`success`, `error`, `info`). Hapus `AlertOptions` dan cabang `options.confirm`.
2. Hapus `components/ui/CustomConfirm.tsx` bila tidak ada lagi import/pemakaian (`rg -n "CustomConfirm|custom_confirm|confirmText" app components constants` harus tidak menampilkan pemakaian aktif).
3. Hapus import `CustomConfirm`, `toastConfig`, dan prop `config={toastConfig}` dari `app/_layout.tsx`; sisakan `<Toast />`.
4. Jangan hapus `Alerts(...)` biasa karena masih dipakai luas sebagai toast aplikasi.

## Urutan kerja yang disarankan untuk model junior

1. Buat dan uji visual `ConfirmModal.tsx` terlebih dahulu pada satu halaman sederhana: kategori.
2. Migrasikan keranjang, detail produk, dan form produk.
3. Migrasikan notifikasi dan pengiriman manual.
4. Migrasikan modal konfirmasi pesanan yang sudah ada.
5. Baru bersihkan `CustomConfirm` dan opsi konfirmasi di `Alerts.ts` setelah pencarian memastikan tidak ada pemakaian tersisa.
6. Jalankan pemeriksaan dan lakukan pengujian manual pada web serta Android/iOS.

## Checklist pengujian manual

1. Web: tidak ada lagi browser native dialog dari `confirm()` dan tidak ada error `Alert.alert is not supported on web`.
2. Android/iOS: tombol back dan tombol Batal menutup modal saat tidak loading; keduanya tidak dapat menutup modal saat proses simpan/hapus berjalan.
3. Keranjang: hapus dari ikon silang dan dari tombol minus saat jumlah 1 memiliki hasil yang sama; item hanya hilang setelah konfirmasi.
4. Form produk: hapus gambar non-utama berhasil pada web, Android, dan iOS; gambar utama tetap tidak dapat dihapus.
5. Notifikasi: hapus satu notifikasi dan hapus semua yang sudah dibaca memperbarui daftar serta jumlah belum dibaca.
6. Pengiriman manual: bila sudah ada data pengiriman, Batal tidak mengubah data dan Lanjut benar-benar menimpa data; bila belum ada data, proses tetap langsung berjalan.
7. Pesanan: konfirmasi selesai/pembatalan tetap memanggil API yang sama dan tidak dapat ditekan dua kali saat loading.
8. Jalankan `rg -n -i "Alert\\.alert|\\bconfirm\\s*\\(" app --glob "!**/*-lama.*"`. Hasil akhirnya tidak boleh memiliki pemakaian aktif di layar aplikasi yang dimigrasikan.

## Kriteria selesai

- Semua konfirmasi di layar aktif memakai `ConfirmModal` yang sama.
- Tidak ada `confirm()` atau `Alert.alert()` tersisa pada layar aktif yang termasuk cakupan di atas.
- Informasi sukses/gagal memakai `Alerts` dan tampil di web.
- Modal reusable mengikuti tema, aman saat loading, dan tidak melakukan aksi tanpa klik tombol konfirmasi pengguna.
