# PRD — Gravlytics

> **Gravlytics** — _Where your data finds its center._
> Platform web analytics privacy-first, self-hostable, dan multi-tenant (mirip GA / Umami).

**Stack:** ClickHouse · PostgreSQL · Redpanda · Go · dbt · SvelteKit · Bun · Tailwind · shadcn-svelte · Redis
**Status:** Draft · **Tanggal:** 2026-09-21

---

## Ringkasan

Membangun **Gravlytics**, platform web analytics **privacy-first**, **self-hostable**, dan **multi-tenant** mirip Google Analytics / Umami. Event masuk lewat tracker ringan → disangga **Redpanda** → disimpan di **ClickHouse**, dengan **PostgreSQL** untuk metadata dan **Redis** sebagai cache di depan query API. Frontend dashboard dibangun dengan **SvelteKit + Tailwind + shadcn-svelte**.

| Target                                | Nilai    |
| ------------------------------------- | -------- |
| Query p95 (dashboard default)         | < 500 ms |
| Event → queryable (latensi ingestion) | < 5 s    |
| Ukuran tracker (gzip, tanpa cookie)   | < 2 KB   |
| Uptime SLA (ingestion endpoint)       | 99.9%    |

---

## Brand & Identitas Visual

### Nama & narasi

**Gravlytics** = _gravity_ + _analytics_. Mengacu pada konsep **"data gravity"**: data menarik lebih banyak data dan layanan ke arahnya, seperti massa menarik benda di sekitarnya. Gravlytics adalah pusat gravitasi tempat semua sinyal trafik Anda berkumpul dan menjadi insight.

### Tagline

- **Utama:** _Where your data finds its center._
- Alternatif: _Analytics with pull._
- Alternatif: _Every signal, drawn into focus._
- Versi ID: _Pusat gravitasi data Anda._

### Konsep logo

- **Mark:** sebuah titik inti (data core) dikelilingi satu lintasan orbit elips — sumbu gravitasi. Alternatif: tiga batang bar-chart yang ujungnya melengkung menarik ke satu titik fokus (meniru pembelokan cahaya oleh gravitasi / _gravitational lensing_).
- **Logotype:** huruf **"G"** yang ekornya melengkung menjadi orbit — menyatukan inisial dengan metafora gravitasi.
- **Favicon:** titik solid + cincin orbit tipis; tetap terbaca di 16×16 px.
- **Prinsip:** geometris, minimal, satu-warna-friendly (untuk CLI, watermark, dark mode).

### Palet warna

| Peran             | Warna           | Hex       |
| ----------------- | --------------- | --------- |
| Ink (dasar gelap) | Deep space navy | `#0E1116` |
| Primary           | Gravity violet  | `#6D5EF6` |
| Accent            | Signal cyan     | `#22D3EE` |
| Surface (light)   | Off-white       | `#F7F8FA` |
| Muted             | Slate gray      | `#64748B` |
| Positive          | Emerald         | `#10B981` |
| Warning           | Amber           | `#F59E0B` |

**Arahan pemakaian:** background gelap `Ink` untuk hero & dashboard dark mode; `violet → cyan` sebagai gradient aksen pada grafik, tombol utama, dan garis time-series. Netral abu untuk teks & grid. Konsisten dengan tema shadcn-svelte (token warna dipetakan ke CSS variables Tailwind).

---

## I. Tujuan & Non-Tujuan

### Masalah

GA terlalu berat, invasif privasi, dan sulit di-self-host; Umami terlalu terbatas untuk analisis mendalam. Tim produk butuh analytics real-time, tanpa cookie, patuh GDPR, yang bisa dijalankan sendiri dan diskalakan ke miliaran event tanpa biaya per-event yang meledak.

### Tujuan (Goals)

- Tracking web tanpa cookie, patuh GDPR, tracker < 2 KB.
- Dashboard real-time: pageview, visitor unik, referrer, device, geo, top pages.
- Multi-tenant: satu instance melayani banyak situs & user dengan isolasi data.
- Self-hostable via Docker Compose; skala horizontal via cluster.
- API publik untuk query & ingestion terprogram.

### Non-Tujuan (MVP)

- Session replay, heatmap, feature flags (fase lanjut).
- Attribution multi-touch & integrasi ad platform.
- Mobile SDK native (mulai dari web + REST dulu).
- ML / anomaly detection otomatis.

---

## II. Pengguna & User Story

### Persona

