"""Endpoint buat AI agent lapor apa yang sedang dia kerjain.

Prinsip: office ini CUMA konsumen event. Dia nggak pernah nyuruh agent ngapain,
cuma nampilin. Dan cuma nampilin signal nyata — nggak ada state yang dikarang.
Kalau agent diem, karakternya diem.

Dua pintu masuk:
  report()  - dipanggil eksplisit, kontraknya kita sendiri yang tentuin
  hook()    - nerima payload hook Claude Code apa adanya, dipetakan di sini

Pemetaan event -> state sengaja ditaruh di server, bukan di skrip hook, supaya
cuma ada satu tempat yang perlu diurus walau nanti ada banyak mesin yang lapor.
"""

import os

import frappe
from frappe.utils import now_datetime

VALID_STATES = ("idle", "thinking", "working", "blocked", "error", "done")

# Jumlah meja yang ada di layout office (lihat frontend/src/layout.ts).
# Agent ke-9 dan seterusnya bakal share meja — office-nya nggak melebar sendiri.
DESK_COUNT = 8

# Kalau agent nggak lapor selama ini, dianggap idle. Biar karakter nggak
# keliatan "ngetik" terus padahal sesinya udah mati dari tadi.
# Sepasang sama STALE_MS di frontend/src/store.ts.
STALE_SECONDS = 300

DEFAULT_COLORS = (
	"#6ab04c",
	"#4834d4",
	"#eb4d4b",
	"#f0932b",
	"#22a6b3",
	"#be2edd",
	"#f9ca24",
	"#7f8fa6",
)

DETAIL_MAX = 140


def _next_desk_index() -> int:
	used = {
		d.desk_index
		for d in frappe.get_all("AI Agent", fields=["desk_index"])
		if d.desk_index is not None
	}
	for i in range(DESK_COUNT):
		if i not in used:
			return i
	return frappe.db.count("AI Agent") % DESK_COUNT


def _ensure_agent(agent: str) -> None:
	if frappe.db.exists("AI Agent", agent):
		return
	desk = _next_desk_index()
	doc = frappe.new_doc("AI Agent")
	doc.agent_name = agent
	doc.desk_index = desk
	doc.color = DEFAULT_COLORS[desk % len(DEFAULT_COLORS)]
	doc.enabled = 1
	doc.insert(ignore_permissions=True)


def _apply(
	agent: str,
	state: str,
	tool: str | None = None,
	detail: str | None = None,
	session_id: str | None = None,
	force_log: bool = False,
	display_name: str | None = None,
):
	"""Inti dari dua endpoint di bawah.

	Baris AI Agent Activity cuma ditulis kalau (state, tool) BERUBAH, atau kalau
	dipaksa. Alasannya praktis: PreToolUse nembak tiap kali ada tool call, dan
	kalau tiap tembakan bikin satu baris, tabelnya meledak tanpa nambah
	informasi. State terakhir tetep di-update dan realtime tetep dikirim tiap
	kali, jadi animasinya nggak ketinggalan.
	"""
	state = (state or "").strip().lower()
	if state not in VALID_STATES:
		frappe.throw(f"State '{state}' nggak dikenal. Yang valid: {', '.join(VALID_STATES)}")

	agent = (agent or "").strip()
	if not agent:
		frappe.throw("Nama agent wajib diisi")

	if detail and len(detail) > DETAIL_MAX:
		detail = detail[: DETAIL_MAX - 1] + "…"

	_ensure_agent(agent)

	# Nama tampilan datang dari SOUL.md agent (baris judul pertama), dikirim
	# lewat header. Cuma ditulis kalau berubah, biar nggak nulis tiap hook.
	if display_name:
		display_name = display_name.strip()[:140]
		if display_name != frappe.db.get_value("AI Agent", agent, "display_name"):
			frappe.db.set_value("AI Agent", agent, "display_name", display_name, update_modified=False)

	prev = frappe.db.get_value(
		"AI Agent", agent, ["current_state", "current_tool"], as_dict=True
	)
	changed = not prev or prev.current_state != state or (prev.current_tool or None) != (tool or None)

	if force_log or changed:
		frappe.get_doc(
			{
				"doctype": "AI Agent Activity",
				"agent": agent,
				"state": state,
				"tool": tool,
				"detail": detail,
				"session_id": session_id,
			}
		).insert(ignore_permissions=True)

	# Denormalisasi state terakhir ke AI Agent, supaya load awal office cukup
	# satu query tanpa perlu nyari log terakhir per agent.
	frappe.db.set_value(
		"AI Agent",
		agent,
		{
			"current_state": state,
			"current_tool": tool,
			"current_detail": detail,
			"last_seen": now_datetime(),
		},
		update_modified=False,
	)

	payload = {"agent": agent, "state": state, "tool": tool, "detail": detail}
	frappe.publish_realtime("ai_office_event", payload, after_commit=True)
	payload["logged"] = bool(force_log or changed)
	return payload


