# Prompt: agent menyebutkan namanya sendiri ke AI Office

Tempel ke agent Hermes mana pun yang sudah tersambung ke office tapi masih
tampil dengan id-nya (`hermes/accounting`, `hermes/vm-5-default`, dst).

Ganti dua nilai sebelum menempel:

| Placeholder | Isi dengan |
| --- | --- |
| `GANTI_TOKEN` | token user `ai-office@x-sha.id` (`api_key:api_secret`) |
| `GANTI_ID_AGENT` | id agent persis seperti yang tampil di office |

Id agent harus persis. Kalau salah, yang terjadi bukan error melainkan agent
baru yang kosong — dan yang lama tetap tanpa nama.

---

## Isi prompt (salin mulai dari sini)

Tugasmu: tentukan namamu sendiri, lalu daftarkan ke AI Office milik X-SHA
supaya karaktermu di sana tampil dengan nama itu, bukan dengan id teknismu.

### 1. Cari namamu

Periksa, berurutan, dan berhenti di yang pertama ketemu:

1. **Memorimu sendiri** — `$HERMES_HOME/profiles/<profil>/memories/MEMORY.md`.
   Kalau kamu pernah diberi nama, biasanya tersimpan di sana dalam bentuk
   seperti `go by the name 'X'` atau `your name is X`.
2. **`SOUL.md`** — baris judul pertama (`# X`), kalau ada.
3. **Kalau dua-duanya kosong**: jangan mengarang. Tanya pemakaimu mau kamu
   dipanggil siapa, lalu pakai jawabannya. Kalau dia tidak menjawab, berhenti
   di sini dan laporkan bahwa kamu belum punya nama — jangan memilih sendiri.

**JANGAN mengambil nama dari `memories/USER.md`.** Isinya identitas manusia
yang mengobrol denganmu, bukan namamu. Halaman office terbuka untuk semua
pemegang akses ERPNext di perusahaan, jadi nama orang asli tidak boleh menjadi
label karakter di sana.

Nama yang baik: satu atau dua kata, tanpa gelar, tanpa emoji, maksimal 40
karakter. Contoh: `SunTzu`, `Nadia`, `Pak Budi`.

### 2. Daftarkan

```
curl -s -X POST "https://erp.x-sha.id/api/method/xsha_office.api.set_name" \
  -H "Authorization: token GANTI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent":"GANTI_ID_AGENT","name":"<namamu>","role":"<peranmu, opsional>"}'
```

`role` opsional — isi kalau kamu punya fungsi yang jelas (`Accounting`,
`Strategi`, `Analis Data`). Kosongkan kalau tidak yakin.

Endpoint ini **tidak** mengubah status aktivitasmu. Memanggilnya tidak akan
membuatmu terlihat sedang bekerja.

### 3. Pastikan benar-benar tersimpan

```
curl -s -H "Authorization: token GANTI_TOKEN" \
  "https://erp.x-sha.id/api/method/xsha_office.api.get_state"
```

Cari entri dengan `agent` = id-mu, dan pastikan `display_name` sudah berisi
namamu. **Jangan menyatakan berhasil sebelum membaca balik hasil ini.** Respons
dari langkah 2 cuma berarti permintaannya diterima.

### Laporkan balik

1. Nama yang kamu pakai, dan dari mana kamu mendapatkannya (memory, SOUL.md,
   atau ditanyakan ke pemakai)
2. Id agent yang kamu daftarkan
3. Isi `display_name` yang kamu baca balik di langkah 3
4. Kalau kamu tidak menemukan nama dan tidak mendapat jawaban: katakan itu apa
   adanya, jangan mengarang nama supaya langkahnya terlihat selesai

### Jangan

- Jangan memakai nama dari `memories/USER.md`
- Jangan mengarang nama kalau tidak ada sumbernya dan tidak ada yang menjawab
- Jangan mengubah hal lain di office selain namamu sendiri
- Jangan menyimpulkan berhasil tanpa langkah 3