| Persona                 | Kebutuhan utama                                      |
| ----------------------- | ---------------------------------------------------- |
| Developer / self-hoster | Pasang cepat, ringan, kendali data penuh             |
| Product manager         | Tren funnel, retensi, top pages tanpa nanya engineer |
| Marketer                | Sumber traffic, kampanye UTM, konversi               |
| Admin platform          | Kelola tenant, user, kuota, API key                  |

### User story inti

- Sebagai user, saya tempel satu snippet `<script>` dan langsung lihat data masuk.
- Sebagai PM, saya filter rentang tanggal & segmen lalu lihat grafik < 1 detik.
- Sebagai marketer, saya buat custom event (mis. `signup`) dan lihat konversinya.
- Sebagai admin, saya undang anggota tim dengan peran (owner/editor/viewer) per situs.

---

## III. Kebutuhan Fungsional (MVP)

| Fitur                 | Deskripsi                                                                | Prioritas |
| --------------------- | ------------------------------------------------------------------------ | --------- |
| Tracker script        | Auto-track pageview + SPA route change; API `track()` untuk custom event | P0        |
| Ingestion API         | Endpoint `POST /api/collect`, validasi, enqueue ke Redpanda              | P0        |
| Dashboard overview    | Pageview, unique visitor, bounce, avg duration, grafik time-series       | P0        |
| Breakdown             | Top pages, referrer, negara, device, browser, OS, UTM                    | P0        |
| Realtime              | Visitor aktif dalam 5 menit terakhir                                     | P0        |
| Custom event & goal   | Definisi event bernama + konversi                                        | P1        |
| Funnel & retensi      | Multi-step funnel, cohort retention                                      | P1        |
| Manajemen situs & tim | CRUD situs, RBAC, undangan, API key                                      | P0        |
| Filter & segmen       | Rentang tanggal, filter multi-dimensi, saved segment                     | P1        |
| Export & Query API    | REST/JSON untuk data agregat                                             | P1        |

---

## IV. Arsitektur & Alur Data

### Komponen per lapisan

Write-path dan read-path dipisah total dari database aplikasi.

| Lapisan          | Teknologi                                         | Peran                                                     |
| ---------------- | ------------------------------------------------- | --------------------------------------------------------- |
| Collection       | Tracker JS (vanilla, < 2 KB)                      | Kirim event ke ingestion API via `navigator.sendBeacon`   |
| Ingestion        | Collector service (Node/Bun atau Go)              | Validasi, enrich (geo/UA), produce ke Redpanda            |
| Streaming buffer | Redpanda (Kafka API)                              | Sangga lonjakan write, decoupling, replay                 |
| Consumer / sink  | Worker → ClickHouse (Kafka engine / batch insert) | Batch insert ke ClickHouse (hindari insert baris tunggal) |
| Event store      | ClickHouse (MergeTree)                            | Simpan & agregasi event, Materialized View untuk rollup   |
| Metadata store   | PostgreSQL                                        | User, tenant, situs, API key, goal, dashboard config      |
| Transformasi     | dbt (adapter ClickHouse)                          | Model rollup terjadwal, dokumentasi & lineage             |
| Query API        | SvelteKit endpoints / service backend             | Terjemahkan filter dashboard → SQL ClickHouse             |
| Cache            | Redis                                             | Cache hasil query agregat + realtime counter              |
| Frontend         | SvelteKit + Tailwind + shadcn-svelte              | Dashboard, charting, manajemen                            |

### Alur write (ingestion)

`Tracker → Collector → Redpanda → Consumer → ClickHouse`

Redpanda menjadi bantalan agar spike traffic tidak membebani ClickHouse dengan insert per-baris; consumer melakukan **batch insert** (mis. tiap 1–5 detik atau N baris). Ini menegakkan pola "hindari banyak transaksi kecil" pada OLAP.

- Idempotency via `event_id` (UUID) untuk dedup saat replay.
- Enrichment di collector: geo dari IP (lalu IP dibuang), parse User-Agent.
- Backpressure & DLQ (dead-letter topic) untuk event gagal validasi.

### Alur read (serving)

`Dashboard → Query API → cek Redis → (miss) ClickHouse → cache`

Query agregat umum (overview harian) di-cache di Redis dengan TTL pendek; realtime counter pakai Redis sorted-set / TTL key. Query berat dilayani dari Materialized View / tabel rollup dbt, bukan scan tabel mentah.

---

## V. Data Model

### Event — ClickHouse (engine MergeTree)