@frappe.whitelist()
def report(
	agent: str,
	state: str,
	tool: str | None = None,
	detail: str | None = None,
	session_id: str | None = None,
	log: str | int | None = None,
	display_name: str | None = None,
):
	"""Lapor state secara eksplisit.

	Agent yang belum kedaftar otomatis dibikin dan dapet meja kosong, jadi
	nggak perlu setup manual sebelum agent baru bisa nongol di office.
	"""
	return _apply(
		agent,
		state,
		tool,
		detail,
		session_id,
		force_log=str(log) in ("1", "true", "True"),
		display_name=display_name,
	)


# --------------------------------------------------------------------------
# Jembatan hook Claude Code
# --------------------------------------------------------------------------

# Nama event hook Claude Code -> state office. Diambil dari dokumentasi resmi,
# bukan dikira-kira: PermissionDenied, PostToolUseFailure, dan StopFailure itu
# event yang beneran ada, jadi "ketahan" dan "error" nggak perlu ditebak.
CLAUDE_CODE_EVENTS = {
	"SessionStart": "idle",
	"UserPromptSubmit": "thinking",
	"UserPromptExpansion": "thinking",
	"PreToolUse": "working",
	"PostToolUse": "working",
	"PostToolBatch": "working",
	"SubagentStart": "working",
	"SubagentStop": "working",
	"PostToolUseFailure": "error",
	"StopFailure": "error",
	"PermissionRequest": "blocked",
	"PermissionDenied": "blocked",
	"Stop": "done",
	"SessionEnd": "idle",
}

# Nama event hook Hermes Agent (Nous Research) -> state office. Diambil dari
# VALID_HOOKS dan _DEFAULT_PAYLOADS di dalam image-nya, bukan dari dokumentasi
# luar. `on_session_end` ditentukan belakangan karena bisa jadi done atau error
# tergantung flag di payload-nya.
HERMES_EVENTS = {
	"on_session_start": "idle",
	"pre_llm_call": "thinking",
	"post_llm_call": "working",
	"pre_tool_call": "working",
	"post_tool_call": "working",
	"subagent_start": "working",
	"subagent_stop": "working",
	"post_approval_response": "working",
	"pre_approval_request": "blocked",
	"api_request_error": "error",
	"on_session_end": "done",
	"on_session_finalize": "idle",
	"on_session_reset": "idle",
	"agent_loop_stopped": "idle",
}

# Dua-duanya digabung jadi satu peta: nama event Claude Code (CamelCase) dan
# Hermes (snake_case) nggak pernah bentrok, jadi satu endpoint cukup.
EVENT_STATE = {**CLAUDE_CODE_EVENTS, **HERMES_EVENTS}

