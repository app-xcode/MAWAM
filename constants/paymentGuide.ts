export const paymentGuide: Record<string, any> = {
  bri: {
    title: "BRI",
    mbanking: [
      "Login ke aplikasi BRImo",
      "Pilih menu 'Transfer'",
      "Pilih 'Transfer ke Virtual Account'",
      "Masukkan nomor VA",
      "Periksa detail pembayaran",
      "Konfirmasi transaksi",
    ],
    atm: [
      "Masukkan kartu ATM BRI",
      "Pilih Bahasa",
      "Masukkan PIN",
      "Pilih 'Transaksi Lain'",
      "Pilih 'Transfer'",
      "Pilih 'Ke Rekening Virtual Account'",
      "Masukkan nomor VA",
      "Konfirmasi pembayaran",
    ],
  },

  bni: {
    title: "BNI",
    mbanking: [
      "Login BNI Mobile Banking",
      "Pilih 'Transfer'",
      "Pilih 'Virtual Account Billing'",
      "Masukkan nomor VA",
      "Cek detail pembayaran",
      "Konfirmasi transaksi",
    ],
    atm: [
      "Masukkan kartu ATM BNI",
      "Masukkan PIN",
      "Pilih 'Menu Lain'",
      "Pilih 'Transfer'",
      "Pilih 'Virtual Account Billing'",
      "Masukkan nomor VA",
      "Konfirmasi pembayaran",
    ],
  },

  bca: {
    title: "BCA",
    mbanking: [
      "Login BCA Mobile",
      "Pilih 'm-Transfer'",
      "Pilih 'BCA Virtual Account'",
      "Masukkan nomor VA",
      "Cek detail pembayaran",
      "Konfirmasi transaksi",
    ],
    atm: [
      "Masukkan kartu ATM BCA",
      "Masukkan PIN",
      "Pilih 'Transaksi Lainnya'",
      "Pilih 'Transfer'",
      "Pilih 'BCA Virtual Account'",
      "Masukkan nomor VA",
      "Konfirmasi pembayaran",
    ],
  },

  mandiri: {
    title: "Mandiri",
    mbanking: [
      "Login Livin' by Mandiri",
      "Pilih 'Bayar'",
      "Pilih 'Virtual Account'",
      "Masukkan nomor VA",
      "Konfirmasi detail",
      "Selesaikan pembayaran",
    ],
    atm: [
      "Masukkan kartu ATM Mandiri",
      "Pilih Bahasa",
      "Masukkan PIN",
      "Pilih 'Bayar/Beli'",
      "Pilih 'Multi Payment'",
      "Masukkan nomor VA",
      "Konfirmasi pembayaran",
    ],
  },

  qris: {
    title: "QRIS Payment",
    mbanking: [
      "Buka aplikasi mobile banking / e-wallet",
      "Pilih menu 'Scan QR'",
      "Scan QRIS yang ditampilkan",
      "Periksa nominal pembayaran",
      "Konfirmasi pembayaran",
    ],
    ewallet: [
      "Buka GoPay / OVO / DANA / ShopeePay",
      "Pilih 'Scan QR'",
      "Scan QRIS",
      "Konfirmasi pembayaran",
    ],
  },

  cod: {
    title: "Cash on Delivery (COD)",
    mbanking: [
      "Tidak perlu transfer",
      "Siapkan uang sesuai total belanja",
      "Bayar saat barang diterima",
    ],
  },
};