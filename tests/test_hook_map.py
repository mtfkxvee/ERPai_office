"""Tes pemetaan hook Claude Code -> state office, tanpa bench Frappe.

frappe dipalsukan secukupnya supaya api.py bisa diimpor dan fungsi-fungsi
pemetaannya (yang murni) bisa diuji.
"""

import json
import sys
import types
from pathlib import Path

APP = Path(__file__).resolve().parent.parent

# --- frappe palsu -------------------------------------------------------
frappe = types.ModuleType("frappe")
frappe.parse_json = json.loads
frappe.get_request_header = lambda *a, **k: None
frappe.whitelist = lambda *a, **k: (lambda f: f)
frappe.throw = lambda msg: (_ for _ in ()).throw(RuntimeError(msg))
frappe.utils = types.ModuleType("frappe.utils")
frappe.utils.now_datetime = lambda: None
frappe.model = types.ModuleType("frappe.model")
frappe.model.document = types.ModuleType("frappe.model.document")
frappe.model.document.Document = object
sys.modules["frappe"] = frappe
sys.modules["frappe.utils"] = frappe.utils
sys.modules["frappe.model"] = frappe.model
sys.modules["frappe.model.document"] = frappe.model.document

sys.path.insert(0, str(APP))
from xsha_office import api  # noqa: E402

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


print("\nevent -> state")
for event, want in [
    ("SessionStart", "idle"),
    ("UserPromptSubmit", "thinking"),
    ("PreToolUse", "working"),
    ("PostToolUse", "working"),
    ("PostToolUseFailure", "error"),
    ("PermissionRequest", "blocked"),
    ("PermissionDenied", "blocked"),
    ("Stop", "done"),
    ("StopFailure", "error"),
    ("SessionEnd", "idle"),
]:
    check(event, api.EVENT_STATE.get(event), want)

print("\nsemua state hasil pemetaan itu state yang valid")
unknown = sorted(set(api.EVENT_STATE.values()) - set(api.VALID_STATES))
check("tidak ada state asing", unknown, [])

print("\nevent yang tidak dipetakan diabaikan, bukan bikin error")
for event in ["Notification", "PreCompact", "CwdChanged", "FileChanged", "TeammateIdle", ""]:
    r = api.hook(hook_event_name=event)
    check(f"{event or '(kosong)'} diabaikan", "ignored" in r, True)

print("\nketerangan label dari isi tool")
check(
    "Bash -> perintahnya",
    api._detail_from("PreToolUse", {"tool_name": "Bash", "tool_input": {"command": "npm test\nbaris kedua"}}),
    "npm test",
)
check(
    "Read -> nama file saja",
    api._detail_from("PreToolUse", {"tool_name": "Read", "tool_input": {"file_path": "/home/lthv/frappe-bench/apps/x/api.py"}}),
    "api.py",
)
check(
    "tool_input berupa string JSON juga kebaca",
    api._detail_from("PreToolUse", {"tool_name": "Read", "tool_input": '{"file_path": "/a/b/osi.js"}'}),
    "osi.js",
)
check(
    "Grep -> pola",
    api._detail_from("PreToolUse", {"tool_name": "Grep", "tool_input": {"pattern": "DROP TABLE"}}),
    "DROP TABLE",
)
check(
    "gagal -> baris pertama error",
    api._detail_from("PostToolUseFailure", {"tool_error": "ModuleNotFoundError: no 'frappe'\n  File x"}),
    "ModuleNotFoundError: no 'frappe'",
)
check(
    "gagal tanpa pesan -> tetap ada keterangan",
    api._detail_from("PostToolUseFailure", {}),
    "gagal",
)
check(
    "izin ditolak nyebut tool-nya",
    api._detail_from("PermissionDenied", {"tool_name": "Bash"}),
    "izin ditolak: Bash",
)
check(
    "nunggu izin nyebut tool-nya",
    api._detail_from("PermissionRequest", {"tool_name": "Write"}),
    "nunggu izin: Write",
)
check(
    "tool_input kosong -> tidak ada keterangan",
    api._detail_from("PreToolUse", {"tool_name": "Read"}),
    None,
)

print("\nnama agent")
check("param eksplisit menang", api._agent_name({"agent": "jarvis", "cwd": "/a/b"}), "jarvis")
check("tanpa param, pakai nama folder", api._agent_name({"cwd": "/home/lthv/frappe-bench"}), "cc/frappe-bench")
check("folder dengan slash di ujung", api._agent_name({"cwd": "/proj/pos_next/"}), "cc/pos_next")
check("path Windows", api._agent_name({"cwd": r"C:\Users\User\Downloads\TEST CLAUDE"}), "cc/TEST CLAUDE")
check("tanpa apa-apa -> default", api._agent_name({}), "claude-code")

print("\npemotongan keterangan panjang")
long = "x" * 500
d = api._detail_from("PostToolUseFailure", {"tool_error": long})
check("baris error panjang masih utuh di sini", len(d), 500)
check("batas potong terdefinisi", api.DETAIL_MAX, 140)

print(f"\n{ok} lolos, {bad} gagal")
sys.exit(1 if bad else 0)
