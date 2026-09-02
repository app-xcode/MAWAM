# Rencana: feedback proses / loading UX

Status: hasil audit saja — belum ada perubahan kode.

Tujuan: setiap operasi jaringan yang terlihat oleh pengguna harus mempunyai feedback yang jelas, mencegah tap berulang, dan kembali ke kondisi aktif ketika berhasil atau gagal.

## Standar implementasi untuk semua tugas

- State proses harus spesifik per aksi, misalnya `isSavingCategory`, `updatingCartItemId`, atau `isCheckingOut`; jangan memakai satu `loading` global untuk aksi yang tidak berhubungan.
- Saat state aktif, nonaktifkan tombol pemicu dan tampilkan `ActivityIndicator` beserta label kerja yang sesuai, misalnya `Menyimpan...`.
- Gunakan `try/catch/finally`; state selalu dikembalikan ke `false` di `finally`, termasuk saat request gagal.
- Tampilkan `Alerts` sukses/gagal yang sudah digunakan proyek. Untuk data awal, tampilkan spinner atau empty/error state; jangan membiarkan daftar tampak kosong ketika request belum selesai.
- Jangan mengubah API, skema Supabase, maupun alur bisnis dalam tugas ini.

## Prioritas P0 — risiko transaksi atau data ganda

### 1. Checkout: buat pembayaran dan pesanan

Lokasi: `app/checkout/checkout.tsx`, tombol Bayar sekitar baris 908 dan rangkaian `createPayment` → `createOrders` → `createOrderItems` → `createPengiriman` → `deleteCart`.

Masalah: tidak ada state submit. Pengguna tidak mengetahui proses beberapa request berurutan dan bisa mengetuk tombol bayar lagi, berpotensi membuat data pembayaran/pesanan ganda.

Pekerjaan junior:

1. Tambahkan `const [isCheckingOut, setIsCheckingOut] = useState(false)`.
2. Pindahkan handler inline menjadi `handleCheckout` dengan validasi yang sekarang tetap dipertahankan.
3. Bungkus seluruh rangkaian request dalam `try/catch/finally`; aktifkan state sebelum `createPayment` dan matikan di `finally`.
4. Tambahkan `disabled={isCheckingOut}` pada tombol dan ganti teks menjadi spinner + `Memproses pesanan...`.
5. Jangan navigasi ke halaman pembayaran sampai seluruh tahap yang wajib berhasil. Jika satu tahap gagal, tampilkan alert dan jangan menghapus cart.

Kriteria terima: tap cepat berulang hanya menjalankan satu checkout; tombol tidak dapat ditekan selama proses; tombol pulih setelah error.

### 2. Keranjang: tambah/kurang kuantitas

Lokasi: `app/(tabs)/cart.tsx`, tombol `minCart` dan `addCart` sekitar baris 298 dan 319.

Masalah: request berjalan tanpa indikator maupun `disabled`, sehingga UI dapat diklik berulang dan jumlah lokal dapat tidak sesuai server.

Pekerjaan junior:

1. Tambahkan `updatingCartItemId: string | null`.
2. Set id item sebelum `minCart`/`addCart`; reset di `finally`.
3. Nonaktifkan tombol minus/plus untuk item yang sedang berubah; pada area angka tampilkan spinner kecil atau opacity yang jelas.
4. Tangani hasil gagal dengan alert dan pertahankan nilai UI terakhir yang valid.
5. Uji dua tap cepat pada plus dan minus, termasuk batas jumlah 1 dan 10.

Kriteria terima: hanya satu perubahan kuantitas per item dalam satu waktu dan feedback hanya muncul pada item tersebut.

### 3. Detail pesanan: beli lagi

Lokasi: `app/pesanan/rincian.tsx`, tombol status `cancelled` sekitar baris 543 (`Promise.all(addToCart(...))`).

Masalah: proses menambahkan banyak item ke keranjang tidak memberi feedback atau mengunci tombol.

Pekerjaan junior: tambah `isReordering`, disable tombol, spinner/teks `Menambahkan ke keranjang...`, gunakan `try/catch/finally`, muat ulang badge/cart setelah semua item berhasil, dan tampilkan ringkasan error jika sebagian item gagal.

Kriteria terima: tombol tidak bisa memulai dua reorder, dan pengguna menerima hasil sukses/gagal yang jelas.

## Prioritas P1 — operasi data yang belum memberi feedback

