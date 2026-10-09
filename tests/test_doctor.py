"""Tes penilaian kesehatan agent, tanpa bench Frappe.

Yang diuji adalah _nilai(): fungsi murni yang menerjemahkan angka jadi status.
Itu inti dokternya — sisanya cuma mengambil angka dari database.

Diagnosis yang salah lebih berbahaya daripada tidak ada diagnosis: agent mati
yang dilaporkan sehat membuat orang berhenti memeriksa.
"""

import sys
import types
from pathlib import Path

APP = Path(__file__).resolve().parent.parent

frappe = types.ModuleType("frappe")
frappe.whitelist = lambda *a, **k: (lambda f: f)
frappe.throw = lambda msg: (_ for _ in ()).throw(RuntimeError(msg))
frappe.utils = types.ModuleType("frappe.utils")
frappe.utils.now_datetime = lambda: None
sys.modules["frappe"] = frappe
sys.modules["frappe.utils"] = frappe.utils

sys.path.insert(0, str(APP))
from xsha_office import doctor  # noqa: E402

ok = 0
bad = 0


def check(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print(f"  ok   {name}")
    else:
        bad += 1
        print(f"  FAIL {name}\n       dapat : {got!r}\n       harap : {want!r}")


def nilai(**kw):
    dasar = dict(
        idle_detik=60,
        state="idle",
        error_count=0,
        blocked_count=0,
        laporan_count=5,
        pernah_aktif=True,
    )
    dasar.update(kw)
    return doctor._nilai(**dasar)[0]


print("\nstatus dasar")
check("baru lapor, tanpa masalah -> sehat", nilai(), "sehat")
check(
    "belum pernah lapor sama sekali",
    nilai(pernah_aktif=False, idle_detik=None, laporan_count=0),
    "belum pernah",
)

print("\nmacet: mengaku kerja tapi sudah lama diam")
# Ini mode gagal paling senyap — dari luar dia kelihatan sibuk.
check("working + diam 20 menit -> macet", nilai(state="working", idle_detik=20 * 60), "macet")
check("thinking + diam 20 menit -> macet", nilai(state="thinking", idle_detik=20 * 60), "macet")
check("working tapi baru 2 menit -> bukan macet", nilai(state="working", idle_detik=120), "sehat")
check(
    "idle + diam 20 menit -> BUKAN macet (idle memang diam)",
    nilai(state="idle", idle_detik=20 * 60),
    "sehat",
)

print("\ndiam: pernah hidup lalu hilang")
check("diam 3 hari -> diam", nilai(idle_detik=3 * 86400), "diam")
check("diam 47 jam -> belum diam", nilai(idle_detik=47 * 3600), "sehat")
check("diam 49 jam -> diam", nilai(idle_detik=49 * 3600), "diam")

print("\nerror")
check("3 error -> sakit", nilai(error_count=3), "sakit")
check("2 error -> perhatian, belum sakit", nilai(error_count=2), "perhatian")
check("1 error -> perhatian", nilai(error_count=1), "perhatian")
check("0 error -> sehat", nilai(error_count=0), "sehat")

print("\nketahan menunggu izin")
check("sedang blocked -> ketahan", nilai(state="blocked", blocked_count=1), "ketahan")
check(
    "pernah blocked tapi sudah jalan lagi -> perhatian",
    nilai(state="working", blocked_count=2, idle_detik=60),
    "perhatian",
)

print("\nurutan kegawatan: yang parah menang")
check("macet mengalahkan error", nilai(state="working", idle_detik=3600, error_count=5), "macet")
check("diam mengalahkan error", nilai(idle_detik=5 * 86400, error_count=5), "diam")
check("sakit mengalahkan ketahan", nilai(state="blocked", error_count=4, blocked_count=1), "sakit")

print("\ngejala harus dijelaskan, bukan cuma status")
for kasus, kw in [
    ("macet", dict(state="working", idle_detik=20 * 60)),
    ("diam", dict(idle_detik=5 * 86400)),
    ("sakit", dict(error_count=4)),
    ("belum pernah", dict(pernah_aktif=False, idle_detik=None)),
]:
    dasar = dict(idle_detik=60, state="idle", error_count=0, blocked_count=0, laporan_count=5, pernah_aktif=True)
    dasar.update(kw)
    status, gejala = doctor._nilai(**dasar)
    check(f"{kasus}: ada penjelasannya", len(gejala) > 0 and len(gejala[0]) > 20, True)

print("\ndurasi dalam bahasa manusia")
check("30 detik", doctor._lama(30), "30 detik")
check("5 menit", doctor._lama(300), "5 menit")
check("2 jam", doctor._lama(7200), "2 jam")
check("3 hari", doctor._lama(3 * 86400), "3 hari")
check("tidak diketahui", doctor._lama(None), "entah berapa lama")

print("\nsemua status yang mungkin ada di daftar urutan")
semua = set()
for st in ["working", "thinking", "idle", "blocked"]:
    for e in [0, 1, 5]:
        for b in [0, 2]:
            for i in [None, 60, 20 * 60, 5 * 86400]:
                for p in [True, False]:
                    semua.add(doctor._nilai(i, st, e, b, 3, p)[0])
check("tidak ada status asing", sorted(semua - set(doctor.STATUS_URUT)), [])
check("semua status terpakai punya urutan", len(semua) > 4, True)

print(f"\n{ok} lolos, {bad} gagal")
sys.exit(1 if bad else 0)
