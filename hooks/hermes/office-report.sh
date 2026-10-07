#!/bin/sh
# Penerus hook Hermes Agent -> AI Office.
#
# Dipanggil dari blok `hooks:` di config.yaml tiap profile. Payload hook masuk
# lewat stdin; skrip ini cuma nerusin apa adanya ke endpoint ERPNext. Pemetaan
# event -> state dikerjain di server (xsha_office/api.py), sama seperti jalur
# Claude Code, jadi file ini nggak perlu diurus lagi kalau pemetaannya berubah.
#
# Dua hal yang HARUS dikirim lewat argumen, karena payload Hermes nggak punya
# keduanya:
#   $1 = nama event   (pre_tool_call, on_session_end, dst)
#   $2 = nama agent   (hermes/accounting, hermes/marketing, dst)
#
# Aturan yang dipegang:
#   - Selalu exit 0. Agent nggak boleh berhenti kerja gara-gara hiasan.
#   - Nggak nulis ke stdout. Hook Hermes bisa memengaruhi alur lewat stdout,
#     jadi diem adalah satu-satunya pilihan aman.
#   - Timeout pendek. Kalau ERP lambat, lebih baik laporannya hilang daripada
#     agent-nya ketahan.
#
# Kredensial dibaca dari /opt/data/.office-token (mode 600), BUKAN dari
# config.yaml — supaya nggak ikut kebaca `hermes hooks list` dan nggak ikut
# ter-commit kalau config.yaml disalin ke mana-mana.
#
# Isi /opt/data/.office-token cukup satu baris:  api_key:api_secret

EVENT="$1"
AGENT="$2"
URL="https://erp.x-sha.id/api/method/xsha_office.api.hook"
TOKEN_FILE="/opt/data/.office-token"

[ -n "$EVENT" ] || exit 0
[ -r "$TOKEN_FILE" ] || exit 0

TOKEN=$(head -n1 "$TOKEN_FILE" | tr -d '\r\n')
[ -n "$TOKEN" ] || exit 0

# --data-binary @- : teruskan stdin apa adanya tanpa diutak-atik shell.
curl -s -o /dev/null -m 5 \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: token $TOKEN" \
  --data-binary @- \
  "$URL?event=$EVENT&agent=$AGENT" 2>/dev/null

exit 0
