"""Dokter agent: mendiagnosis kesehatan agent lain dari jejak aktivitasnya.

Kenapa ini ada di ERPNext dan bukan di dalam agent-nya: agent yang sakit nggak
bisa melaporkan dirinya sendiri sakit. Agent yang mati sama sekali nggak akan
teriak. Jadi pengamatnya harus di luar, dan datanya harus sudah terkumpul
sebelum masalahnya terjadi.

Datanya kebetulan sudah ada: tiap perubahan state agent tercatat di
`AI Agent Activity` sejak AI Office dipasang, termasuk `error` dan `blocked`.
Modul ini membacanya dan menerjemahkannya jadi penilaian.

Yang SENGAJA tidak dilakukan: menebak. Kalau sebuah gejala nggak bisa
dibuktikan dari data, dia nggak dilaporkan. Dokter yang mengarang diagnosis
lebih berbahaya daripada nggak ada dokter.
"""

import frappe
from frappe.utils import now_datetime

# --------------------------------------------------------------------------
# Ambang penilaian.
#
# Angka-angka ini pilihan, bukan kebenaran. Ditaruh di satu tempat supaya bisa
# disetel setelah kelihatan polanya di lapangan.
# --------------------------------------------------------------------------

# Berapa error dalam jendela pengamatan sebelum dianggap sakit, bukan sekadar
# tersandung sekali.
ERROR_SAKIT = 3

# `working`/`thinking` tapi nggak ada kabar selama ini = macet di tengah jalan.
# Satu panggilan tool yang sehat hampir nggak pernah selama ini.
MACET_DETIK = 15 * 60

# Pernah aktif, lalu hilang selama ini = patut dicurigai mati.
DIAM_DETIK = 48 * 3600

# Ada kabar dalam rentang ini = jelas masih hidup.
SEGAR_DETIK = 6 * 3600

STATUS_URUT = ["sakit", "macet", "diam", "ketahan", "perhatian", "sehat", "belum pernah"]


def _nilai(
	idle_detik: int | None,
	state: str | None,
	error_count: int,
	blocked_count: int,
	laporan_count: int,
	pernah_aktif: bool,
) -> tuple[str, list[str]]:
	"""Terjemahkan angka jadi status + daftar gejala.

	Fungsi murni: nggak menyentuh database, jadi bisa diuji langsung. Ini inti
	penilaiannya — sisanya cuma mengambil angka.
	"""
	gejala: list[str] = []

	if not pernah_aktif:
		return "belum pernah", [
			"Terdaftar tapi belum pernah mengirim satu laporan pun. "
			"Biasanya karena belum punya pintu masuk (gateway/token) atau memang belum dipakai."
		]

	# Macet: mengaku sedang bekerja tapi sudah lama nggak bersuara. Ini mode
	# gagal yang paling senyap — dari luar dia kelihatan sibuk.
	if state in ("working", "thinking") and idle_detik is not None and idle_detik > MACET_DETIK:
		gejala.append(
			f"Status terakhir '{state}' tapi sudah {_lama(idle_detik)} tidak ada kabar. "
			"Kemungkinan prosesnya mati di tengah pekerjaan."
		)
		return "macet", gejala

	if idle_detik is None or idle_detik > DIAM_DETIK:
		gejala.append(
			f"Pernah aktif tapi sudah {_lama(idle_detik) if idle_detik else 'sangat lama'} "
			"tidak ada kabar sama sekali."
		)
		return "diam", gejala

	if error_count >= ERROR_SAKIT:
		gejala.append(f"{error_count} error dalam jendela pengamatan.")
		return "sakit", gejala

	if blocked_count > 0 and state == "blocked":
		gejala.append("Sedang berhenti menunggu izin atau persetujuan manusia.")
		return "ketahan", gejala

	if error_count > 0:
		gejala.append(f"{error_count} error, masih di bawah ambang tapi perlu dilihat.")
		return "perhatian", gejala

	if blocked_count > 0:
		gejala.append(f"{blocked_count} kali sempat tertahan, sekarang sudah jalan lagi.")
		return "perhatian", gejala

	if idle_detik is not None and idle_detik > SEGAR_DETIK:
		gejala.append(f"Tidak ada kabar {_lama(idle_detik)}, tapi masih dalam batas wajar.")

	if laporan_count == 0:
		gejala.append("Tidak ada aktivitas dalam jendela pengamatan.")

	return "sehat", gejala


def _lama(detik: int | None) -> str:
	"""Durasi dalam bahasa manusia."""
	if detik is None:
		return "entah berapa lama"
	if detik < 60:
		return f"{detik} detik"
	if detik < 3600:
		return f"{detik // 60} menit"
	if detik < 86400:
		return f"{detik // 3600} jam"
	return f"{detik // 86400} hari"


