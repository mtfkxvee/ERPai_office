# AI Office

Visualisasi 3D buat AI agent, jalan sebagai app Frappe/ERPNext v15. Agent lapor
apa yang sedang dia kerjain lewat satu endpoint, lalu muncul sebagai karakter di
kantor virtual — duduk ngetik di mejanya, berdiri di whiteboard waktu mikir, atau
nyangkut di zona merah waktu ketahan.

Dibuka di `/app/ai-office`.

## Prinsip

**Office ini cuma konsumen event.** Dia nggak pernah nyuruh agent ngapain, cuma
nampilin. Dan dia cuma nampilin signal nyata — nggak ada state yang dikarang.
Kalau agent diem, karakternya diem. Kalau nggak ada laporan masuk selama 5 menit,
state-nya turun ke `idle` otomatis, bukan pura-pura masih ngetik.

Mode demo (event disimulasi) cuma nyala kalau `window.frappe` nggak ada, yaitu
waktu `npm run dev`. Di dalam ERPNext itu nggak mungkin aktif.

## Install

```bash
bench get-app https://github.com/mtfkxvee/ERPai_office.git
bench --site <site> install-app xsha_office
bench --site <site> clear-cache
bench restart
```

`install-app` bikin dua tabel baru (`tabAI Agent`, `tabAI Agent Activity`) dan
jalanin migrate, jadi backup dulu kalau ini site produksi:

```bash
bench --site <site> backup --with-files
```

Nggak perlu `bench build --app xsha_office` — bundle 3D-nya udah ikut ke repo
(lihat bagian Build di bawah soal kenapa).

## Cara agent lapor

```bash
curl -X POST https://<site>/api/method/xsha_office.api.report \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{"agent":"claude-code","state":"working","tool":"Edit","detail":"api.py"}'
```

Agent yang belum kedaftar otomatis dibikin dan dapet meja kosong — nggak perlu
setup manual dulu.

Baris `AI Agent Activity` cuma ditulis kalau pasangan (state, tool) berubah,
atau kalau dikirim `log=1`. State terakhir dan event realtime tetep dikirim tiap
kali. Ini biar tabelnya nggak meledak gara-gara laporan berulang yang isinya
sama.

### State yang valid

| State      | Karakternya ngapain                       |
| ---------- | ----------------------------------------- |
| `working`  | duduk di meja, animasi ngetik             |
| `thinking` | berdiri di whiteboard                     |
| `idle`     | lihat tabel di bawah                      |
| `blocked`  | di matras merah, tangan ke atas           |
| `error`    | sama, tapi gemetar                        |
| `done`     | duduk, tangan ngangkat; luruh ke idle 6 s |

Warna layar monitor di mejanya ikut state ini juga.

### Agent nganggur: dibedain dari lamanya

`idle` dipecah jadi tiga tempat berdasarkan udah berapa lama nggak ada kabar.
Ini **bukan state tambahan** yang bisa dilaporin — dihitung di frontend dari
selisih waktu laporan terakhir, jadi kontrak API-nya nggak berubah.

| Lama nganggur | Tempat          | Yang kebaca                      |
| ------------- | --------------- | -------------------------------- |
| < 45 detik    | pantry          | jeda antar task, bentar lagi jalan |
| 45 s – 4 menit | lounge, main PS | beneran nggak ada kerjaan        |
| > 4 menit     | kasur, tidur    | sesinya kemungkinan udah mati    |

Gunanya praktis: sekali lihat ketahuan mana agent yang cuma nunggu dan mana yang
prosesnya udah almarhum, tanpa perlu buka log. TV di lounge cuma nyala kalau ada
yang beneran main.

Ambangnya ada di `frontend/src/store.ts` (`IDLE_PANTRY_MS`, `IDLE_LOUNGE_MS`),
sepasang sama `STALE_SECONDS` di `api.py`.

## Dua ruangan

Dipisah sekat dengan satu bukaan pintu di tengah. Karakter nggak bisa nembus
dinding — kalau pindah ruangan, `routeTo()` nyelipin titik mampir di pintu.

**Ruang kerja** (kiri, lantai karpet): 8 workstation dua monitor, whiteboard,
matras zona bug, rak dokumen, panel lampu putih.

**Ruang santai** (kanan, lantai parket): micro-kitchen, meja tinggi + bangku,
lounge PS dengan TV besar, 3 nap pod bersekat, sudut bean bag, meja ping pong,
phone booth kaca, sudut baca berisi rak buku dan kursi, lampu gantung hangat,
pot gantung, papan nama nyala.

Bedanya sengaja dibuat kebaca dari material lantai dan jenis lampu, bukan cuma
dari sekatnya.