# Event yang selalu ditulis ke log walau state-nya nggak berubah — ini
# kejadian yang pengen ketahuan riwayatnya.
ALWAYS_LOG = {
	"PostToolUseFailure",
	"StopFailure",
	"PermissionDenied",
	"SessionStart",
	"SessionEnd",
	"api_request_error",
	"pre_approval_request",
	"on_session_start",
	"on_session_end",
}


def _as_dict(value):
	"""tool_input bisa datang sebagai dict (body JSON) atau string (query param)."""
	if isinstance(value, dict):
		return value
	if isinstance(value, str) and value.strip().startswith("{"):
		try:
			return frappe.parse_json(value)
		except Exception:
			return {}
	return {}


def _short_path(p: str) -> str:
	return os.path.basename(p.rstrip("/\\")) or p


def _detail_from(event: str, payload: dict) -> str | None:
	"""Keterangan singkat yang kebaca manusia, buat label di office."""
	if event in ("PostToolUseFailure", "StopFailure"):
		err = payload.get("tool_error") or payload.get("tool_stderr") or ""
		return str(err).strip().splitlines()[0] if err else "gagal"

	if event in ("PermissionRequest", "PermissionDenied"):
		tool = payload.get("tool_name") or "tool"
		return f"nunggu izin: {tool}" if event == "PermissionRequest" else f"izin ditolak: {tool}"

	# --- khusus Hermes ---
	if event == "pre_approval_request":
		# Nama tool-nya bisa datang dengan beberapa nama kunci tergantung dari
		# mana persetujuan diminta. Dicoba berurutan daripada langsung menyerah
		# ke kata "tool" yang nggak memberi tahu apa-apa.
		for k in ("tool_name", "tool", "name", "command", "action"):
			if payload.get(k):
				return f"nunggu persetujuan: {str(payload[k])[:80]}"
		return "nunggu persetujuan"

	if event == "api_request_error":
		# Hermes mengirim `error` sebagai OBJEK, bukan teks:
		#     error={"type": ..., "message": ...}
		# plus status_code, reason, retryable, retry_count di tingkat atas.
		# Dulu di sini diperlakukan sebagai string dan selalu jatuh ke teks
		# cadangan "API error" — sinyalnya ada tapi isinya hilang, jadi
		# dokternya tahu ada masalah tapi nggak bisa bilang masalahnya apa.
		err = _as_dict(payload.get("error"))
		pesan = (
			err.get("message")
			or err.get("type")
			or payload.get("reason")
			or payload.get("error_type")
			or (payload.get("error") if isinstance(payload.get("error"), str) else None)
		)
		kode = payload.get("status_code")
		if pesan:
			teks = str(pesan).strip().splitlines()[0]
			return f"{kode}: {teks}" if kode else teks
		return f"API error {kode}" if kode else "API error"
	if event == "on_session_end":
		if payload.get("failed"):
			return "sesi gagal"
		if payload.get("interrupted"):
			return "sesi diputus"
		return str(payload.get("turn_exit_reason") or "").strip() or None
	if event == "pre_llm_call":
		msg = str(payload.get("user_message") or "").strip()
		return msg.splitlines()[0] if msg else None

	# Claude Code pakai `tool_input`, Hermes pakai `args` — bentuknya sama-sama
	# dict argumen tool, jadi dibaca dengan aturan yang sama.
	tool_input = _as_dict(payload.get("tool_input")) or _as_dict(payload.get("args"))
	if tool_input:
		if tool_input.get("command"):
			return str(tool_input["command"]).strip().splitlines()[0]
		for key in ("file_path", "path", "notebook_path"):
			if tool_input.get(key):
				return _short_path(str(tool_input[key]))
		if tool_input.get("pattern"):
			return str(tool_input["pattern"])
		if tool_input.get("url"):
			return str(tool_input["url"])

	if payload.get("agent_type"):
		return f"subagent: {payload['agent_type']}"
	if payload.get("child_status"):
		return f"subagent: {payload['child_status']}"
	return None


