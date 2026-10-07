# Hermes Agent -> AI Office

Bikin tiap profile Hermes muncul sebagai karakter sendiri di `/app/ai-office`.

Pemetaan event dikerjain di server (`xsha_office/api.py`), sama seperti jalur
Claude Code. Yang dipasang di sisi Hermes cuma penerus tipis.

## Dua hal yang bikin Hermes beda dari Claude Code

Ini ditemukan dengan membaca `VALID_HOOKS` dan `_DEFAULT_PAYLOADS` di dalam
image-nya, bukan dari dokumentasi luar:

1. **Payload Hermes nggak nyebut nama event.** Event-nya implisit dari hook mana
   yang nembak. Jadi nama event dikirim lewat query string `?event=`.
2. **Payload Hermes nggak nyebut profile.** Tanpa penanganan, keempat profile
   numpuk jadi satu karakter. Jadi nama agent dikirim lewat `?agent=`.

Dua-duanya ditulis manual di `config.yaml` tiap profile. Konsekuensinya: kalau
salah ketik nama profile, agent-nya nyasar ke karakter yang salah — bukan error
yang kelihatan, jadi periksa dua kali.

## Peta event

| Hook Hermes | State | Karakternya |
| --- | --- | --- |
| `on_session_start` | `idle` | muncul di pantry |
| `pre_llm_call` | `thinking` | ke whiteboard, label = baris pertama pesan user |
| `pre_tool_call` / `post_tool_call` | `working` | duduk ngetik, label = perintah / nama file |
| `pre_approval_request` | `blocked` | matras merah, "nunggu persetujuan: terminal" |
| `api_request_error` | `error` | matras merah, gemetar |
| `on_session_end` | `done`, atau `error` kalau `failed`/`interrupted` | tangan ngangkat / matras merah |
| `on_session_finalize`, `on_session_reset`, `agent_loop_stopped` | `idle` | ke pantry, lalu luruh ke lounge/kasur |
| `subagent_start`, `subagent_stop`, `post_approval_response` | `working` | |

Event lain dari 41 yang ada diabaikan dengan tenang.

## Pasang

Semua langkah di bawah dijalankan **di server**. `~/.hermes` dimiliki UID 10000
(user `hermes` di container) dengan mode 700, jadi butuh `sudo` dari host.

**1. Simpan kredensial** — di luar `config.yaml`, supaya nggak ikut kebaca
`hermes hooks list` dan nggak ikut tersalin kalau config dicopy:

```bash
sudo sh -c 'echo "API_KEY:API_SECRET" > /home/lthv/.hermes/.office-token'
sudo chown 10000:10000 /home/lthv/.hermes/.office-token
sudo chmod 600 /home/lthv/.hermes/.office-token
```

**2. Pasang skrip penerus:**

```bash
sudo cp ~/frappe-bench/apps/xsha_office/hooks/hermes/office-report.sh \
        /home/lthv/.hermes/office-report.sh
sudo chown 10000:10000 /home/lthv/.hermes/office-report.sh
sudo chmod 700 /home/lthv/.hermes/office-report.sh
```

**3. Tes sebelum dipasang ke config** — payload palsu, ngetes jalur sampai ERP:

```bash
echo '{"session_id":"tes","tool_name":"terminal","args":{"command":"echo halo"}}' \
  | docker exec -i -u 10000 hermes /opt/data/office-report.sh pre_tool_call hermes/tes
```

Nggak ada output = benar (skrip ini sengaja bisu). Cek hasilnya di
`/app/ai-office` — harus muncul agent `hermes/tes` yang lagi kerja.

Kalau nggak muncul, jalankan manual dengan curl verbose dari dalam container
buat lihat responsnya.

**4. Tambahkan blok hooks ke tiap profile.** Isi `config.snippet.yaml`
ditempel ke `/home/lthv/.hermes/profiles/<nama>/config.yaml`, dengan
`hermes/accounting` **diganti sesuai nama profile-nya**:

```bash
sudo -e /home/lthv/.hermes/profiles/accounting/config.yaml
```

Ulangi untuk `marketing`, `data-analyst`, `admin-deputygm`.

**5. Verifikasi dari dalam Hermes:**

```bash
docker exec hermes hermes -p accounting hooks list
docker exec hermes hermes -p accounting hooks doctor
```

`doctor` ngecek exec bit, status allowlist, validitas JSON, dan waktu jalan
sintetisnya. Itu pengecekan yang lebih berguna daripada nebak.

## Yang perlu kamu tau

**`hooks_auto_accept: true` itu wajib, bukan opsional.** Hook baru minta
persetujuan sekali lewat prompt TTY. Run lewat gateway atau cron nggak punya
TTY, jadi tanpa flag ini hook-nya nggak akan pernah jalan dan nggak ada pesan
error apa pun. Setara dengan `--accept-hooks` atau `HERMES_ACCEPT_HOOKS=1`.

**Hook nambah latensi ke tiap tool call.** Timeout curl 5 detik, timeout hook 6
detik — disusun begitu supaya yang motong selalu curl, bukan Hermes. Dari
container ke ERP terukur ~1.1 detik lewat Cloudflare, jadi normalnya nggak
kerasa. Tapi kalau ERP lagi lambat, tiap tool call ikut nunggu. Hermes nggak
punya padanan `async: true` milik Claude Code.

**Skrip ini selalu exit 0 dan nggak pernah nulis ke stdout.** Agent nggak boleh
berhenti kerja gara-gara visualisasi, dan stdout hook bisa memengaruhi alur.
Konsekuensinya: salah konfigurasi = diam saja, makanya ada langkah 3.

**Kredensial yang dipakai punya akses tulis ke ERPNext.** Container Hermes
sengaja dikurung (`HERMES_WRITE_SAFE_ROOT=/opt/data`, docker socket nggak
di-mount) justru supaya agent nggak bisa nyentuh ERP. Menaruh token ERPNext di
dalamnya mengurangi pengurungan itu — agent punya tool `terminal` dan bisa baca
`/opt/data/.office-token`. Pakai user ERPNext khusus yang cuma boleh nulis ke
dua doctype ini, jangan key Administrator.
