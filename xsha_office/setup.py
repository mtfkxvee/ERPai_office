"""Setup sekali-jalan: user ERPNext khusus buat agent yang lapor ke office.

Kenapa ada: token yang dipakai agent buat lapor itu nyimpen di tempat yang
nggak sepenuhnya aman — di laptop (hook Claude Code), atau di dalam container
Hermes yang justru sengaja dikurung supaya nggak bisa nyentuh ERP. Kalau token
itu bocor, yang bocor sebaiknya cuma kemampuan "bikin karakter di office",
bukan akses ke data transaksi 25 outlet.

Jadi: user sendiri, role sendiri, cuma boleh nyentuh dua doctype visualisasi.

Jalanin:
    bench --site <site> execute xsha_office.setup.create_reporter_user

Aman diulang. Sekali jalan nggak bikin dobel. API secret cuma bisa dibaca
sekali waktu dibuat (Frappe nyimpennya terenkripsi), jadi catat baik-baik.
Kalau hilang, jalanin ulang dengan:

    bench --site <site> execute xsha_office.setup.create_reporter_user \\
        --kwargs "{'regenerate': 1}"
"""

import frappe
from frappe.permissions import add_permission, update_permission_property

ROLE = "AI Office Reporter"
EMAIL = "ai-office@x-sha.id"
FULL_NAME = "AI Office Reporter"

# Dua doctype ini saja. Tidak lebih.
PERMS = {
	# agent perlu baca (cek sudah terdaftar) + bikin + update state terakhir
	"AI Agent": {"read": 1, "create": 1, "write": 1},
	# log cuma ditambah, tidak pernah diubah atau dihapus oleh agent
	"AI Agent Activity": {"read": 1, "create": 1},
}


def _ensure_role() -> bool:
	if frappe.db.exists("Role", ROLE):
		return False
	frappe.get_doc(
		{
			"doctype": "Role",
			"role_name": ROLE,
			"desk_access": 0,
			"is_custom": 1,
		}
	).insert(ignore_permissions=True)
	return True


def _ensure_perms() -> list[str]:
	touched = []
	for doctype, flags in PERMS.items():
		if not frappe.db.exists("DocType", doctype):
			frappe.throw(f"DocType '{doctype}' belum ada — app-nya sudah ke-install?")
		# add_permission bikin baris permission dengan read=1 kalau belum ada
		add_permission(doctype, ROLE, 0)
		for prop, value in flags.items():
			update_permission_property(doctype, ROLE, 0, prop, value)
		touched.append(doctype)
	return touched


def _ensure_user() -> bool:
	if frappe.db.exists("User", EMAIL):
		return False
	user = frappe.new_doc("User")
	user.email = EMAIL
	user.first_name = FULL_NAME
	user.enabled = 1
	user.send_welcome_email = 0
	# user_type sengaja TIDAK diset.
	#
	# Frappe menentukannya sendiri dari role: kalau nggak ada satu pun role
	# dengan desk_access=1, user-nya jadi "Website User". Karena ROLE di atas
	# dibuat desk_access=0, user ini otomatis jadi Website User — dan itu
	# memang yang diinginkan: dia nggak bisa buka Desk sama sekali.
	#
	# Diuji 7 Okt 2026: Website User TETAP bisa baca/tulis doctype lewat REST
	# API selama permission role-nya mengizinkan. Jadi jangan "perbaiki" ini
	# dengan memaksa System User — itu justru melonggarkan, dan Frappe akan
	# menurunkannya lagi selama role-nya tanpa desk access.
	user.insert(ignore_permissions=True)
	return True


def _reset_roles() -> list[str]:
	"""Buang role bawaan apa pun, sisakan satu.

	Frappe suka nempelin role default ke System User baru. Dibiarkan, user ini
	bisa lebih banyak dari yang kita niatkan — dan itu justru yang mau dihindari.
	"""
	user = frappe.get_doc("User", EMAIL)
	user.set("roles", [])
	user.append("roles", {"role": ROLE})
	user.save(ignore_permissions=True)
	return [r.role for r in user.roles]


