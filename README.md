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

### State yang valid

| State      | Karakternya ngapain                       |
| ---------- | ----------------------------------------- |
| `working`  | duduk di meja, animasi ngetik             |
| `thinking` | berdiri di whiteboard                     |
| `idle`     | berdiri di pantry, megang cangkir         |
| `blocked`  | di matras merah, tangan ke atas           |
| `error`    | sama, tapi gemetar                        |
| `done`     | duduk, tangan ngangkat; luruh ke idle 6 s |

Warna layar monitor di mejanya ikut state ini juga.

### Hook Claude Code

Pola yang dipakai proyek sejenis (`agent-virtual-office`, `pixel-agents`,
`claude-ville`): map lifecycle hook ke state.

| Hook               | State      |
| ------------------ | ---------- |
| `UserPromptSubmit` | `thinking` |
| `PreToolUse`       | `working`  |
| `Stop`             | `idle`     |
| `PermissionDenied` | `blocked`  |

## Arsitektur

```
frontend/                    source Vite (React Three Fiber)
  src/layout.ts              bentuk ruangan + mapping state -> posisi
  src/props.tsx              perabot: meja, monitor, kursi, pantry, rak
  src/Office.tsx             lantai/dinding/kaca + perakitan ruangan
  src/AgentChar.tsx          karakter bersendi (lutut & siku) + animasi
  src/textures.ts            tekstur digenerate canvas, nol file asset
  src/erp.ts                 transport: socketio Frappe, atau demo
  src/store.ts               state agent + peluruhan stale
  src/main.tsx               expose window.XshaOffice.mount()

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
npm run dev      # localhost, mode demo
npm run build    # output ke ../xsha_office/public/office/office.js
```

Nol fetch keluar: tekstur digenerate canvas waktu runtime, label pakai DOM bukan
teks 3D, jadi nggak ada font atau asset yang perlu di-load.

## Lisensi

MIT
