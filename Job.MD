Alasan Pematalan Pesanan.
Oleh siapa?
-------- kayanya di back end


- cart real time
- cek data sensitif
- pikirkan jika orang ma beli jumlah banyak
- pikirkan jika orang sudah bayar tapi mau batal
- Pikirkan View produk untuk populer
- Pikirkan terjual
- Pikirkan Penilaian


Marketplace Mawam merupakan platform marketplace yang mempertemukan penjual hasil pertanian dengan pembeli.

1. Penjual mendaftarkan akun dan mengunggah produk beserta harga, stok, dan informasi pengiriman.
2. Pembeli melakukan registrasi/login kemudian memilih produk yang diinginkan.
3. Pembeli menambahkan produk ke keranjang belanja.
4. Pembeli mengisi alamat pengiriman dan memilih layanan ekspedisi yang tersedia.
5. Sistem menghitung total pembayaran yang terdiri dari harga produk dan biaya pengiriman.
6. Pembeli melakukan pembayaran melalui metode pembayaran yang disediakan oleh Midtrans.
7. Setelah pembayaran berhasil, sistem akan menerima notifikasi pembayaran (payment notification/webhook) dari Midtrans dan status pesanan berubah menjadi "Dibayar".
8. Penjual menerima notifikasi bahwa pesanan telah dibayar dan mulai memproses pesanan.
9. Penjual mengirimkan barang melalui jasa ekspedisi dan menginput nomor resi pengiriman.
10. Pembeli menerima barang dan melakukan konfirmasi penerimaan barang.
11. Dana transaksi ditahan sementara oleh platform selama proses pengiriman berlangsung.
12. Setelah pesanan selesai atau telah dikonfirmasi diterima, dana akan diteruskan kepada penjual sesuai mekanisme settlement marketplace.


- Buat agar tanggal jatuh tempo lewat maka pesanan expire.
- Batalkan pesanan = 
- dikemas. kalau batal uang kembali ke mana?
- dikirim. Lacak pesanan, jangan batalkan. tambahkan pesanan selesai
- Selesai. Rincian Pesanan Selesai. Nilai Pesanan.
- Dibatalkan. Oleh apa, dan alasan. jika dibatalkan user, maka tambahkan alasan pembatalan.

- Perlu kirim. Atur pengiriman.
- tambahkan notifikasi pesanan.
    - pesanan masuk
    - pesanan di perbaharui,
    - update pengiriman,
    - pesanan dibayar dan perlu dikirim.
- tambahkan halaman chat?
- Edit Profil ==> su ubah alamat
- sign up