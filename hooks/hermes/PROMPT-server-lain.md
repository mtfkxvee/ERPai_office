# Prompt: sambungkan Hermes di server lain ke AI Office

Tempel isi blok di bawah ke agent Hermes di server tujuan. Sebelum menempel,
ganti dua nilai ini:

| Placeholder | Isi dengan |
| --- | --- |
| `GANTI_TOKEN` | token user `ai-office@x-sha.id` (format `api_key:api_secret`) |
| `GANTI_NAMA_SERVER` | nama pendek server itu, huruf kecil tanpa spasi — misal `vps-jkt`, `nuc-kantor` |

Nama server WAJIB diganti dan WAJIB unik. Nama agent di office dibentuk dari
`hermes/<server>-<profile>`; kalau dua server pakai nama yang sama, karakternya
tumpuk jadi satu dan riwayatnya tercampur.

Jangan pakai API key Administrator. Token `ai-office@x-sha.id` sengaja dibatasi
cuma ke dua doctype visualisasi — kalau bocor dari server lain, yang bocor cuma
kemampuan bikin karakter.

---

## Isi prompt (salin mulai dari sini)

Tugasmu: sambungkan instance Hermes di server ini ke AI Office milik X-SHA,
supaya aktivitas tiap profile kelihatan sebagai karakter di `/app/ai-office`.

Kerjakan sendiri sampai selesai, lalu laporkan hasilnya apa adanya. Kalau ada
langkah yang gagal, laporkan gagalnya — jangan dilewati diam-diam dan jangan
disimpulkan berhasil tanpa bukti.

### Yang perlu kamu tau sebelum mulai

Tiga hal ini sudah pernah bikin integrasi yang sama gagal tanpa pesan error:

1. **Kirim nama event dan nama agent lewat HTTP header, bukan query string.**
   Server tujuan memakai Frappe, dan Frappe mengganti isi `form_dict` dengan
   body JSON. Artinya `?event=...&agent=...` hilang total begitu request bawa
   body — dan hook selalu bawa body. Tidak ada error, request tetap balas 200,
   tapi laporannya ditelan. Gunakan `X-Office-Event` dan `X-Office-Agent`.
2. **Payload hook Hermes tidak menyebut nama event maupun nama profile.** Nama
   event implisit dari hook mana yang menembak. Keduanya harus kamu tulis
   manual sebagai argumen command di `config.yaml`. Salah ketik nama profile
   tidak memunculkan error apa pun — karakternya cuma muncul dengan nama yang
   keliru.
3. **`hooks_auto_accept: true` wajib.** Hook baru meminta persetujuan lewat
   prompt TTY. Run lewat gateway atau cron tidak punya TTY, jadi tanpa flag ini
   hook tidak akan pernah jalan dan tidak ada pesan apa pun.

### Langkah

**1. Petakan dulu instalasi Hermes di server ini.** Jangan berasumsi sama
dengan server lain. Cari tau:

- Hermes jalan di Docker atau native? (`docker ps`, atau `which hermes`)
- Di mana `HERMES_HOME`-nya? Umumnya `/opt/data` di dalam container, atau
  `~/.hermes` kalau native.
- Profile apa saja yang ada? (`ls $HERMES_HOME/profiles/`)
- User mana yang memiliki folder itu? Di Docker biasanya UID 10000.
- Apakah `curl` tersedia, dan apakah server ini bisa menjangkau
  `https://erp.x-sha.id`? Uji dengan satu permintaan nyata, jangan diasumsikan.

Laporkan temuanmu sebelum lanjut kalau ada yang berbeda dari dugaan di atas.

**2. Simpan token.** Di dalam `HERMES_HOME`, mode 600, dimiliki user yang
menjalankan Hermes:

```
GANTI_TOKEN
```

Simpan sebagai `$HERMES_HOME/.office-token`. Jangan menaruhnya di `config.yaml`
— isi config terbaca oleh `hermes hooks list` dan ikut tersalin kalau config
dicopy.

**3. Buat `$HERMES_HOME/office-report.sh`, mode 700, milik user Hermes:**

```sh
#!/bin/sh
# Penerus hook Hermes -> AI Office.
# $1 = nama event, $2 = nama agent. Keduanya wajib: payload Hermes tidak
# menyebut keduanya.
EVENT="$1"
AGENT="$2"
URL="https://erp.x-sha.id/api/method/xsha_office.api.hook"
TOKEN_FILE="$(dirname "$0")/.office-token"

DEBUG_FLAG="$(dirname "$0")/.office-debug"
LOG="$(dirname "$0")/office-report.log"
log() { [ -f "$DEBUG_FLAG" ] && echo "$(date -Iseconds) $*" >> "$LOG" 2>/dev/null; return 0; }

log "mulai event='$EVENT' agent='$AGENT'"
[ -n "$EVENT" ] || { log "berhenti: event kosong"; exit 0; }
[ -r "$TOKEN_FILE" ] || { log "berhenti: token tidak terbaca"; exit 0; }
TOKEN=$(head -n1 "$TOKEN_FILE" | tr -d '\r\n')
[ -n "$TOKEN" ] || { log "berhenti: token kosong"; exit 0; }

curl -s -o /dev/null -m 5 -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: token $TOKEN" \
  -H "X-Office-Event: $EVENT" \
  -H "X-Office-Agent: $AGENT" \
  --data-binary @- "$URL" 2>/dev/null

exit 0
```

