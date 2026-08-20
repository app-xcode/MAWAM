Kategori (Populer, Latest, Best Sellers, Price>)
Tampilkan berdasarkan Kategori (Badge diatas),
Pencarian tambahakan histori Pencarian - Not Found && (btn Filter+ )
Sort & Filter (Kategori, Price, SortBy, Rating)
List Produk (Keterangan Baru, heart, Img, Judul, rating, Terjual/Diskon, Harga, Toko, Alamat, Stok)

Detail (Img(Have Slide), Judul, Heart, Rating, Diskon, Terjual, Deskripsi, Opsi Varian(Size & Color, Jumlah Beli, (10.000+ People favorite this) Total-Harga, Button Add In Cart))
Review (Total Bintang Rata rata, Kategori Penilaian(1-5 Star), Avatar User, Nama, Star, Komentar, Like, reply)

My Cart (Cari, Img, Judul, Delete, Varian, Harga, Update jumlah) -> Total Harga, Btn Checkout 
Modal Confirm Remove cart, (Img, Judul, Delete, Varian, Harga, Update jumlah) -> Btn Batal & Ya Hapus
Checkout (Konfirmasi Alamat, Icon Map, Judul, Alamat Lengkap, Edit, bisa ke menu pilih list alamat/lebih simple edit alamat tujuan)
Add Promo jika ada
Payment Methods (Pilih Opsi bayar->bisa di handle dengan Mayar)
Enter Pin bayar 
Order Sukses, Lihat Order / Lanjut Shopp

Menu (Home, Heart, Transaksi, Notifikasi, Profil), (Home, cart, Heart, Profile)
Home (SideNav, Judul, bell, Banner Iklan+ Btn Shop Now, New Arrival (Swipe Porduk), Best Seller (Kategori, See All, Swipe Produk))
Home (Spesial Offers -> diskon, Kategori, Gambar kategori, Deskripsi Diskon)



/// foto produk support ganda
/// tambah tabel diskon jadi khusus 1 produk atau seluruh produk

// catatan untuk penjual
// metode bayar
// rincian pesanan
<!-- 
Merchant ID
G928927512

Client Key
Mid-client-lx2v2rRqpf6ihEDG

Server Key
[Simpan hanya sebagai Supabase Edge Function secret; jangan commit ke repository atau frontend.]
 -->


<!-- const { data, error } = await supabase.functions.invoke("mawam-midtrans", {
  body: {
    paymentId,
  },
}); -->



"customer_details": {
  "first_name": "TEST",
  "last_name": "UTOMO",
  "email": "test@midtrans.com",
  "phone": "+628123456",
  "billing_address": {
    "first_name": "TEST",
    "last_name": "UTOMO",
    "phone": "081 2233 44-55",
    "address": "Sudirman",
    "city": "Jakarta",
    "postal_code": "12190",
    "country_code": "IDN"
  },
  "shipping_address": {
    "first_name": "TEST",
    "last_name": "UTOMO",
    "phone": "0 8128-75 7-9338",
    "address": "Sudirman",
    "city": "Jakarta",
    "postal_code": "12190",
    "country_code": "IDN"
  }
}

"seller_details": {
  "id": "sellerId-01",
  "name": "John Seller",
  "email": "seller@email.com",
  "url": "https://tokojohn.com",
  "address": {
    "first_name": "John",
    "last_name": "Seller",
    "phone": "081234567890",
    "address": "Kemanggisan",
    "city": "Jakarta",
    "postal_code": "12190",
    "country_code": "IDN"
  }
}


{
  paymentId: "28690eb1-b82d-4b58-aa90-77aa7df962dd",
  payment_type: "bank_transfer",
  bank: "mandiri"
}


{
  transaction_time: "2026-06-20 07:48:14",
  transaction_status: "pending",
  transaction_id: "80cbb7d0-6317-40c3-b076-c3797e2b6b98",
  status_message: "midtrans payment notification",
  status_code: "201",
  signature_key: "a0b9037f15e755b4c517399dcd76d04d7094da559e82711ec091c3dce5e8cd651d2fc08de2aead8ee613a7956abb2be4aed9dff19f308dc606d2a844a390fc23",
  permata_va_number: "2750069349769861",
  payment_type: "bank_transfer",
  order_id: "PAY-1781916491394",
  merchant_id: "G928927512",
  gross_amount: "20000.00",
  fraud_status: "accept",
  expiry_time: "2026-06-21 07:48:14",
  customer_details: {
    phone: "082144733128",
    full_name: "Marisa Martha",
    email: "marisamartha0@gmail.com"
  },
  currency: "IDR"
}