@frappe.whitelist()
def create_reporter_user(regenerate: int | str = 0):
	"""Bikin role + permission + user + API key. Aman diulang."""
	regenerate = str(regenerate) in ("1", "true", "True")

	role_created = _ensure_role()
	doctypes = _ensure_perms()
	user_created = _ensure_user()
	roles = _reset_roles()

	user = frappe.get_doc("User", EMAIL)
	api_secret = None
	if user_created or regenerate or not user.api_key:
		if not user.api_key or regenerate:
			user.api_key = frappe.generate_hash(length=15)
		api_secret = frappe.generate_hash(length=15)
		user.api_secret = api_secret
		user.save(ignore_permissions=True)

	frappe.db.commit()

	out = {
		"role": ROLE,
		"role_dibuat": role_created,
		"user": EMAIL,
		"user_dibuat": user_created,
		"role_terpasang": roles,
		"doctype_diizinkan": doctypes,
		"api_key": user.api_key,
	}
	if api_secret:
		out["api_secret"] = api_secret
		out["token"] = f"{user.api_key}:{api_secret}"
		out["_catatan"] = (
			"Simpan 'token' sekarang juga — api_secret disimpan terenkripsi dan "
			"nggak bisa dibaca lagi. Hilang? jalanin ulang dengan regenerate=1."
		)
	else:
		out["_catatan"] = (
			"User sudah punya API key dari sebelumnya; secret-nya nggak bisa "
			"dibaca ulang. Butuh yang baru? jalanin dengan regenerate=1."
		)
	return out


# Agent yang didaftarkan supaya SELALU kelihatan di office, walau belum pernah
# lapor sekali pun. Ini bukan state karangan: profile-nya memang ada, dan yang
# ditampilkan justru keadaan sebenarnya — nganggur, lalu ketiduran.
#
# Isinya HANYA yang sudah benar-benar ada di server ini. Jangan menaruh agent
# yang belum dipasang cuma karena rencananya mau ada: agent apa pun otomatis
# terdaftar sendiri pada laporan pertamanya (lihat _ensure_agent di api.py),
# jadi mendaftarkan di muka cuma bikin karakter kosong yang nggak akan pernah
# bangun. `claude-code` sempat ada di sini dan jadi contohnya.
DEFAULT_AGENTS = [
	{"agent": "hermes/accounting", "role": "Accounting"},
	{"agent": "hermes/marketing", "role": "Marketing"},
	{"agent": "hermes/data-analyst", "role": "Data Analyst"},
	{"agent": "hermes/admin-deputygm", "role": "Admin Deputy GM"},
]


@frappe.whitelist()
def register_agents(agents: str | list | None = None):
	"""Daftarkan agent supaya muncul di office tanpa harus lapor dulu.

	Tanpa ini, agent cuma nongol setelah hook pertamanya bunyi — jadi profile
	yang lagi nganggur nggak kelihatan sama sekali.

	`last_seen` sengaja DIBIARKAN kosong. Office bakal menampilkan mereka
	sebagai nggak-ada-kabar-sejak-lama, yaitu tidur di nap pod. Itu memang
	keadaan yang sebenarnya; begitu hook pertamanya bunyi, mereka bangun.

	Aman diulang. Agent yang sudah ada nggak disentuh (desk, warna, dan state
	terakhirnya tetap).

	    bench --site <site> execute xsha_office.setup.register_agents
	"""
	from xsha_office.api import _ensure_agent

	if agents is None:
		rows = DEFAULT_AGENTS
	elif isinstance(agents, str):
		rows = [{"agent": a.strip()} for a in agents.split(",") if a.strip()]
	else:
		rows = [a if isinstance(a, dict) else {"agent": str(a)} for a in agents]

	dibuat, sudah_ada = [], []
	for row in rows:
		name = str(row.get("agent", "")).strip()
		if not name:
			continue
		if frappe.db.exists("AI Agent", name):
			sudah_ada.append(name)
			continue
		_ensure_agent(name)
		if row.get("role"):
			frappe.db.set_value("AI Agent", name, "role", row["role"], update_modified=False)
		dibuat.append(name)

	frappe.db.commit()
	return {
		"dibuat": dibuat,
		"sudah_ada": sudah_ada,
		"_catatan": (
			"Agent baru belum pernah lapor, jadi di office mereka tidur di nap pod. "
			"Begitu hook pertamanya bunyi, mereka bangun dan jalan ke mejanya."
		),
	}


@frappe.whitelist()
def check_reporter_user():
	"""Read-only: lihat user ini bisa apa saja. Buat verifikasi sesudah setup."""
	if not frappe.db.exists("User", EMAIL):
		return {"ada": False}

	user = frappe.get_doc("User", EMAIL)
	perms = frappe.get_all(
		"Custom DocPerm",
		filters={"role": ROLE},
		fields=["parent", "read", "write", "create", "delete", "submit", "report", "export"],
	)
	return {
		"ada": True,
		"enabled": user.enabled,
		"user_type": user.user_type,
		"roles": [r.role for r in user.roles],
		"punya_api_key": bool(user.api_key),
		"izin": perms,
	}