Dua sifat skrip ini disengaja, jangan diubah: **selalu `exit 0`** dan **tidak
pernah menulis ke stdout**. Agent tidak boleh berhenti bekerja gara-gara
visualisasi, dan stdout hook bisa memengaruhi alur Hermes.

**4. Uji jalurnya SEBELUM menyentuh `config.yaml` satu pun.** Jalankan sebagai
user Hermes:

```
echo '{"session_id":"tes","tool_name":"terminal","args":{"command":"echo halo"}}' | $HERMES_HOME/office-report.sh pre_tool_call hermes/GANTI_NAMA_SERVER-tes
```

Tidak ada output = normal, skrip ini memang bisu. Verifikasi dengan membaca
balik:

```
curl -s -H "Authorization: token GANTI_TOKEN" \
  "https://erp.x-sha.id/api/method/xsha_office.api.get_state"
```

Harus muncul agent `hermes/GANTI_NAMA_SERVER-tes` dengan `state: working`.
**Jangan lanjut kalau ini belum berhasil.** Kalau gagal, nyalakan mode log
(`touch $HERMES_HOME/.office-debug`), ulangi, lalu baca
`$HERMES_HOME/office-report.log`.

**5. Tambahkan blok hooks ke `config.yaml` tiap profile.** Untuk setiap profile
di `$HERMES_HOME/profiles/`, tambahkan di tingkat paling atas. Ganti
`NAMA_PROFILE` dengan nama folder profile itu:

```yaml
hooks:
  on_session_start:
    - matcher: "*"
      command: /PATH/office-report.sh on_session_start hermes/GANTI_NAMA_SERVER-NAMA_PROFILE
      timeout: 6
  pre_llm_call:
    - matcher: "*"
      command: /PATH/office-report.sh pre_llm_call hermes/GANTI_NAMA_SERVER-NAMA_PROFILE
      timeout: 6
  pre_tool_call:
    - matcher: "*"
      command: /PATH/office-report.sh pre_tool_call hermes/GANTI_NAMA_SERVER-NAMA_PROFILE
      timeout: 6
  post_tool_call:
    - matcher: "*"
      command: /PATH/office-report.sh post_tool_call hermes/GANTI_NAMA_SERVER-NAMA_PROFILE
      timeout: 6
  pre_approval_request:
    - matcher: "*"
      command: /PATH/office-report.sh pre_approval_request hermes/GANTI_NAMA_SERVER-NAMA_PROFILE
      timeout: 6
  api_request_error:
    - matcher: "*"
      command: /PATH/office-report.sh api_request_error hermes/GANTI_NAMA_SERVER-NAMA_PROFILE
      timeout: 6
  on_session_end:
    - matcher: "*"
      command: /PATH/office-report.sh on_session_end hermes/GANTI_NAMA_SERVER-NAMA_PROFILE
      timeout: 6
  on_session_finalize:
    - matcher: "*"
      command: /PATH/office-report.sh on_session_finalize hermes/GANTI_NAMA_SERVER-NAMA_PROFILE
      timeout: 6

hooks_auto_accept: true
```

Sebelum menulis: **backup tiap `config.yaml`**, dan pastikan file lama diakhiri
newline — kalau tidak, baris pertama blok akan menyambung ke baris terakhir
file dan merusak key yang ada di situ. Sesudah menulis, pastikan file masih
YAML yang sah (`python3 -c "import yaml,sys;yaml.safe_load(open(sys.argv[1]))" <file>`).
Kalau jadi tidak sah, kembalikan dari backup.

**6. Verifikasi.** Untuk tiap profile:

```
hermes -p <profile> hooks list
hermes -p <profile> hooks doctor
```

Harus terlihat 8 hook per profile, semuanya bertanda allowed.

### Laporkan balik

1. Hermes di server ini: Docker atau native, `HERMES_HOME`-nya di mana
2. Daftar profile yang ditemukan dan nama agent yang kamu pakai untuk
   masing-masing
3. Hasil uji langkah 4 — berhasil atau tidak, dan kalau tidak, isi lognya
4. Hasil `hooks list` per profile: berapa hook, semuanya allowed atau tidak
5. Apa pun yang kamu lewati atau yang tidak sesuai dugaan

Laporkan apa adanya. Integrasi ini gagal dengan sunyi kalau ada yang salah —
tidak ada error, tidak ada jejak — jadi laporan yang terlalu optimistis lebih
berbahaya daripada laporan gagal.

### Jangan

- Jangan mengubah bagian `config.yaml` selain menambahkan dua key di atas
- Jangan memakai API key selain yang diberikan
- Jangan membuat skripnya menulis ke stdout atau keluar dengan kode selain 0
- Jangan menyimpulkan berhasil tanpa membaca balik `get_state`