{
  paymentId: "b33cf95f-1894-46b5-9e2f-2ab7d72ec1fe",
  payment_type: "qris",
  bank: "qris"
}

{
  transaction_time: "2026-06-20 06:58:58",
  transaction_status: "pending",
  transaction_id: "aa1ed280-2ad1-4527-b64f-f6dc96ea8c6b",
  status_message: "midtrans payment notification",
  status_code: "201",
  signature_key: "05f9d0a4db3b42b7692c3c0f2369cbaa5b4240621ab7320737ab53a9e6195bdf75c56929c365eee15ea816fa16a2142b54e0d27e7a23ae7840348e6020fb82ab",
  permata_va_number: "2750040839817331",
  payment_type: "bank_transfer",
  order_id: "PAY-1781913535480",
  merchant_id: "G928927512",
  gross_amount: "42000.00",
  fraud_status: "accept",
  expiry_time: "2026-06-21 06:58:58",
  customer_details: {
    phone: "082144733128",
    full_name: "Marisa Martha",
    email: "marisamartha0@gmail.com"
  },
  currency: "IDR"
}


{
  status_code: "201",
  transaction_id: "aa1ed280-2ad1-4527-b64f-f6dc96ea8c6b",
  gross_amount: "42000.00",
  currency: "IDR",
  order_id: "PAY-1781913535480",
  payment_type: "bank_transfer",
  signature_key: "05f9d0a4db3b42b7692c3c0f2369cbaa5b4240621ab7320737ab53a9e6195bdf75c56929c365eee15ea816fa16a2142b54e0d27e7a23ae7840348e6020fb82ab",
  transaction_status: "pending",
  fraud_status: "accept",
  status_message: "Success, transaction is found",
  merchant_id: "G928927512",
  permata_va_number: "2750040839817331",
  transaction_time: "2026-06-20 06:58:58",
  expiry_time: "2026-06-21 06:58:58"
}


  "payment_type": "bank_transfer",
   "bank_transfer":{
      "bank": "bca",
       "bank": "bni",
       "bank": "bri"
  }
   "payment_type": "permata",


   {
    "status_code": "201",
    "status_message": "Success, Bank Transfer transaction is created",
    "transaction_id": "be03df7d-2f97-4c8c-a53c-8959f1b67295",
    "order_id": "1571823229",
    "merchant_id": "G812785002",
    "gross_amount": "44000.00",
    "currency": "IDR",
    "payment_type": "bank_transfer",
    "transaction_time": "2019-10-23 16:33:49",
    "transaction_status": "pending",
    "va_numbers": [
        {
            "bank": "bca",
            "va_number": "812785002530231"
        }
    ],
    "fraud_status": "accept"
}

{
    "status_code": "201",
    "status_message": "Success, Bank Transfer transaction is created",
    "transaction_id": "2194a77c-a412-4fd8-8ec8-121ff64fbfee",
    "order_id": "1571823369",
    "merchant_id": "G812785002",
    "gross_amount": "44000.00",
    "currency": "IDR",
    "payment_type": "bank_transfer",
    "transaction_time": "2019-10-23 16:36:08",
    "transaction_status": "pending",
    "va_numbers": [
        {
            "bank": "bni",
            "va_number": "9888500212345678"
        }
    ],
    "fraud_status": "accept"
}

{
    "status_code": "201",
    "status_message": "Success, Bank Transfer transaction is created",
    "transaction_id": "9aed5972-5b6a-401e-894b-a32c91ed1a3a",
    "order_id": "1466323342",
    "gross_amount": "20000.00",
    "payment_type": "bank_transfer",
    "transaction_time": "2016-06-19 15:02:22",
    "transaction_status": "pending",
    "va_numbers": [
      {
        "bank": "bri",
        "va_number": "8578000000111111"
      }
    ],
    "fraud_status": "accept",
    "currency": "IDR"
}

