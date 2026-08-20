Alasan Pematalan Pesanan.
Oleh siapa?
-------- kayanya di back end


- cart real time
- cek data sensitif
- pikirkan jika orang mau beli jumlah banyak
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
- Edit Profil ==> su ubah alamat
- sign up

- tambahkan halaman chat?
- notifikasi
1. mungkin juga kalau pesanan yang di batalkan saat belum bayar atau batalkan secara instan maka harus ada pengembalian stok

- notif pesanan perlu dikirim
- bagian atur lokasi pengiriman paket itu nanti pendah ke bagian tab pengiriman, sehingga penjual juga bisa update lokasi paket.
- notif pembayaran.
- verifikasi pembayaran oleh admin atau penjual, mungkin admin karna su terlanjur pakai admin punya norek.
- nanti kalau kurir su update lokasi paket tampilkan riwayat, pastikan pelacakan berfungsi
- nanti pesanan su mau sampai, nottf ke pembeli
- notif pesanan selesai ke admin dan penjual
- admin acc pesanan selsai.
- admin teruskan uang pembayaran ke penjual.
- kalau penjual belum tambahkan norek tolong tambahakan, lalu bisa klaim hasil penjualan.



 {
    "success": true,
    "data": {
        "success": true,
        "message": "Order successfully created",
        "object": "order",
        "id": "6a85a4ae0b1fb498ade955ab",
        "shipper": {
            "name": "Nur hasanah",
            "email": "nh060320@gmail.com",
            "phone": "6282147288340",
            "organization": "Personal Account"
        },
        "origin": {
            "contact_name": "Marisa Martha",
            "contact_phone": "082144733128",
            "coordinate": {
                "latitude": null,
                "longitude": null
            },
            "address": "Dekat kampus UCB\n85111, Kayu Putih, Oebobo, Kota Kupang, Nusa Tenggara Timur",
            "note": "-",
            "postal_code": 85111,
            "collection_method": "pickup"
        },
        "destination": {
            "contact_name": "Eedik Atahori",
            "contact_phone": "082144733128",
            "address": "Indonesia, 85111, Kayu Putih, Oebobo, Kota Kupang, Nusa Tenggara Timur",
            "note": "-",
            "proof_of_delivery": {
                "use": false,
                "fee": 0,
                "note": null,
                "link": null
            },
            "cash_on_delivery": {
                "id": null,
                "amount": 0,
                "fee": 0,
                "amountCurrency": "IDR",
                "feeCurrency": "IDR",
                "note": null,
                "type": null,
                "status": null,
                "payment_status": "pending",
                "payment_method": "cash"
            },
            "coordinate": {
                "latitude": null,
                "longitude": null
            },
            "postal_code": 85111
        },
        "stops": [],
        "courier": {
            "tracking_id": "nrOIJDu7BewUWGabQqyaI0Fz",
            "waybill_id": "WYB-1787143342374",
            "company": "jne",
            "name": null,
            "phone": null,
            "type": "reg",
            "link": "https://track.biteship.com/nrOIJDu7BewUWGabQqyaI0Fz?environment=development",
            "insurance": {
                "amount": 0,
                "fee": 0,
                "note": "",
                "amount_currency": "IDR",
                "fee_currency": "IDR"
            },
            "routing_code": "ROUTEC123"
        },
        "delivery": {
            "datetime": "2026-08-19T19:42+07:00",
            "note": null,
            "type": "now",
            "distance": null,
            "distance_unit": "kilometer"
        },
        "reference_id": "05413571-fb4e-4156-a00b-f9190533bfd1",
        "items": [
            {
                "name": "Bawang Merah Kumpul",
                "description": "Bawang merah kering dijual 1kg/kumpul",
                "category": "others",
                "sku": null,
                "value": 20000,
                "quantity": 1,
                "length": 25,
                "width": 20,
                "height": 15,
                "weight": 2000
            },
            {
                "name": "Bawang Merah Kupas",
                "description": "Bawang merah yang telah dikupas dan siap digunakan untuk berbagai kebutuhan masakan.",
                "category": "others",
                "sku": null,
                "value": 47500,
                "quantity": 1,
                "length": 25,
                "width": 20,
                "height": 15,
                "weight": 2000
            }
        ],
        "extra": [],
        "currency": "IDR",
        "tax_lines": [],
        "price": 44000,
        "status": "confirmed",
        "draft_order_id": "ac54b353-22eb-4211-b572-e8ceabe732c4",
        "return_id": null
    }
}

https://crzymkebjvqhqlvjhrwb.supabase.co/rest/v1/mawam_pengiriman?id=eq.4669c6f0-13a6-4574-b9dc-294818c6afaa

biteship_draft_id

eq.4669c6f0-13a6-4574-b9dc-294818c6afaa
{
    "provider": "biteship",
    "biteship_order_id": "6a85a4ae0b1fb498ade955ab",
    "tracking_number": "WYB-1787143342374",
    "status": "shipped"
}

{
    "code": "PGRST204",
    "details": null,
    "hint": null,
    "message": "Could not find the 'biteship_order_id' column of 'mawam_pengiriman' in the schema cache"
}