def _agent_name(payload: dict) -> str:
	"""Urutan: param/header eksplisit -> nama folder kerja -> default.

	Nama folder dipakai karena biasanya itu yang paling masuk akal: satu project
	satu agent, jadi di office kelihatan project mana yang sedang jalan.
	"""
	# Header didahulukan: query string HILANG kalau request-nya bawa body JSON
	# (Frappe mengganti form_dict dengan isi body), dan hook agent selalu bawa
	# body. Diuji 7 Okt 2026 — lihat catatan di hook().
	explicit = frappe.get_request_header("X-Office-Agent") or payload.get("agent")
	if explicit:
		return str(explicit).strip()[:120]

	cwd = payload.get("cwd")
	if cwd:
		return f"cc/{_short_path(str(cwd))}"[:120]

	return "claude-code"


@frappe.whitelist()
def hook(**payload):
	"""Nerima payload hook Claude Code apa adanya.

	Dipakai dua cara, dua-duanya ngarah ke sini:
	  1. hook `type: "command"` + skrip tipis yang nerusin stdin (disarankan,
	     karena bisa `async: true` jadi nggak nahan tool call)
	  2. hook `type: "http"` langsung ke endpoint ini (tanpa install apa-apa,
	     tapi nahan tiap tool call selama nunggu respons)

	Hermes Agent juga lewat sini. Bedanya: payload Hermes nggak nyebut nama
	event-nya sama sekali (event-nya implisit dari hook mana yang nembak) dan
	nggak nyebut profile-nya. Dua-duanya dikirim lewat HEADER:
	`X-Office-Event` dan `X-Office-Agent`.

	KENAPA HEADER, BUKAN QUERY STRING — ini pernah salah dan diam-diam nggak
	jalan. Kalau request bawa body JSON, Frappe MENGGANTI form_dict dengan isi
	body itu, jadi `?event=...&agent=...` hilang total tanpa pesan error apa
	pun. Hook agent selalu bawa body. Diukur 7 Okt 2026:
	    query string + body JSON  -> {"ignored": "(nama event tidak dikirim)"}
	    semuanya di dalam body    -> jalan
	    query string tanpa body   -> jalan
	Header dibaca lewat jalur yang beda dan selamat dari body JSON.

	Event yang nggak ada di peta diabaikan dengan tenang — Claude Code punya
	puluhan event dan Hermes 41, nggak semuanya ada artinya buat visualisasi.
	"""
	event = str(
		payload.get("hook_event_name")
		or frappe.get_request_header("X-Office-Event")
		or payload.get("event")
		or ""
	).strip()
	state = EVENT_STATE.get(event)
	if not state:
		return {"ignored": event or "(nama event tidak dikirim)"}

	# Satu-satunya event yang state-nya nggak bisa ditentukan dari namanya saja:
	# sesi Hermes yang berakhir bisa sukses, gagal, atau diputus.
	if event == "on_session_end" and (payload.get("failed") or payload.get("interrupted")):
		state = "error"

	return _apply(
		_agent_name(payload),
		state,
		tool=payload.get("tool_name"),
		detail=_detail_from(event, payload),
		session_id=payload.get("session_id"),
		force_log=event in ALWAYS_LOG,
		display_name=frappe.get_request_header("X-Office-Name") or payload.get("display_name"),
	)


# --------------------------------------------------------------------------


