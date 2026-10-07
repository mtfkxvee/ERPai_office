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

# Mode log opsional. Skrip ini sengaja bisu, dan itu bikin kegagalannya nggak
# bisa dilacak sama sekali — sudah kejadian sekali. Bikin file penandanya:
#     docker exec -u 10000 hermes touch /opt/data/.office-debug
# lalu baca /opt/data/office-report.log. Hapus penandanya buat mematikan lagi.
DEBUG_FLAG="/opt/data/.office-debug"
LOG="/opt/data/office-report.log"
log() { [ -f "$DEBUG_FLAG" ] && echo "$(date -Iseconds) $*" >> "$LOG" 2>/dev/null; return 0; }

log "mulai event='$EVENT' agent='$AGENT' argc=$#"

[ -n "$EVENT" ] || { log "berhenti: nama event kosong"; exit 0; }
[ -r "$TOKEN_FILE" ] || { log "berhenti: token tidak terbaca"; exit 0; }

TOKEN=$(head -n1 "$TOKEN_FILE" | tr -d '\r\n')
[ -n "$TOKEN" ] || { log "berhenti: token kosong"; exit 0; }

# Nama event & agent dikirim lewat HEADER, bukan query string.
#
# Query string HILANG kalau request bawa body JSON — Frappe mengganti form_dict
# dengan isi body, jadi ?event=...&agent=... lenyap tanpa pesan error apa pun.
# Ini pernah kejadian dan bikin laporan ditelan diam-diam. Header selamat.
#
# --data-binary @- : teruskan stdin apa adanya tanpa diutak-atik shell.
if [ -f "$DEBUG_FLAG" ]; then
  BODY=$(cat)
  log "body(${#BODY} byte): $(echo "$BODY" | head -c 300)"
  RESP=$(printf '%s' "$BODY" | curl -s -m 5 -w '\n[http %{http_code}]' \
    -X POST \
    -H 'Content-Type: application/json' \
    -H "Authorization: token $TOKEN" \
    -H "X-Office-Event: $EVENT" \
    -H "X-Office-Agent: $AGENT" \
    --data-binary @- \
    "$URL" 2>&1)
  log "respons: $(echo "$RESP" | head -c 400)"
else
  curl -s -o /dev/null -m 5 \
    -X POST \
    -H 'Content-Type: application/json' \
    -H "Authorization: token $TOKEN" \
    -H "X-Office-Event: $EVENT" \
    -H "X-Office-Agent: $AGENT" \
    --data-binary @- \
    "$URL" 2>/dev/null
fi

exit 0