{
    "status_code": "201",
    "status_message": "Success, PERMATA VA transaction is successful",
    "transaction_id": "035ca76c-b814-4264-9e63-68142351df83",
    "order_id": "1571823410",
    "gross_amount": "44000.00",
    "currency": "IDR",
    "payment_type": "bank_transfer",
    "transaction_time": "2019-10-23 16:36:49",
    "transaction_status": "pending",
    "fraud_status": "accept",
    "permata_va_number": "850003072869607",
    "merchant_id": "G812785002"
}

curl -X POST \
  https://api.midtrans.com/v2/charge \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Basic <YOUR SERVER KEY ENCODED in Base64>' \
  -H 'X-Override-Notification: <YOUR BACKEND URL TO RECEIVE NOTIFICATION>' \
  -d '{
  "payment_type": "qris",
  "transaction_details": {
    "order_id": "order102",
    "gross_amount": 789000
  }
}'

{
    "status_code": "201",
    "status_message": "QRIS transaction is created",
    "transaction_id": "1015a919-b03f-450a-bc85-b38202a79a96",
    "order_id": "order102",
    "merchant_id": "G490526303",
    "gross_amount": "789000.00",
    "currency": "IDR",
    "payment_type": "qris",
    "transaction_time": "2021-06-23 15:25:24",
    "transaction_status": "pending",
    "fraud_status": "accept",
    "actions": [
        {
            "name": "generate-qr-code",
            "method": "GET",
            "url": "https://api.midtrans.com/v2/qris/1015a919-b03f-450a-bc85-b38202a79a96/qr-code"
        }
    ],
    "qr_string": "00020101021226620014COM.GO-JEK.WWW011993600914349052630340210G4905263030303UKE51440014ID.CO.QRIS.WWW0215AID0607336128660303UKE5204341453033605802ID5904Test6007BANDUNG6105402845409789000.0062475036c032f87c-f773-4619-aefa-675e1f06f9210703A016304A623",
    "acquirer": "gopay"
}

{
  "name": "generate-qr-code",
  "method": "GET",
  "url": "https://api.midtrans.com/v2/qris/1015a919-b03f-450a-bc85-b38202a79a96/qr-code"
}

{
  "transaction_type": "on-us",
  "transaction_time": "2021-06-23 15:45:42",
  "transaction_status": "settlement",
  "transaction_id": "1015a919-b03f-450a-bc85-b38202a79a96",
  "status_message": "midtrans payment notification",
  "status_code": "200",
  "signature_key": "5d40504728eb96686bd5926299768a6496547f70dbd1e19d583ef4e780fe9dd5c38d0db45ec0f06dafa5c56caa6cf8358ead1523882b5fb3e102c52345d41850",
  "settlement_time": "2021-06-23 15:46:00",
  "payment_type": "qris",
  "order_id": "order102",
  "merchant_id": "G490526303",
  "issuer": "gopay",
  "gross_amount": "789000.00",
  "fraud_status": "accept",
  "currency": "IDR",
  "acquirer": "gopay"
}


{
  status_code: "201",
  transaction_id: "80cbb7d0-6317-40c3-b076-c3797e2b6b98",
  gross_amount: "20000.00",
  currency: "IDR",
  order_id: "PAY-1781916491394",
  payment_type: "bank_transfer",
  signature_key: "a0b9037f15e755b4c517399dcd76d04d7094da559e82711ec091c3dce5e8cd651d2fc08de2aead8ee613a7956abb2be4aed9dff19f308dc606d2a844a390fc23",
  transaction_status: "pending",
  fraud_status: "accept",
  status_message: "Success, transaction is found",
  merchant_id: "G928927512",
  permata_va_number: "2750069349769861",
  transaction_time: "2026-06-20 07:48:14",
  expiry_time: "2026-06-21 07:48:14"
}


pas ubah, ubah reference dan hapus midtrans_id


{
  transaction_type: "off-us",
  transaction_time: "2026-06-20 08:31:32",
  transaction_status: "pending",
  transaction_id: "cea67934-0f88-40d8-84af-6fc784fde7f7",
  status_message: "midtrans payment notification",
  status_code: "201",
  signature_key: "abb77912af6f73c7e6849c08fac372df1d98f3091405955cd39f126246ca5e2793b0481ca0d9737ec12d674c74038c684f308614cd31d785300f09a457198a4e",
  payment_type: "qris",
  order_id: "PAY-1781913535482",
  merchant_id: "G928927512",
  gross_amount: "42000.00",
  fraud_status: "accept",
  expiry_time: "2026-06-20 08:46:32",
  customer_details: {
    phone: "082144733128",
    full_name: "Marisa Martha",
    email: "marisamartha0@gmail.com"
  },
  currency: "IDR"
}