def _ambil_angka(jam: int):
	"""Kumpulkan angka mentah per agent. Satu tempat yang menyentuh database."""
	skrg = now_datetime()

	agents = frappe.get_all(
		"AI Agent",
		filters={"enabled": 1},
		fields=["name", "display_name", "role", "current_state", "current_tool", "current_detail"],
		order_by="name asc",
	)

	# `last_seen` dibaca lewat SQL langsung, BUKAN get_all: Frappe membuang
	# field itu tanpa pesan apa pun (lihat catatan di api.py). Pembandingnya
	# now_datetime(), bukan NOW() milik MySQL — beda timezone 7 jam.
	idle = {
		r[0]: max(0, int(r[1])) if r[1] is not None else None
		for r in frappe.db.sql(
			"SELECT name, TIMESTAMPDIFF(SECOND, last_seen, %s) "
			"FROM `tabAI Agent` WHERE last_seen IS NOT NULL",
			(skrg,),
		)
	}

	# Ringkasan aktivitas di dalam jendela pengamatan.
	jendela = frappe.db.sql(
		"""
		SELECT agent,
		       COUNT(*),
		       SUM(state = 'error'),
		       SUM(state = 'blocked')
		FROM `tabAI Agent Activity`
		WHERE creation >= DATE_SUB(%s, INTERVAL %s HOUR)
		GROUP BY agent
		""",
		(skrg, jam),
	)
	ringkas = {r[0]: {"total": int(r[1]), "error": int(r[2] or 0), "blocked": int(r[3] or 0)} for r in jendela}

	# Pernah aktif sama sekali? (sepanjang sejarah, bukan cuma jendela)
	pernah = {
		r[0] for r in frappe.db.sql("SELECT DISTINCT agent FROM `tabAI Agent Activity`")
	}

	return agents, idle, ringkas, pernah, skrg


@frappe.whitelist()
def health(jam: int | str = 24):
	"""Rapor kesehatan semua agent.

	    bench --site <site> execute xsha_office.doctor.health
	    GET /api/method/xsha_office.doctor.health?jam=24
	"""
	jam = int(jam)
	agents, idle, ringkas, pernah, skrg = _ambil_angka(jam)

	hasil = []
	for a in agents:
		r = ringkas.get(a.name, {"total": 0, "error": 0, "blocked": 0})
		status, gejala = _nilai(
			idle_detik=idle.get(a.name),
			state=a.current_state,
			error_count=r["error"],
			blocked_count=r["blocked"],
			laporan_count=r["total"],
			pernah_aktif=a.name in pernah,
		)
		hasil.append(
			{
				"agent": a.name,
				"nama": a.display_name or a.name,
				"peran": a.role,
				"status": status,
				"gejala": gejala,
				"state_terakhir": a.current_state,
				"diam_selama": _lama(idle.get(a.name)),
				"diam_detik": idle.get(a.name),
				"laporan": r["total"],
				"error": r["error"],
				"blocked": r["blocked"],
			}
		)

	hasil.sort(key=lambda h: (STATUS_URUT.index(h["status"]), h["agent"]))

	jumlah: dict[str, int] = {}
	for h in hasil:
		jumlah[h["status"]] = jumlah.get(h["status"], 0) + 1

	perlu = [h for h in hasil if h["status"] in ("sakit", "macet", "diam", "ketahan")]

	return {
		"waktu": str(skrg),
		"jendela_jam": jam,
		"ringkasan": jumlah,
		"perlu_perhatian": len(perlu),
		"agent": hasil,
	}


@frappe.whitelist()
def diagnose(agent: str, jam: int | str = 72):
	"""Rincian satu agent: rapornya plus error terakhir apa adanya.

	Dipakai dokter setelah health() menunjukkan ada yang bermasalah.
	"""
	jam = int(jam)
	if not frappe.db.exists("AI Agent", agent):
		frappe.throw(f"Agent '{agent}' tidak terdaftar")

	rapor = next((h for h in health(jam)["agent"] if h["agent"] == agent), None)

	riwayat = frappe.get_all(
		"AI Agent Activity",
		filters={"agent": agent},
		fields=["state", "tool", "detail", "creation"],
		order_by="creation desc",
		limit_page_length=40,
	)
	masalah = [r for r in riwayat if r.state in ("error", "blocked")][:10]

	return {
		"rapor": rapor,
		"masalah_terakhir": masalah,
		"riwayat_terakhir": riwayat[:20],
	}
