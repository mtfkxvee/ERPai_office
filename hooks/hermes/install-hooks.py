"""Pasang blok `hooks:` ke config.yaml tiap profile Hermes.

Dijalankan DI DALAM container sebagai user hermes (UID 10000), jadi nggak perlu
sudo sama sekali:

    docker exec -i -u 10000 hermes python3 - < install-hooks.py

Kenapa pakai skrip, bukan edit manual: ada 4 file, dan tiap file butuh nama
profile-nya sendiri disisipkan ke 8 baris command. Salah ketik satu nama nggak
bikin error apa pun — agent-nya cuma muncul sebagai karakter yang salah, dan
itu baru ketahuan belakangan.

Aman diulang: profile yang sudah punya `hooks:` dilewati, nggak ditimpa.
Backup ditulis ke config.yaml.bak-office sebelum menyentuh apa pun.

Mode periksa saja, tanpa menulis:

    docker exec -i -u 10000 hermes python3 - --dry-run < install-hooks.py
"""

import sys
from pathlib import Path

PROFILES = ["accounting", "marketing", "data-analyst", "admin-deputygm"]
ROOT = Path("/opt/data/profiles")
SCRIPT = "/opt/data/office-report.sh"

# Event yang dipetakan di server (xsha_office/api.py). Nama event di sini HARUS
# sama persis dengan key di atasnya — Hermes nggak mengirim nama event di
# payload, jadi ini satu-satunya sumbernya.
EVENTS = [
	"on_session_start",
	"pre_llm_call",
	"pre_tool_call",
	"post_tool_call",
	"pre_approval_request",
	"api_request_error",
	"on_session_end",
	"on_session_finalize",
]


def block_for(profile: str) -> str:
	lines = [
		"",
		"# --- AI Office: lapor aktivitas ke /app/ai-office ---",
		"# Dipasang oleh hooks/hermes/install-hooks.py.",
		"# Argumen: <nama_event> <nama_agent>. Keduanya WAJIB — payload Hermes",
		"# nggak menyebut nama event maupun nama profile.",
		"hooks:",
	]
	for ev in EVENTS:
		lines += [
			f"  {ev}:",
			'    - matcher: "*"',
			f"      command: {SCRIPT} {ev} hermes/{profile}",
			"      timeout: 6",
		]
	lines += [
		"",
		"# Wajib: tanpa ini hook baru nunggu persetujuan lewat prompt TTY, dan run",
		"# lewat gateway/cron nggak punya TTY — hook-nya nggak akan pernah jalan,",
		"# tanpa pesan error apa pun.",
		"hooks_auto_accept: true",
		"",
	]
	return "\n".join(lines)


def main() -> int:
	dry = "--dry-run" in sys.argv
	problems = 0

	for profile in PROFILES:
		path = ROOT / profile / "config.yaml"
		label = f"{profile:18}"

		if not path.exists():
			print(f"  LEWAT  {label} config.yaml tidak ada")
			problems += 1
			continue

		text = path.read_text(encoding="utf-8")

		# Cek key top-level `hooks:` (bukan yang nested / dalam komentar)
		already = any(
			line.rstrip() in ("hooks:", "hooks_auto_accept: true")
			or line.startswith("hooks:")
			for line in text.splitlines()
		)
		if already:
			print(f"  LEWAT  {label} sudah punya blok hooks, tidak ditimpa")
			continue

		new_text = text
		if not new_text.endswith("\n"):
			# Tanpa ini, baris pertama blok nyambung ke baris terakhir file —
			# jebakan yang sama dengan apps.txt di bench ERPNext.
			new_text += "\n"
		new_text += block_for(profile)

		# Validasi hasilnya masih YAML yang sah SEBELUM ditulis
		try:
			import yaml

			parsed = yaml.safe_load(new_text)
			if not isinstance(parsed, dict) or "hooks" not in parsed:
				print(f"  GAGAL  {label} hasil parse tidak punya key hooks")
				problems += 1
				continue
			n = len(parsed["hooks"])
		except ImportError:
			print(f"  !      {label} pyyaml tidak ada, validasi dilewati")
			n = len(EVENTS)
		except Exception as e:
			print(f"  GAGAL  {label} YAML jadi tidak sah: {e}")
			problems += 1
			continue

		if dry:
			print(f"  (uji)  {label} akan ditambah {n} event -> hermes/{profile}")
			continue

		(path.parent / "config.yaml.bak-office").write_text(text, encoding="utf-8")
		path.write_text(new_text, encoding="utf-8")
		print(f"  OK     {label} {n} event -> hermes/{profile}")

	print()
	if dry:
		print("Mode uji — tidak ada yang ditulis.")
	else:
		print("Selesai. Backup tiap profile: config.yaml.bak-office")
		print("Verifikasi: docker exec hermes hermes -p accounting hooks list")
	return 1 if problems else 0


if __name__ == "__main__":
	sys.exit(main())