| Kolom                      | Tipe                    | Catatan                                |
| -------------------------- | ----------------------- | -------------------------------------- |
| site_id                    | UInt64 / UUID           | Kunci tenant (partisi/order)           |
| event_id                   | UUID                    | Dedup / idempotency                    |
| timestamp                  | DateTime64(3)           | Waktu event                            |
| event_name                 | LowCardinality(String)  | `pageview` atau custom                 |
| visitor_id                 | UInt64                  | Hash harian (salt+IP+UA), tanpa cookie |
| session_id                 | UInt64                  | Sesi turunan visitor_id                |
| url_path / hostname        | String / LowCardinality | Halaman                                |
| referrer_domain            | LowCardinality(String)  | Sumber traffic                         |
| utm_source/medium/campaign | LowCardinality(String)  | Kampanye                               |
| country / region           | LowCardinality(String)  | Dari geo-IP                            |
| device / browser / os      | LowCardinality(String)  | Dari User-Agent                        |
| props                      | Map(String, String)     | Properti custom event                  |

`ORDER BY (site_id, event_name, timestamp)`, partisi bulanan (`toYYYYMM`), TTL retensi opsional. Rollup via AggregatingMergeTree + Materialized View untuk unique-visitor harian.

### Metadata — PostgreSQL

| Tabel                    | Isi                                          |
| ------------------------ | -------------------------------------------- |
| users                    | Akun, kredensial, preferensi                 |
| organizations            | Tenant / workspace                           |
| sites                    | Domain, timezone, salt, tracking_id          |
| memberships              | User × org/site + role (owner/editor/viewer) |
| api_keys                 | Token ingestion & query, scope, rate limit   |
| goals / events_meta      | Definisi custom event & konversi             |
| saved_reports / segments | Konfigurasi dashboard tersimpan              |

---

## VI. Kebutuhan Non-Fungsional

### Privasi & kepatuhan (P0)

- Tanpa cookie & tanpa fingerprint persisten; `visitor_id` = hash harian dengan salt yang rotasi (tidak bisa lintas hari).
- IP mentah tidak pernah disimpan — hanya dipakai sesaat untuk geo lalu dibuang.
- Data ownership penuh (self-host); mode "Do Not Track" dihormati.

### Performa & skala

- Query dashboard p95 < 500 ms via cache + rollup; ingest → queryable < 5 s.
- Batch insert ke ClickHouse (bukan per-baris); target awal jutaan event/hari di single node, jalur upgrade ke cluster sharded+replicated.
- Rate limiting per API key di collector.

### Keamanan & operasional

- Isolasi tenant ketat di setiap query (selalu filter `site_id`; row-level guard di API).
- Auth: session + API key; secret via env; TLS di edge.
- Observability: metrics Prometheus, log terstruktur, alert lag consumer Redpanda.
- Deploy: Docker Compose (single-node) → Kubernetes/Helm (scale).

---

## VII. Roadmap, Metrik & Risiko

### Fase MVP

| Fase                | Fokus                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| M1 — Pipeline       | Tracker + collector + Redpanda + ClickHouse; event masuk & tersimpan  |
| M2 — Dashboard inti | SvelteKit + shadcn-svelte: overview, breakdown, time-series, realtime |
| M3 — Multi-tenant   | Postgres metadata, auth, RBAC, manajemen situs & API key              |
| M4 — Query layer    | Redis cache, rollup dbt, filter/segmen, Query API publik              |
| M5 — Lanjutan       | Custom event, goal, funnel, retensi, export                           |

### Metrik sukses

- Time-to-first-data setelah pasang script < 60 detik.
- Query p95 < 500 ms pada situs dengan > 10 juta event.
- Zero event loss saat spike (terbukti lewat replay Redpanda).
- Instance mampu melayani > 100 situs tanpa degradasi.

### Risiko & open question

- **Consumer ClickHouse:** pakai Kafka engine bawaan ClickHouse atau consumer worker sendiri? (kontrol batch vs kesederhanaan).
- **Unique visitor:** hash harian akurat tapi tidak bisa hitung retensi lintas-hari per-visitor — perlu strategi identity untuk funnel/retensi.
- **Redpanda opsional di awal?** Untuk MVP low-traffic bisa collector langsung batch-insert; Redpanda ditambahkan saat volume naik.
- **shadcn-svelte charting:** pilih library chart (LayerChart/unovis) yang serasi dengan Tailwind & tema.
- **Retensi & GDPR data request:** definisikan TTL dan alur delete-by-site.
