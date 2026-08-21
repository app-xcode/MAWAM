Rencana implementasi badge notifikasi:

1. Badge angka pada ikon bel di halaman akun  
   File: [app/(tabs)/akun.tsx](C:\Android\Expo-RectNative\MAWAM\app\(tabs)\akun.tsx:530)

   - Tambahkan state `unreadNotificationCount`.
   - Saat pengguna login, ambil jumlah notifikasi dengan `is_read = false`.
   - Tampilkan badge merah di kanan-atas ikon bel:
     - tidak tampil bila jumlah `0`;
     - tampil angka `1–99`;
     - tampil `99+` bila lebih dari 99.
   - Subscribe Realtime ke tabel `notifikasi` milik pengguna aktif supaya badge langsung bertambah saat notifikasi baru datang dan berkurang setelah dibaca dari halaman notifikasi.
   - Bersihkan subscription saat halaman dilepas, pengguna logout, atau ID pengguna berubah.

2. Tambahkan fungsi count khusus notifikasi  
   File: [services/notification/notificationService.ts](C:\Android\Expo-RectNative\MAWAM\services\notification\notificationService.ts)

   - Tambahkan `getUnreadNotificationCount(userId)`.
   - Gunakan query count database, bukan menghitung hanya dari 50 notifikasi yang dimuat di halaman. Ini membuat badge tetap akurat untuk pengguna yang memiliki lebih dari 50 notifikasi belum dibaca.
   - Pertahankan `markAsRead`, `markAllAsRead`, dan `fetchNotifications` yang sudah tersedia.

3. Badge “Baru” pada setiap pesan belum dibaca  
   File: [app/notifikasi/page.tsx](C:\Android\Expo-RectNative\MAWAM\app\notifikasi\page.tsx:83)

   - Saat `item.is_read === false`, tampilkan badge kecil `Baru` di sisi judul notifikasi.
   - Pertahankan penanda visual yang sudah ada, lalu perjelas:
     - latar berbeda;
     - judul lebih tebal;
     - badge `Baru` berwarna aksen aplikasi.
   - Saat notifikasi ditekan:
     - ubah `is_read` menjadi `true`;
     - badge `Baru` langsung hilang;
     - badge angka di ikon bel ikut berkurang melalui Realtime;
     - lanjutkan navigasi ke `data.path` bila tersedia.
   - Tombol “Tandai semua sudah dibaca” akan disesuaikan ke Bahasa Indonesia dan menghapus seluruh badge `Baru`.

4. Perkuat Realtime untuk INSERT dan UPDATE  
   File: [app/notifikasi/page.tsx](C:\Android\Expo-RectNative\MAWAM\app\notifikasi\page.tsx:35)

   - Subscription saat ini hanya mendengar `INSERT`.
   - Tambahkan listener `UPDATE` agar status terbaca yang berubah dari perangkat/halaman lain langsung tersinkron.
   - Setelah event masuk, hitung ulang unread count dari database agar tidak terjadi selisih hitungan.

5. Pastikan tabel `notifikasi` tersedia pada publication Realtime  
   File: [setting_supabase/notifikasi.sql](C:\Android\Expo-RectNative\MAWAM\setting_supabase\notifikasi.sql)

   - Tambahkan konfigurasi idempoten untuk memasukkan tabel `notifikasi` ke publication `supabase_realtime`.
   - Ini penting karena tanpa publication, subscription pada halaman akun dan halaman notifikasi tidak menerima pembaruan langsung.

Alur akhirnya:

```text
Notifikasi baru masuk
        ↓
Badge bel bertambah
        ↓
Pengguna membuka halaman Notifikasi
        ↓
Pesan belum dibaca menampilkan badge “Baru”
        ↓
Pesan ditekan / semua ditandai dibaca
        ↓
Badge “Baru” hilang dan angka bel tersinkron
```

Tidak diperlukan kolom database baru karena `notifikasi.is_read` sudah tersedia dan RLS saat ini sudah membatasi pengguna ke notifikasinya sendiri.

Hasil analisis: ada dua penyebab kuat notifikasi tampil dua kali, terutama pada web.

