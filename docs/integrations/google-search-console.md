# Panduan Integrasi Google Search Console (GSC) — Gravlytics

> **Gravlytics** — _Where your data finds its center._  
> Panduan lengkap menghubungkan properti Google Search Console ke Gravlytics untuk memantau performa SEO, kata kunci pencarian, tayangan (impressions), klik, CTR, dan posisi peringkat Google langsung di dashboard Anda.

---

## 📌 Ringkasan & Manfaat

Dengan menghubungkan **Google Search Console** ke Gravlytics:
1. **Analisis Kata Kunci Organik (Keywords)**: Mengetahui kueri pencarian apa saja yang membawa pengunjung ke website Anda.
2. **Monitoring Muncul di Google News (Google Berita)**: Mengetahui artikel dan halaman mana saja yang terdeteksi dan mendapatkan klik serta impresi langsung dari feed Google News.
3. **Analisis Google Discover (Feed Rekomendasi)**: Mengukur lalu lintas pembaca mobile dari feed Google Discover (`searchType: 'discover'`).
4. **Peluang SEO & Striking Distance (#4–#20)**: Menemukan kata kunci dengan tayangan tinggi yang berada di ambang Top 3 Google, siap melonjak dengan sedikit optimasi on-page.
5. **Optimasi Low CTR (#1–#5)**: Menyoroti kata kunci berposisi tinggi namun ber-CTR rendah agar meta title & description dapat diperbaiki.
6. **Deteksi Kanibalisasi Kata Kunci**: Mengidentifikasi halaman-halaman yang saling bersaing untuk query Google yang sama.
7. **Deteksi Status Indeks Google (Indexed URLs)**: Memantau daftar URL mana saja yang sudah berhasil diindeks oleh Googlebot dan mana yang masih berstatus pending/dikecualikan (excluded).
8. **Inspeksi Googlebot Real-Time**: Menggunakan Google URL Inspection API v1 untuk menguji URL apa saja secara live (status kanonikal Google, izin crawling robots.txt, hasil kaya/rich results, dan user-agent perayap).
9. **Manajemen XML Sitemaps (Google Sitemaps API)**: Memantau status pengiriman sitemap, jumlah URL yang diserahkan vs diindeks, serta submit sitemap baru langsung dari dashboard.
10. **1-Click Export CSV**: Mengunduh laporan kata kunci, performa landing pages, status indeks, dan peluang SEO dalam format CSV.
11. **Metrik Pencarian Terintegrasi**:
   - **Clicks**: Jumlah klik dari hasil pencarian Google.
   - **Impressions**: Seberapa sering halaman website Anda muncul di hasil pencarian Google.
   - **CTR (Click-Through Rate)**: Rasio antara klik dan tayangan (`(Clicks / Impressions) * 100%`).
   - **Average Position**: Rata-rata posisi peringkat kata kunci atau halaman di Google Search.
12. **Privasi & Keamanan Penuh**: Kunci privat tersimpan aman di basis data lokal Gravlytics, ditandatangani secara lokal menggunakan **RS256 JWT** tanpa membagikan kredensial ke pihak ketiga mana pun.
13. **Izin Sesuai Kebutuhan**: Mendukung read-only dan sitemaps management.

---

## 🏗️ Metode Autentikasi yang Didukung

Gravlytics mendukung dua metode koneksi:

| Fitur | Metode 1: Service Account (Sangat Direkomendasikan) | Metode 2: Google OAuth2 |
|---|---|---|
| **Kesesuaian** | Ideal untuk instalasi self-hosted, server headless, dan produksi. | Cocok jika tim ingin autentikasi login via browser. |
| **Masa Berlaku** | Permanen (tidak ada refresh token yang expired). | Token perlu di-refresh secara berkala. |
| **Verifikasi Google App** | Tidak memerlukan proses verifikasi layar consent Google. | Memerlukan setup OAuth Consent Screen. |
| **Cara Setup** | Download file JSON Service Account dari Google Cloud lalu paste/upload di Gravlytics. | Buat OAuth Client ID dan redirect URI. |

---

## 🚀 Panduan Setup Langkah-demi-Langkah (Metode Service Account)

Metode ini adalah cara paling cepat, stabil, dan aman untuk menghubungkan Gravlytics dengan Google Search Console.

### Langkah 1: Aktifkan Google Search Console API di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru (misal: `gravlytics-analytics`) atau pilih project yang sudah ada.
3. Di bilah navigasi kiri, buka menu **APIs & Services > Library** (Pustaka API).
4. Cari kata kunci: `Google Search Console API`.
5. Klik **Google Search Console API** lalu klik tombol **Enable** (Aktifkan).

---

### Langkah 2: Buat Service Account & Unduh Kunci JSON

1. Di Google Cloud Console, buka menu **IAM & Admin > Service Accounts** (Akun Layanan).
2. Klik tombol **+ Create Service Account** (+ Buat Akun Layanan) di bagian atas.
3. Beri nama akun layanan, misalnya:
   - **Service account name**: `gravlytics-gsc-reader`
   - **Service account ID**: `gravlytics-gsc-reader` (otomatis terisi)
4. Klik **Create and Continue** lalu klik **Done** (tidak perlu memilih role IAM project karena izin akan diberikan langsung di Google Search Console).
5. Pada daftar Service Accounts, klik akun layanan yang baru saja dibuat.
6. Masuk ke tab **Keys** (Kunci).
7. Klik **Add Key > Create new key** (Tambahkan Kunci > Buat kunci baru).
8. Pilih tipe kunci **JSON**, lalu klik **Create**.
9. File kunci `.json` akan otomatis terunduh ke komputer Anda. Simpan file ini dengan aman.
10. Catat alamat email Service Account dari file tersebut (properti `client_email`), contohnya:
    ```
    gravlytics-gsc-reader@project-id-123456.iam.gserviceaccount.com
    ```

---

### Langkah 3: Berikan Izin Service Account di Google Search Console

1. Buka [Google Search Console](https://search.google.com/search-console).
2. Di pojok kiri atas, pilih properti situs Anda (contoh: `sc-domain:example.com` atau `https://example.com/`).
3. Di bilah menu kiri, gulir ke bawah dan klik **Settings** (Setelan).
4. Klik **Users and permissions** (Pengguna dan izin).
5. Klik tombol **Add user** (Tambahkan pengguna) di pojok kanan atas.
6. Isi formulir:
   - **Email address**: Masukkan email Service Account dari Langkah 2 (misal: `gravlytics-gsc-reader@project-id-123456.iam.gserviceaccount.com`).
   - **Permission**: Pilih **Full** (Penuh) atau **Restricted** (Dibatasi / Baca).
7. Klik **Add** (Tambahkan).

> [!TIP]
> Google Search Console memerlukan waktu beberapa saat untuk memperbarui daftar izin. Setelah ditambahkan, akun layanan Anda langsung dapat membaca metrik performa pencarian.

---

### Langkah 4: Hubungkan ke Dashboard Gravlytics

1. Buka Dashboard Gravlytics Anda di browser (misal: `http://localhost:5173`).
2. Di pojok kanan atas, pastikan situs yang aktif sesuai dengan properti yang ingin Anda hubungkan.
3. Buka menu **Settings > Integrations** (`/settings/integrations`).
4. Pada kartu **Google Search Console**:
   - Pastikan tab **Service Account (Recommended)** terpilih.
   - Klik tombol **Upload .json file** dan pilih file JSON yang Anda unduh di Langkah 2, atau paste isi file JSON langsung ke kotak teks.
   - Periksa **Search Console Property URL**:
     - Jika properti domain: `sc-domain:namadomain.com`
     - Jika properti URL prefix: `https://namadomain.com/` (harus menyertakan protokol dan trailing slash jika terdaftar demikian di GSC).
5. Klik tombol **Test & Discover Properties**:
   - Gravlytics akan menguji autentikasi secara langsung ke Google API menggunakan signature RS256.
   - Jika berhasil, daftar properti yang dapat diakses oleh akun layanan tersebut akan otomatis muncul di dropdown.
6. Klik **Save & Connect Search Console**.
7. Status integrasi akan berubah menjadi **Connected & Synced** dengan tanda hijau aktif.

---

## 🌐 Panduan Alternatif: Menghubungkan via Google OAuth2

Jika Anda lebih memilih otentikasi login satu klik menggunakan akun Google pribadi/tim:

### 1. Buat OAuth Client ID di Google Cloud Console
1. Buka **APIs & Services > Credentials**.
2. Klik **+ Create Credentials > OAuth client ID**.
3. Pilih Application type: **Web application**.
4. Beri nama: `Gravlytics Web Client`.
5. Di bagian **Authorized redirect URIs**, tambahkan:
   ```
   http://localhost:5173/api/integrations/search-console/oauth/callback
   ```
   *(Ganti domain sesuai URL instalasi produksi Gravlytics Anda)*.
6. Salin **Client ID** dan **Client Secret**.

### 2. Konfigurasi Environment Variables
Buka file `.env` di direktori proyek Gravlytics Anda:
```bash
GSC_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GSC_CLIENT_SECRET=GOCSPX-your-google-client-secret
GSC_REDIRECT_URI=http://localhost:5173/api/integrations/search-console/oauth/callback
```

### 3. Autentikasi di Dashboard
1. Buka **Settings > Integrations**.
2. Pilih tab **OAuth2 Login**.
3. Klik tombol **Authorize with Google Search Console**.
4. Login menggunakan akun Google yang memiliki hak akses ke properti Search Console yang bersangkutan.
5. Setelah mengizinkan akses, Google akan mengarahkan kembali ke Gravlytics dan properti siap digunakan!

---

## 📊 Melihat Data Search Console di Dashboard

Setelah terhubung, Anda dapat memantau data performa SEO kapan saja:

1. Di bilah navigasi kiri (Sidebar), klik menu **Search Console** (ikon kaca pembesar dengan badge `SEO`).
2. Anda akan disajikan:
   - **Summary KPI Cards**: Total Klik, Total Tayangan, Rata-rata CTR, dan Rata-rata Posisi Google Search.
   - **Search Trend Chart**: Grafik pergerakan klik dan tayangan harian sesuai rentang tanggal yang dipilih di Date Picker global.
   - **Tab Kueri / Kata Kunci (Top Queries)**:
     - Teks kata kunci pencarian.
     - Jumlah klik dan tayangan.
     - Bar visualisasi CTR.
     - Badge peringkat Google (Tier 1–3 Hijau, Tier 4–10 Cyan, Tier 10+ Abu).
     - Tombol cepat untuk langsung melihat hasil pencarian di Google.
     - Kotak filter untuk mencari kata kunci spesifik.
   - **Tab Landing Pages**: Halaman tujuan yang paling banyak menerima kunjungan dari Google Search.
   - **Tab Countries**: Distribusi negara asal pencari di Google.
   - **Tab Devices**: Proporsi pencarian dari perangkat Desktop, Mobile, dan Tablet.

---

## ❓ FAQ & Troubleshooting

### 1. Error: "User does not have sufficient permission for site"
- **Penyebab**: Email Service Account belum ditambahkan ke properti Google Search Console, atau properti URL salah ketik.
- **Solusi**:
  1. Salin email `client_email` dari Service Account.
  2. Masuk ke [Google Search Console](https://search.google.com/search-console) > Settings > Users and permissions.
  3. Pastikan email tersebut terdaftar dengan hak akses **Full** atau **Restricted**.

### 2. Apa bedanya `sc-domain:example.com` dan `https://example.com/`?
- Di Google Search Console terdapat 2 tipe properti:
  - **Domain Property**: Mengawasi seluruh subdomain (`www`, `blog`, dll). Formatnya di API adalah `sc-domain:namadomain.com` (tanpa `https://` dan tanpa garis miring di akhir).
  - **URL-prefix Property**: Hanya mengawasi URL yang diawali protokol tertentu. Formatnya di API adalah `https://namadomain.com/` (harus diakhiri garis miring `/`).
- Gunakan tombol **Test & Discover Properties** di menu Settings Integrations Gravlytics untuk memilih format properti yang tepat secara otomatis.

### 3. Mengapa data hari ini belum muncul di Search Console?
- Google Search Console API memiliki jeda pemrosesan data (biasanya **2 hingga 3 hari** ke belakang).
- Hal ini merupakan karakteristik bawaan dari Google Search Analytics API itu sendiri. Jika Anda memilih rentang tanggal "Hari Ini", Gravlytics akan menampilkan metrik dari hari terakhir yang tersedia di data resmi Google.

### 4. Apakah Gravlytics aman menyimpan Service Account Key?
- Kunci Service Account hanya disimpan di server basis data PostgreSQL internal Anda (tidak pernah dikirim ke browser client atau layanan pihak ketiga mana pun).
- Saat melakukan query ke Google, server Gravlytics membuat JWT assertion terenkripsi RS256 secara in-memory untuk meminta short-lived Bearer token (1 jam) langsung ke `oauth2.googleapis.com`.

---

## 🔌 Referensi REST API

Gravlytics menyediakan endpoint API internal untuk mengelola integrasi:

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/integrations/search-console?siteId={id}` | Memeriksa status koneksi GSC untuk situs tertentu. |
| `POST` | `/api/integrations/search-console` | Menyimpan kredensial Service Account / OAuth dan menghubungkan properti. |
| `DELETE` | `/api/integrations/search-console?siteId={id}` | Memutuskan sambungan Search Console dari situs. |
| `POST` | `/api/integrations/search-console/test` | Menguji validitas kredensial dan mengambil daftar properti Google API. |
| `GET` | `/api/integrations/search-console/properties?siteId={id}` | Mengambil daftar properti terverifikasi yang dapat diakses. |
| `GET` | `/api/integrations/search-console/data?siteId={id}&from={date}&to={date}&searchType=web\|news\|discover` | Mengambil data kata kunci, klik, tayangan, CTR, dan posisi Google Search, Google News, atau Google Discover. |
| `GET` | `/api/integrations/search-console/indexation?siteId={id}` | Mengambil ikhtisar status indeks seluruh URL, daftar URL terindex, kemunculan di Pencarian Google, dan kemunculan di Google News. |
| `POST` | `/api/integrations/search-console/inspect` | Menjalankan inspeksi langsung Googlebot URL Inspection API v1 untuk satu URL spesifik. |
| `GET` | `/api/integrations/search-console/opportunities?siteId={id}` | Menghitung peluang kata kunci Striking Distance (#4–#20), optimasi Low CTR, dan kanibalisasi URL. |
| `GET` | `/api/integrations/search-console/sitemaps?siteId={id}` | Mengambil daftar XML sitemap yang terdaftar via Google Sitemaps API v3. |
| `POST` | `/api/integrations/search-console/sitemaps` | Menyerahkan (*submit*) XML sitemap baru ke Googlebot. |
| `DELETE` | `/api/integrations/search-console/sitemaps` | Menghapus sitemap terdaftar dari Google Search Console. |
| `GET` | `/api/integrations/search-console/export?siteId={id}&type=queries\|pages\|indexation\|opportunities\|sitemaps` | Mengekspor laporan data SEO ke format file CSV dengan 1-klik. |