{
  payment_type: "qris",
  transaction_details: { order_id: "PAY-1781913535482", gross_amount: 42000 },
  bank_transfer: { bank: "qris" },
  customer_details: {
    first_name: "Marisa Martha",
    email: "marisamartha0@gmail.com",
    phone: "082144733128"
  },
  item_details: [
    {
      id: "de76ccc1-f8ec-4695-a1ac-7f555d1e780a",
      price: 2000,
      quantity: 1,
      name: "Bawang Dua Aja"
    },
    {
      id: "90c10951-3665-4d13-92d1-f2f46ad1d8b6",
      price: 20000,
      quantity: 2,
      name: "Bawang Merah Sekali"
    }
  ]
}


{
  status_code: "201",
  transaction_id: "a826519d-743d-4d24-b347-dfcd18097e81",
  gross_amount: "42000.00",
  currency: "IDR",
  order_id: "PAY-1781913535484",
  payment_type: "qris",
  signature_key: "b321954bf7a2aba6df85b45bcbf14acc80ce59b5efde798bcf08cf786e793d857ba08b84d3faf41abd74310c59a001657047fd78084c37d9398ad6c5ff206819",
  transaction_status: "pending",
  fraud_status: "accept",
  status_message: "Success, transaction is found",
  merchant_id: "G928927512",
  transaction_time: "2026-06-20 09:08:48",
  expiry_time: "2026-06-20 09:23:48"
}