@frappe.whitelist()
def set_name(agent: str, name: str | None = None, role: str | None = None):
	"""Setel nama tampilan agent, tanpa menyentuh state aktivitasnya.

	Dipisah dari report() karena ini bukan laporan kerja: memanggilnya nggak
	boleh bikin agent kelihatan baru aktif. `last_seen` sengaja tidak diubah.

	Agent yang belum terdaftar dibikin sekalian, jadi satu panggilan ini cukup
	buat memperkenalkan diri:

	    curl -X POST https://erp.x-sha.id/api/method/xsha_office.api.set_name \\
	      -H "Authorization: token KEY:SECRET" \\
	      -H "Content-Type: application/json" \\
	      -d '{"agent":"hermes/vm-5-default","name":"SunTzu","role":"Strategi"}'

	Kirim `name` kosong buat menghapus nama (office balik memakai id agent).
	"""
	agent = (agent or "").strip()
	if not agent:
		frappe.throw("Nama agent wajib diisi")

	_ensure_agent(agent)

	nilai = (name or "").strip()[:140] or None
	frappe.db.set_value("AI Agent", agent, "display_name", nilai, update_modified=False)
	if role:
		frappe.db.set_value("AI Agent", agent, "role", str(role).strip()[:140], update_modified=False)
	frappe.db.commit()

	# Office yang sedang terbuka langsung ikut berubah tanpa perlu refresh.
	frappe.publish_realtime(
		"ai_office_rename", {"agent": agent, "display_name": nilai}, after_commit=True
	)
	return {"agent": agent, "display_name": nilai, "role": role}


@frappe.whitelist()
def get_state():
	"""Snapshot semua agent buat load awal office."""
	agents = frappe.get_all(
		"AI Agent",
		filters={"enabled": 1},
		fields=[
			"name as agent",
			"display_name",
			"role",
			"color",
			"desk_index",
			"current_state as state",
			"current_tool as tool",
			"current_detail as detail",
			"last_seen",
		],
		order_by="desk_index asc",
	)

	# Lama nggak ada kabar, dihitung LANGSUNG DI SQL.
	#
	# Kenapa nggak lewat get_all seperti field lain: `frappe.get_all` membuang
	# field `last_seen` tanpa pesan apa pun. Diukur 7 Okt 2026 di site ini —
	# kolomnya ada (`datetime(6)`), DocField-nya terdaftar di meta, SELECT
	# mentah mengembalikan nilainya, `modified` dan `creation` (sama-sama
	# Datetime) ikut terbawa, tapi `last_seen` hilang bahkan ketika dialias.
	# Akar masalahnya di dalam Frappe dan belum ketemu; query ini menghindarinya
	# sama sekali, jadi nggak bergantung pada sebabnya.
	#
	# Dikirim sebagai angka detik, bukan timestamp, supaya browser nggak perlu
	# menebak timezone. None = belum pernah lapor.
	# PENTING: pembandingnya HARUS waktu site, bukan NOW() milik MySQL.
	#
	# `last_seen` ditulis pakai now_datetime(), yang memakai timezone site
	# (Asia/Jakarta). NOW() mengembalikan waktu server OS (UTC di sini). Dulu
	# query ini memakai NOW() dan hasilnya negatif 7 jam, jadi "terakhir
	# terlihat" jatuh di masa depan — ambang 6 detik dan 5 menit nggak pernah
	# terlampaui dan karakternya macet di meja dengan status `kelar` selamanya.
	#
	# Nilai negatif tetap dijepit ke 0 sebagai jaring pengaman: kalau jam
	# server bergeser, efek paling buruknya cuma "baru saja terlihat", bukan
	# karakter yang membeku.
	skrg = now_datetime()
	idle = {
		r[0]: max(0, int(r[1])) if r[1] is not None else None
		for r in frappe.db.sql(
			"""
			SELECT name, TIMESTAMPDIFF(SECOND, last_seen, %s)
			FROM `tabAI Agent`
			WHERE last_seen IS NOT NULL
			""",
			(skrg,),
		)
	}

	for a in agents:
		a.idle_for = idle.get(a.agent)

		if not a.state:
			a.state = "idle"
		elif a.idle_for is not None and a.idle_for > STALE_SECONDS:
			a.state = "idle"
			a.tool = None
			a.stale = 1

	return {"agents": agents, "desk_count": DESK_COUNT}
