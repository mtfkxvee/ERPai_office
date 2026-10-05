"""Endpoint buat AI agent lapor apa yang sedang dia kerjain.

Prinsip: office ini CUMA konsumen event. Dia nggak pernah nyuruh agent ngapain,
cuma nampilin. Dan cuma nampilin signal nyata — nggak ada state yang dikarang,
karena begitu animasinya bohong, visualisasinya nggak bisa dipercaya lagi.
"""

import frappe
from frappe.utils import now_datetime

VALID_STATES = ("idle", "thinking", "working", "blocked", "error", "done")

# Jumlah meja yang ada di layout office (lihat frontend/src/layout.ts).
# Agent ke-9 dan seterusnya bakal share meja — office-nya nggak melebar sendiri.
DESK_COUNT = 8

# Kalau agent nggak lapor selama ini, dianggap idle. Biar karakter nggak
# keliatan "ngetik" terus padahal sesinya udah mati dari tadi.
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


@frappe.whitelist()
def report(agent: str, state: str, tool: str | None = None, detail: str | None = None, session_id: str | None = None):
	"""Dipanggil agent tiap kali state-nya berubah.

	Agent yang belum kedaftar otomatis dibikin dan dapet meja kosong, jadi
	nggak perlu setup manual sebelum agent baru bisa nongol di office.
	"""
	state = (state or "").strip().lower()
	if state not in VALID_STATES:
		frappe.throw(f"State '{state}' nggak dikenal. Yang valid: {', '.join(VALID_STATES)}")

	agent = (agent or "").strip()
	if not agent:
		frappe.throw("Nama agent wajib diisi")

	if not frappe.db.exists("AI Agent", agent):
		desk = _next_desk_index()
		doc = frappe.new_doc("AI Agent")
		doc.agent_name = agent
		doc.desk_index = desk
		doc.color = DEFAULT_COLORS[desk % len(DEFAULT_COLORS)]
		doc.enabled = 1
		doc.insert(ignore_permissions=True)

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

	# Denormalisasi state terakhir ke AI Agent, supaya load awal office
	# cukup satu query tanpa perlu nyari log terakhir per agent.
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

	return payload


@frappe.whitelist()
def get_state():
	"""Snapshot semua agent buat load awal office."""
	agents = frappe.get_all(
		"AI Agent",
		filters={"enabled": 1},
		fields=[
			"name as agent",
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

	now = now_datetime()
	for a in agents:
		if not a.state:
			a.state = "idle"
		elif a.last_seen and (now - a.last_seen).total_seconds() > STALE_SECONDS:
			a.state = "idle"
			a.tool = None
			a.stale = 1

	return {"agents": agents, "desk_count": DESK_COUNT}