ReferenceError: Cannot access 'payment' before initialization
    at cekStatus (file:///var/tmp/sb-compile-edge-runtime/mawam-midtrans/index.ts:24:33)
    at eventLoopTick (ext:core/01_core.js:175:7)
    at async handleCreatePayment (file:///var/tmp/sb-compile-edge-runtime/mawam-midtrans/index.ts:59:13)
    at async mapped (ext:runtime/http.js:246:20)


{
  payment_type: "qris",
  transaction_details: { order_id: "PAY-1781913535485", gross_amount: 42000 },
  bank_transfer: null,
  customer_details: {
    first_name: "Marisa Martha",
    email: "marisamartha0@gmail.com",
    phone: "082144733128"
  },
  item_details: [
    {
      id: "de76ccc1-f8ec-4695-a1ac-7f555d1e780a",
      price: 2000,
      quantity: 1,
      name: "Bawang Dua Aja"
    },
    {
      id: "90c10951-3665-4d13-92d1-f2f46ad1d8b6",
      price: 20000,
      quantity: 2,
      name: "Bawang Merah Sekali"
    }
  ]
}

{
  transaction_type: "off-us",
  transaction_time: "2026-06-20 09:36:07",
  transaction_status: "pending",
  transaction_id: "e02959fe-af5a-4e55-a3f6-3bac3a862757",
  status_message: "midtrans payment notification",
  status_code: "201",
  signature_key: "4ef70077e2d23989660e82f8262bd0f6fc374b54c3c138322fe0231f171c9f2976e3c4708ed3c0e9aff06822b29bc8e94b590576d27f6c4e629685ba5bfa98b3",
  payment_type: "qris",
  order_id: "PAY-1781913535485",
  merchant_id: "G928927512",
  gross_amount: "42000.00",
  fraud_status: "accept",
  expiry_time: "2026-06-20 09:51:07",
  customer_details: {
    phone: "082144733128",
    full_name: "Marisa Martha",
    email: "marisamartha0@gmail.com"
  },
  currency: "IDR"
}

{
  status_code: "407",
  transaction_id: "cc8cb033-125d-423c-8674-03f3b1d10c70",
  gross_amount: "20000.00",
  currency: "IDR",
  order_id: "PAY-1781916491399",
  payment_type: "qris",
  signature_key: "2db6e8c3a52a78d41072a3ef06ac84e7e534f20128c9bb1f8b9efa88c5832e5d75acd3ddeb85db3152337f2d743e6551e6df374f14434222f9ac140fc55e7b3f",
  transaction_status: "expire",
  fraud_status: "accept",
  status_message: "Success, transaction is found",
  merchant_id: "G928927512",
  transaction_time: "2026-06-20 09:31:09",
  expiry_time: "2026-06-20 09:46:09"
}


{
  status_code: "407",
  transaction_id: "e02959fe-af5a-4e55-a3f6-3bac3a862757",
  gross_amount: "42000.00",
  currency: "IDR",
  order_id: "PAY-1781913535485",
  payment_type: "qris",
  signature_key: "0370a0c7f6d92397e90b2c6301c59b6a3418886ce493886792372f511e7f2bb7203e9f8469a319c709d03de8c21c2b384ae5c6a9e38633ef71cabd2292b2cf6e",
  transaction_status: "expire",
  fraud_status: "accept",
  status_message: "Success, transaction is found",
  merchant_id: "G928927512",
  transaction_time: "2026-06-20 09:36:07",
  expiry_time: "2026-06-20 09:51:07"
}



/// tabahkan auto cek status pas di tab pembayaran

{
  transaction_type: "off-us",
  transaction_time: "2026-06-20 09:57:45",
  transaction_status: "settlement",
  transaction_id: "d45975a8-7715-4820-a97a-07ccc3a203b6",
  status_message: "midtrans payment notification",
  status_code: "200",
  signature_key: "5824a42e925867b7e4dea691e8765000d5d4c4453d299120bfacd96994eead8b0b3ef419127782cf6897ebf4ac1d6d262d43415f94b48f97a773146f06612199",
  settlement_time: "2026-06-20 10:04:16",
  pop_id: "813e8449-4462-4faf-b7d9-0cf6f047be05",
  payment_type: "qris",
  order_id: "PAY-1781924259015",
  merchant_id: "G928927512",
  issuer: "dana",
  gross_amount: "4000.00",
  fraud_status: "accept",
  expiry_time: "2026-06-20 10:12:45",
  customer_details: {
    phone: "082144733128",
    full_name: "Marisa Martha",
    email: "marisamartha0@gmail.com"
  },
  currency: "IDR",
  acquirer: "gopay"
}


{
  transaction_type: "on-us",
  transaction_time: "2026-06-20 10:22:02",
  transaction_status: "settlement",
  transaction_id: "e7fa2d77-1cde-403c-bee1-a256b7da27ab",
  status_message: "midtrans payment notification",
  status_code: "200",
  signature_key: "83011dd4487f4833bbd046d2f4f13231c1f200009958d90d18947093bbfee6c4689a9425826ad1c6430e44e2664dcd0fd2fb2eeb6ca70b707494eb5cc3a5f8c5",
  settlement_time: "2026-06-20 10:23:05",
  pop_id: "813e8449-4462-4faf-b7d9-0cf6f047be05",
  payment_type: "qris",
  order_id: "PAY-1781925719019",
  merchant_id: "G928927512",
  merchant_cross_reference_id: "363f3f77-97c3-45ee-85c4-7c5385e7fd0a",
  issuer: "gopay",
  gross_amount: "2000.00",
  fraud_status: "accept",
  expiry_time: "2026-06-20 10:37:01",
  customer_details: {
    phone: "082144733128",
    full_name: "Marisa Martha",
    email: "marisamartha0@gmail.com"
  },
  currency: "IDR",
  acquirer: "gopay"
}



<!-- Kelola Suka Produk -->
setelah suka tambahakan fitur API Pengiriman
Lacak Pengiriman
Chat
Buat Penilaian
Edit Akun
Slide Gambar Produk
diskon


biteship_test.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiTWF3YU0iLCJ1c2VySWQiOiI2YTM4NjYyYjM0YTI1ZWMwMTY1ZmVmYTkiLCJpYXQiOjE3ODIwODE4NDh9.SCNcQrEjQAf3EaUHf8TH--iDjZF0fRjdL6jyKR3-BTw


1 user bisa punya banyak alamat

id
profile_id
label
  Rumah
  Gudang
  Kebun
penerima
telepon
provinsi
kabupaten
kecamatan
kelurahan
kode_pos
alamat_lengkap
latitude
longitude
is_default


produk

id
petani_id
nama
slug
deskripsi
harga
stok
berat
  = gram
  if kargo 
    panjang
    lebar
    tinggi
kategori
foto
aktif
asal_alamat_id // petani punya banyak gudang?

pesanan

id
invoice
pembeli_id
subtotal
ongkir
diskon
total
status
  pending
  dibayar
  diproses
  dikirim
  selesai
  dibatalkan
alamat_pengiriman_id

detail pesanan

id
pesanan_id
produk_id
qty
harga
berat
subtotal

mawam_pengiriman

id
pesanan_id
provider = biteship
courier_code = jne
courier_name = JNE
service = REG
shipping_cost
estimated_days
tracking_number
biteship_order_id
status
  waiting
  confirmed
  picked_up
  on_delivery
  delivered
  cancelled

mawam_tracking

id
pengiriman_id
status
deskripsi
lokasi
latitude
longitude
waktu

mawam_notifikasi

id
profile_id
judul
pesan
tipe
  payment
  shipping
  promo

_________________________
mawam_cart

total_berat


Bisa tambahan ke mawam_produk

tanggal_panen
grade
kadar_air
asal_lahan
metode_budidaya

mawam_biteship_logs
-------------------
id
endpoint
request_json
response_json
status_code
created_at


jika petani baru bisa tamba produk

create table mawam_alamat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references mawam_profile(id) on delete cascade,

  label text,
  penerima text,
  telepon text,

  provinsi text,
  kabupaten text,
  kecamatan text,
  kelurahan text,
  kode_pos text,
  alamat_lengkap text,

  latitude double precision,
  longitude double precision,

  is_default boolean default false,
  created_at timestamp default now()
);


  tambahkan ke tabel order
    alamat_pengiriman_id uuid references mawam_alamat(id),
    subtotal numeric default 0,
    ongkir numeric default 0,
    diskon numeric default 0,
    total numeric default 0,

create table mawam_pengiriman (
  id uuid primary key default gen_random_uuid(),

  order_id uuid references mawam_orders(id) on delete cascade,

  provider text default 'biteship',

  courier_code text,
  courier_name text,
  service text,

  shipping_cost numeric default 0,
  estimated_days text,

  tracking_number text,
  biteship_order_id text,

  status text default 'waiting',

  created_at timestamp default now()
);

alter table mawam_alamat enable row level security;
alter table mawam_pengiriman enable row level security;

create policy "alamat_all_own"
on mawam_alamat
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "shipping_follow_order"
on mawam_pengiriman
for select
using (
  exists (
    select 1 from mawam_orders o
    where o.id = order_id
    and o.buyer_id = auth.uid()
  )
);


Badge Belum bayar
Pembeli sudah bayar notif ke penjual
<!-- Tambakan button X untuk Heart -->
Testimoni Komentar
Gram / Kilogram set untuk satuan
Chat dengan Penjual
Edit Harga Produk format input harga
<!-- tutup otomatis atau tambah ikon keranjang saat add to cart di detail Produk -->

Bisa upload Video

seller note untuk setiap toko


pindahkan button tambah dan export di halamana toko saya yang ada produk

<!-- https://api.binderbyte.com/v1/locations?search=kupang&api_key=d85be5b392f63d571ceb75040b8eae0fe33ace42b51614f5b2ecccf0de11ae97 -->

{
  "code": "200",
  "message": "Successfully received data",
  "data": [
    {
      "id": "village_53.14.07.2007",
      "type": "village",
      "label": "Mbueain, Rote Barat, Rote Ndao (85981)"
    }
  ]
}

<!-- district_53.01.05 -->
<!-- village_53.14.07.2007 -->

// 32.3216.321603.3216032004
// 53.5371.537101.5371011011

{
  "code": "200",
  "message": "Successfully received data",
  "data": [
    {
      "id": "village_31.75.02.1006",
      "type": "village",
      "label": "Kayu Putih, Pulogadung, Jakarta Timur (13210)"
    },
    {
      "id": "village_35.12.08.2012",
      "type": "village",
      "label": "Kayu Putih, Panji, Situbondo (68323)"
    },
    {
      "id": "village_51.08.05.2015",
      "type": "village",
      "label": "Kayu Putih, Sukasada, Buleleng (81161)"
    },
    {
      "id": "village_53.71.04.1013",
      "type": "village",
      "label": "Kayu Putih, Oebobo, Kupang (85111)"
    },
    {
      "id": "village_15.09.06.2003",
      "type": "village",
      "label": "Teluk Kayu Putih, Vii Koto, Tebo (37561)"
    }
  ]
}

<!-- 53.5371.537104.5371041013 -->
<!-- village_53.71.04.1013 -->
<!-- 53.5371.537101.5371011011 -->
<!-- 53.71.01.1011 -->

<!-- village_53.71.04.1013 -->
<!-- village_32.16.03.2004 -->



<!-- tambahakan biaya kirim di midtrans -->



{
	"name": "cancel",
	"method": "POST",
	"url": "https://api.midtrans.com/v2/e48447d1-cfa9-4b02-b163-2e915d4417ac/cancel",
	"fields": []
}


{
  "type":"cost",
  "courier":"jne",
  "origin":"village_52.72.05.1001",
  "destination":"village_53.71.04.1013",
  "weight":1000
}

{
  "type":"track",
  "courier":"jne",
  "awb":"582230008329223",
  "number":"xxxxx"
}


<!-- outputh dari api kita -->

{
  "success": true,
  "source": "binder",
  "data": {
    "code": "200",
    "message": "Successfully calculated cost",
    "data": {
      "origin": {
        "id": "village_52.72.05.1001",
        "label": "Monggonao, Mpunda, Bima (84111)"
      },
      "destination": {
        "id": "village_53.71.04.1013",
        "label": "Kayu Putih, Oebobo, Kupang (85111)"
      },
      "weight": "1000",
      "results": [
        {
          "code": "jne",
          "name": "JNE Express",
          "costs": [
            {
              "code": "jne",
              "name": "JNE Express",
              "service": "REG",
              "type": "Document/Paket",
              "price": "62000000",
              "estimated": "3-5 hari"
            },
            {
              "code": "jne",
              "name": "JNE Express",
              "service": "JTR&gt;200",
              "type": "Paket",
              "price": "4100000",
              "estimated": "10-11 hari"
            },
            {
              "code": "jne",
              "name": "JNE Express",
              "service": "JTR&gt;130",
              "type": "Paket",
              "price": "3900000",
              "estimated": "10-11 hari"
            },
            {
              "code": "jne",
              "name": "JNE Express",
              "service": "JTR&lt;130",
              "type": "Paket",
              "price": "2800000",
              "estimated": "11-15 hari"
            },
            {
              "code": "jne",
              "name": "JNE Express",
              "service": "JTR",
              "type": "Paket",
              "price": "23000000",
              "estimated": "10-11 hari"
            }
          ]
        }
      ]
    }
  }
}

<!--  -->

{
  "success": true,
  "source": "cache",
  "data": {
    "code": "200",
    "data": {
      "origin": {
        "id": "village_52.72.05.1001",
        "label": "Monggonao, Mpunda, Bima (84111)"
      },
      "weight": "1000",
      "results": [
        {
          "code": "jne",
          "name": "JNE Express",
          "costs": [
            {
              "code": "jne",
              "name": "JNE Express",
              "type": "Document/Paket",
              "price": "62000000",
              "service": "REG",
              "estimated": "3-5 hari"
            },
            {
              "code": "jne",
              "name": "JNE Express",
              "type": "Paket",
              "price": "4100000",
              "service": "JTR&gt;200",
              "estimated": "10-11 hari"
            },
            {
              "code": "jne",
              "name": "JNE Express",
              "type": "Paket",
              "price": "3900000",
              "service": "JTR&gt;130",
              "estimated": "10-11 hari"
            },
            {
              "code": "jne",
              "name": "JNE Express",
              "type": "Paket",
              "price": "2800000",
              "service": "JTR&lt;130",
              "estimated": "11-15 hari"
            },
            {
              "code": "jne",
              "name": "JNE Express",
              "type": "Paket",
              "price": "23000000",
              "service": "JTR",
              "estimated": "10-11 hari"
            }
          ]
        }
      ],
      "destination": {
        "id": "village_53.71.04.1013",
        "label": "Kayu Putih, Oebobo, Kupang (85111)"
      }
    },
    "message": "Successfully calculated cost"
  }
}



// maps 
https://maps.googleapis.com/maps/api/geocode/json?latlng=-10.160039660240475%2C123.62350299954414&key=AIzaSyB5Zf-tTLdsCoDhVJiv4klSDqpw4cX9U0Y&language=id

https://geocode.googleapis.com/v4/geocode/location/37.4225508,-122.0846338?key=AIzaSyB5Zf-tTLdsCoDhVJiv4klSDqpw4cX9U0Y