1. Duplikasi tampilan di service worker web  
   [send-fcm](C:\Android\Expo-RectNative\MAWAM\supabase\functions\send-fcm\index.ts:113) mengirim payload `notification`, yang oleh FCM otomatis ditampilkan saat aplikasi berada di background. Namun [firebase-messaging-sw.js](C:\Android\Expo-RectNative\MAWAM\public\firebase-messaging-sw.js:29) juga menerima pesan yang sama lalu menjalankan `showNotification()` manual. Hasilnya: satu pesan FCM dapat menjadi dua notifikasi browser.

   Firebase menjelaskan bahwa pesan dengan `notification` otomatis ditampilkan di background, sedangkan handler service worker digunakan bila ingin mengelola tampilan sendiri. [Dokumentasi Firebase](https://firebase.google.com/docs/cloud-messaging/web/receive-messages)

2. Deduplikasi database belum menghentikan pengiriman FCM  
   [notificationService.ts](C:\Android\Expo-RectNative\MAWAM\services\notification\notificationService.ts:19) benar memakai `dedupe_key` untuk mencegah record ganda. Tetapi bila insert kedua ditolak karena kode `23505`, proses tetap lanjut mengambil token dan memanggil `send-fcm` di baris 32–43.

   Jadi satu record notifikasi mungkin hanya tersimpan sekali, tetapi push notification tetap terkirim dua kali bila trigger dipanggil dua kali. Ini bug yang pasti ada di kode saat ini.

3. Token lama bisa tetap aktif  
   [notification_tokens](C:\Android\Expo-RectNative\MAWAM\setting_supabase\notifikasi.sql:35) menyimpan token unik per `(user_id, token)`, tetapi tidak punya identitas instalasi/perangkat. Jika token perangkat berubah, token lama dapat tetap aktif dan [listActiveTokens](C:\Android\Expo-RectNative\MAWAM\services\notification\notificationToken.ts:30) mengirim ke semuanya. Ini kandidat kuat bila duplikasi juga terjadi di Android.

4. Listener foreground web berisiko tertinggal saat hot reload  
   [FCMRegistrar.tsx](C:\Android\Expo-RectNative\MAWAM\components\FCMRegistrar.tsx:115) memasang listener secara async. Jika komponen dilepas sebelum promise selesai, listener yang baru selesai dibuat tidak dibersihkan. Dalam development/hot reload, ini dapat menumpuk listener dan menampilkan notifikasi foreground lebih dari sekali.

Rencana perbaikan:

1. Jadikan service worker sebagai satu-satunya pengelola tampilan web background.
   - Rekomendasi paling sederhana: hapus handler `messaging.onBackgroundMessage()` dan `showNotification()` dari `firebase-messaging-sw.js`.
   - Tetap kirim payload `notification`; FCM akan menampilkan satu notifikasi secara otomatis.
   - Jika membutuhkan kontrol penuh atas ikon, klik, dan route, gunakan pendekatan alternatif: kirim data-only untuk token web lalu pertahankan `showNotification()` manual. Jangan menjalankan keduanya sekaligus.

2. Hentikan FCM bila insert notifikasi dideduplikasi.
   - Ubah `createNotification()` agar langsung mengembalikan hasil ketika insert menghasilkan error `23505`.
   - `send-fcm` hanya boleh dipanggil jika `notificationRow` berhasil dibuat.
   - Dengan ini, trigger yang terpanggil ulang tidak menimbulkan push kedua.

3. Tambahkan idempotensi pengiriman FCM.
   - Sertakan `notification_id` pada data FCM.
   - Di client web, simpan ID notifikasi terakhir yang telah ditampilkan dalam cache pendek/set memori.
   - Abaikan pesan dengan ID sama. Ini menjadi lapisan pengaman jika FCM melakukan retry atau listener terpasang ulang.

4. Rapikan lifecycle listener foreground.
   - Tambahkan flag pembatalan pada efek async di `FCMRegistrar`.
   - Jika komponen sudah unmount ketika listener selesai dibuat, panggil unsubscribe langsung.
   - Pastikan hanya satu listener foreground aktif.

5. Kelola token per instalasi, bukan hanya per token.
   - Tambahkan `installation_id` pada `notification_tokens`.
   - Buat identifier persisten per instalasi: `AsyncStorage` untuk native dan `localStorage` untuk web.
   - Saat registrasi, upsert berdasarkan `(user_id, installation_id)` dan ganti token lama milik instalasi tersebut.
   - Perangkat lain tetap menerima notifikasi, tetapi satu perangkat tidak menerima dari token lama dan baru sekaligus.

6. Audit sebelum dan sesudah perbaikan.
   Jalankan di Supabase SQL Editor untuk mengetahui apakah record atau token memang berlipat:

```sql
select user_id, dedupe_key, count(*)
from public.notifikasi
group by user_id, dedupe_key
having count(*) > 1;
```

```sql
select user_id, platform, count(*) as active_token_count
from public.notification_tokens
where is_active = true
group by user_id, platform
having count(*) > 1;
```

Urutan implementasi yang saya sarankan: perbaiki service worker dan `createNotification()` dahulu, uji satu notifikasi, lalu audit/rapikan token. Dua perbaikan pertama langsung menutup jalur duplikasi yang paling jelas.