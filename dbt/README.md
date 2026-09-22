# Gravlytics dbt Transformations

Proyek dbt ini digunakan untuk melakukan transformasi data dan agregasi rollup berkala pada ClickHouse.

## Struktur Model

- `models/staging/stg_events.sql` — View pembersihan data mentah dari tabel `events`.
- `models/marts/daily_site_stats.sql` — Tabel rollup metrik harian (pageviews, pengunjung unik, sessions, bounce rate).
- `models/marts/daily_dimension_stats.sql` — Tabel rollup breakdown harian (country, browser, device, os, url_path).

---

## Cara Menjalankan

### Opsi 1: Menjalankan Langsung dengan Python (Lokal)

1. **Install dbt ClickHouse adapter**:
   ```bash
   pip install dbt-clickhouse
   # atau jika menggunakan uv:
   uv pip install dbt-clickhouse
   ```

2. **Cek koneksi ke ClickHouse**:
   ```bash
   cd dbt
   dbt debug --profiles-dir .
   ```

3. **Jalankan transformasi (Rollups)**:
   ```bash
   dbt run --profiles-dir .
   ```

4. **Jalankan hanya model tertentu**:
   ```bash
   # Hanya mart harian
   dbt run --select marts.daily_site_stats --profiles-dir .
   ```

---

### Opsi 2: Menjalankan via Podman (Tanpa Perlu Install Python)

Jika tidak ingin menginstal Python/dbt di komputer lokal:

```bash
cd dbt
podman run --rm -it \
  --network host \
  -v $(pwd):/usr/app:z \
  -w /usr/app \
  ghcr.io/dbt-labs/dbt-clickhouse:latest \
  run --profiles-dir .
```
