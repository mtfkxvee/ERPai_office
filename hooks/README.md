# Hook Claude Code -> AI Office

Bikin sesi Claude Code kamu muncul sebagai karakter di `/app/ai-office`:
duduk ngetik waktu manggil tool, berdiri di whiteboard waktu mikir, nyangkut di
matras merah waktu izin ditolak, lalu pindah ke pantry — main PS — kasur sesuai
berapa lama nggak ada kabar.

Pemetaan event dikerjain di server (`xsha_office/api.py`), jadi kalau nanti
pemetaannya diubah, nggak perlu nyentuh mesin klien satu-satu.

## Pilih satu cara

| | `settings.command.json` | `settings.http.json` |
| --- | --- | --- |
| Perlu install | skrip Node per mesin | tidak ada |
| Nahan tool call | **tidak** (`async: true`) | **ya**, 200-400 ms tiap tool call |
| Kredensial | `~/.xsha-office.json` atau env | env var saja |

**Pakai yang `command`** kecuali kamu nggak bisa naruh file di mesinnya.
Hook `http` nggak bisa `async` — itu batasan Claude Code, bukan pilihan desain —
jadi setiap `Read`, `Edit`, dan `Bash` nunggu ERPNext jawab dulu.

## Pasang (cara command)

**1. Bikin API key di ERPNext**

User > API Access > Generate Keys. Catat `api_key` dan `api_secret`.

**2. Simpan kredensial**

```bash
cat > ~/.xsha-office.json <<'EOF'
{
  "url": "https://erp.x-sha.id",
  "token": "API_KEY:API_SECRET",
  "agent": "claude-code"
}
EOF
chmod 600 ~/.xsha-office.json
```

`agent` boleh dihapus — server bakal nebak dari nama folder kerja, jadi tiap
project muncul sebagai agent sendiri (`cc/nama-project`). Berguna kalau kamu
sering buka beberapa project sekaligus.

Jangan taruh token di `settings.json`. File itu gampang kelepasan ke repo.

**3. Salin skripnya**

```bash
cp hooks/office-report.mjs ~/.claude/office-report.mjs
```

**4. Cek dulu sebelum dipasang**

```bash
node ~/.claude/office-report.mjs --test
```

Harus keluar `OK`, dan di `/app/ai-office` muncul agent baru. Kalau gagal:

```bash
XSHA_OFFICE_DEBUG=1 node ~/.claude/office-report.mjs --test
```

**5. Pasang hook-nya**

Gabungkan blok `hooks` dari `settings.command.json` ke `~/.claude/settings.json`,
ganti `/ABSOLUTE/PATH/KE/office-report.mjs` jadi `~/.claude/office-report.mjs`
versi absolut (hook nggak nge-expand `~`).

Restart Claude Code. Jalankan apa pun, lihat office-nya.

## Peta event

| Hook Claude Code | State | Karakternya |
| --- | --- | --- |
| `SessionStart` | `idle` | muncul di pantry |
| `UserPromptSubmit` | `thinking` | ke whiteboard |
| `PreToolUse` / `PostToolUse` | `working` | duduk ngetik, nama tool di label |
| `PostToolUseFailure` | `error` | matras merah, gemetar |
| `PermissionRequest` | `blocked` | matras merah, tangan ke atas |
| `PermissionDenied` | `blocked` | sama, labelnya "izin ditolak" |
| `Stop` | `done` | tangan ngangkat, 6 detik lalu idle |
| `StopFailure` | `error` | matras merah |
| `SessionEnd` | `idle` | ke pantry, lalu luruh |

Event lain diabaikan dengan tenang. Claude Code punya puluhan event dan nggak
semuanya ada artinya buat visualisasi.

Label-nya diisi dari isi tool: `Bash` nampilin perintahnya, `Read`/`Edit`
nampilin nama file, `Grep` nampilin pola-nya.

## Yang perlu kamu tau

**Baris log nggak ditulis tiap tembakan.** `AI Agent Activity` cuma nambah baris
kalau pasangan (state, tool) berubah. `PreToolUse` nembak tiap tool call; kalau
tiap tembakan jadi satu baris, tabelnya meledak tanpa nambah informasi. State
terakhir dan realtime tetep dikirim tiap kali, jadi animasinya nggak ketinggalan.
Kegagalan, izin ditolak, dan buka/tutup sesi selalu dicatat.

**Tool yang jalan lebih dari 5 menit bikin karakternya ketiduran.** `last_seen`
cuma ke-update pas hook nembak, dan nggak ada hook yang bunyi di tengah-tengah
satu tool call. Jadi `Bash` yang jalan 6 menit bikin agent-nya dianggap basi lalu
pindah ke kasur, padahal masih kerja. Kalau ini ganggu, naikin `STALE_SECONDS`
di `api.py` bareng `STALE_MS` di `frontend/src/store.ts`.

**Hook ini nggak akan pernah bikin Claude Code berhenti.** Skripnya nggak nulis
ke stdout (JSON di stdout bisa MEMBLOKIR tool call) dan selalu exit 0. Office
mati, server mati, internet mati — kerjaanmu jalan terus. Konsekuensinya:
kalau salah konfigurasi, dia diam saja. Makanya ada `--test`.

**Siapa pun yang punya kredensial ERPNext bisa nulis aktivitas agent.** Endpoint
`hook()` dan `report()` nulis pakai `ignore_permissions`, cuma ke dua doctype
hiasan ini. Blast radius-nya kecil, tapi bukan nol: orang yang pegang token bisa
bikin agent palsu. Kalau mau lebih rapat, bikin user ERPNext khusus buat ini dan
pakai key-nya, jangan key akun yang bisa nyentuh data transaksi.