## Verifikasi tanpa browser

```bash
cd frontend && npm run verify   # geometri pose (38 assert)
python tests/test_hook_map.py   # pemetaan hook (33 assert)
```

Dua-duanya jalan tanpa browser dan tanpa bench Frappe.

Bangun hierarki transform karakter pakai three.js headless, hitung posisi sendi
di world-space, lalu cocokin sama posisi perabot: apakah mukanya menghadap
monitor, tangannya di atas keyboard, kakinya masuk kolong meja, kepalanya
mendarat di bantal, rutenya lewat pintu.

Ini ada karena pernah ada bug di mana karakter "duduk kerja" sebenernya
menghadap menjauh dari monitor dan lengannya ngayun ke belakang. `tsc` lolos,
`vite build` lolos, dan dari kamera orbit yang jauh itu kelihatan wajar.

Rig dan matematika pose-nya di `src/poses.ts`, diimpor BARENG oleh
`AgentChar.tsx` (buat render) dan `scripts/verify.ts` (buat tes) — jadi tesnya
nggak bisa hijau sambil render-nya salah. Jalanin ini tiap habis nyentuh pose,
arah hadap, atau tata letak.

### Hook Claude Code

Udah jadi, ada di [`hooks/`](hooks/) — baca [`hooks/README.md`](hooks/README.md)
buat cara pasangnya.

Endpoint `xsha_office.api.hook` nerima payload hook Claude Code apa adanya dan
memetakannya di server, jadi kalau pemetaannya diubah nanti, mesin klien nggak
perlu disentuh. Dua cara pasang: hook `command` + `async: true` (disarankan,
nggak nahan tool call) atau hook `http` langsung (tanpa install, tapi nahan tiap
tool call).

Pemetaannya pakai nama event asli dari dokumentasi Claude Code — `PermissionDenied`,
`PostToolUseFailure`, dan `StopFailure` itu event yang beneran ada, jadi "ketahan"
dan "error" nggak perlu ditebak-tebak.

## Arsitektur

```
hooks/                       jembatan Claude Code -> office
  office-report.mjs          penerus payload hook, nol dependency
  settings.command.json      contoh config (disarankan, async)
  settings.http.json         contoh config tanpa install skrip
tests/
  test_hook_map.py           tes pemetaan event->state, frappe dipalsukan

frontend/                    source Vite (React Three Fiber)
  src/layout.ts              bentuk dua ruangan, zona, rute lewat pintu
  src/poses.ts               rig karakter + matematika pose (fungsi murni)
  src/props.tsx              perabot ruang kerja
  src/relax.tsx              perabot ruang santai
  src/Office.tsx             lantai/dinding/sekat + perakitan dua ruangan
  src/AgentChar.tsx          karakter bersendi (lutut & siku) + animasi
  src/textures.ts            tekstur digenerate canvas, nol file asset
  src/erp.ts                 transport: socketio Frappe, atau demo
  src/store.ts               state agent + peluruhan stale + turunan pose
  src/main.tsx               expose window.XshaOffice.mount()
  scripts/verify.ts          tes geometri pose, jalan di Node tanpa browser

xsha_office/
  api.py                     report() + get_state()
  ai_office/doctype/          AI Agent, AI Agent Activity
  ai_office/page/ai_office/   Frappe Page, mount native via frappe.require
  public/office/office.js     hasil build Vite (ikut di-commit)
```

### Realtime

Pakai socketio bawaan Frappe (`frappe.publish_realtime` -> `frappe.realtime.on`).
Nggak ada WebSocket server sendiri, beda dari proyek-proyek sejenis yang harus
bangun servernya masing-masing.

### Build

Yang nge-bundle **Vite, bukan esbuild bawaan Frappe**. Esbuild Frappe nggak
resolve `node_modules` level-app dengan andal, dan three.js itu dependency gede —
kalau dipaksa lewat sana, `bench build` jadi lambat dan rawan error resolve buat
*semua* app di bench yang sama. Jadi Vite nge-bundle jadi satu file IIFE
self-contained (React + three.js + R3F di dalam), Frappe cuma nyajiin file
statisnya, dan Frappe Page-nya mount native ke `page.main` — tanpa iframe.

Konsekuensinya: hasil build ikut di-commit, dan tiap ubah frontend harus rebuild.

```bash
cd frontend
npm install
npm run dev       # localhost, mode demo
npm run verify    # tes geometri pose (butuh Node >= 22)
npm run build     # output ke ../xsha_office/public/office/office.js
```

Nol fetch keluar: tekstur digenerate canvas waktu runtime, label pakai DOM bukan
teks 3D, jadi nggak ada font atau asset yang perlu di-load.

## Lisensi

MIT