### 4. Kelola kategori

Lokasi: `app/kategori/index.tsx` — `fetchKategori`, `handleSave`, dan `runHapus` (sekitar baris 30–105).

Masalah: load awal dapat terlihat sebagai daftar kosong; tambah, ubah, dan hapus tidak menampilkan proses atau mencegah submit/hapus berulang.

Pekerjaan junior: tambahkan `isLoadingList` dan `isSaving`; gunakan `loading={isDeleting}` pada `ConfirmModal`; nonaktifkan input dan tombol yang relevan saat simpan; tampilkan spinner/empty state yang membedakan `memuat`, `kosong`, dan `gagal`; panggil refresh setelah sukses.

### 5. Notifikasi: tandai semua dibaca dan buka notifikasi

Lokasi: `app/notifikasi/page.tsx`, `handleMarkAll` sekitar baris 168 dan `handlePress` sekitar baris 154.

Masalah: kedua operasi melakukan beberapa request sebelum UI selesai, tetapi tombol/list item tetap aktif tanpa feedback.

Pekerjaan junior: buat `isMarkingAll` dan `openingNotificationId`; disable tombol/list item yang aktif; tampilkan spinner kecil dengan teks `Menandai...` atau indikator pada item; gunakan `try/finally`; navigasi hanya setelah `markAsRead` selesai atau putuskan secara eksplisit bahwa navigasi optimistis diizinkan.

### 6. Detail produk: tambah keranjang dan hapus produk

Lokasi: `app/prod/info.tsx`, `handleCart` sekitar baris 135 dan `ConfirmModal` hapus produk sekitar baris 171.

Masalah: `addToCart` dan `hapusProduk` adalah operasi server, namun ikon/tombol masih dapat diketuk berulang. Modal hapus belum menerima prop `loading`.

Pekerjaan junior: tambah state `addingToCart` dan `deletingProduct`; disable tombol aksi; beri spinner kecil/label; pass `loading={deletingProduct}` ke `ConfirmModal`; pastikan state selesai sebelum alert/navigasi.

### 7. Alamat: pencarian kode pos dan simpan alamat

Lokasi: `app/akun/alamat.tsx`, fetch kode pos sekitar baris 62/303 dan `updateProfile` sekitar baris 274.

Masalah: pencarian eksternal dan simpan profile tidak memberi status proses yang mudah terlihat; pengguna bisa menekan simpan berkali-kali.

Pekerjaan junior: tambah debounce yang mempertahankan perilaku sekarang, `isSearchingPostalCode`, dan `isSavingAddress`; tampilkan spinner di area saran; disable tombol Simpan dan tampilkan `Menyimpan alamat...`; pastikan error request pencarian tidak terlihat sebagai hasil kosong.

## Prioritas P2 — peningkatan konsistensi dan kualitas

### 8. Umpan balik upload/pilih foto ulasan

Lokasi: `app/pesanan/penilaian.tsx`, `chooseImage` sekitar baris 93 dan penyimpanan ulasan sekitar baris 159.

Catatan: submit ulasan sudah punya spinner. Tambahkan feedback per-item ketika gambar sedang dioptimalkan/dipilih, dan lock tombol tambah/hapus foto saat `saving` agar data form tidak berubah saat upload sedang berjalan.

### 9. Perbaiki state loading yang berpotensi tidak selesai saat error

Lokasi awal pemeriksaan: `app/(tabs)/cart.tsx` (`fetchCart`), `app/kategori/index.tsx` (`fetchKategori`), serta fungsi fetch pada layar lain yang memakai pola `if (error) return`.

Pekerjaan junior: untuk setiap layar yang disentuh, pastikan loading dimatikan lewat `finally`; tampilkan pesan retry pada error. Jangan menganggap `data === null` selalu berarti masih memuat karena dapat menyebabkan spinner permanen setelah request gagal.

## Urutan kerja dan verifikasi

1. Kerjakan P0 satu per satu: checkout, kuantitas cart, lalu beli lagi.
2. Kerjakan P1 tanpa mengubah desain besar; gunakan pola tombol/loading yang konsisten.
3. Lakukan P2 setelah alur utama stabil.
4. Uji jaringan lambat/offline dan double-tap untuk setiap aksi di atas.
5. Jalankan lint/typecheck yang tersedia dari `package.json` dan uji manual Android/web untuk checkout, cart, kategori, notifikasi, detail produk, serta alamat.
