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
# Cukup lengkap supaya _apply() ikut kejalan, bukan cuma fungsi pemetaannya.
# Semua tulisan ditampung di memori, nggak ada DB yang disentuh.
WRITES = {"agents": {}, "activity": []}


class _FakeDoc:
    def __init__(self, data=None):
        self.__dict__.update(data or {})

    def insert(self, *a, **k):
        if getattr(self, "doctype", None) == "AI Agent Activity":
            WRITES["activity"].append(dict(self.__dict__))
        else:
            WRITES["agents"][getattr(self, "agent_name", "?")] = dict(self.__dict__)
        return self


class _FakeDB:
    def exists(self, *a, **k):
        return False

    def get_value(self, *a, **k):
        return None

    def set_value(self, *a, **k):
        return None

    def count(self, *a, **k):
        return 0


frappe = types.ModuleType("frappe")
frappe.parse_json = json.loads
HEADERS: dict[str, str] = {}
frappe.get_request_header = lambda name, *a, **k: HEADERS.get(name)
frappe.whitelist = lambda *a, **k: (lambda f: f)
frappe.throw = lambda msg: (_ for _ in ()).throw(RuntimeError(msg))
frappe.db = _FakeDB()
frappe.new_doc = lambda dt: _FakeDoc({"doctype": dt})
frappe.get_doc = lambda d: _FakeDoc(d)
frappe.get_all = lambda *a, **k: []
frappe.publish_realtime = lambda *a, **k: None
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

print("\nHermes: event -> state")
for event, want in [
    ("on_session_start", "idle"),
    ("pre_llm_call", "thinking"),
    ("pre_tool_call", "working"),
    ("post_tool_call", "working"),
    ("pre_approval_request", "blocked"),
    ("api_request_error", "error"),
    ("on_session_end", "done"),
    ("on_session_finalize", "idle"),
    ("agent_loop_stopped", "idle"),
]:
    check(event, api.EVENT_STATE.get(event), want)

print("\nHermes: nama event Hermes & Claude Code tidak bentrok")
bentrok = sorted(set(api.CLAUDE_CODE_EVENTS) & set(api.HERMES_EVENTS))
check("tidak ada nama yang tabrakan", bentrok, [])
check(
    "peta gabungan memuat keduanya",
    len(api.EVENT_STATE),
    len(api.CLAUDE_CODE_EVENTS) + len(api.HERMES_EVENTS),
)

print("\nHermes: sesi berakhir - done vs error")
check("selesai normal -> done", api.hook(event="on_session_end", agent="x", completed=True)["state"], "done")
check("gagal -> error", api.hook(event="on_session_end", agent="x", failed=True)["state"], "error")
check("diputus -> error", api.hook(event="on_session_end", agent="x", interrupted=True)["state"], "error")

print("\nHermes: nama event lewat query string (payload Hermes tidak membawanya)")
check("param 'event' dipakai", api.hook(event="pre_tool_call", agent="x")["state"], "working")
check(
    "tanpa nama event -> diabaikan, bukan error",
    "ignored" in api.hook(agent="x", session_id="s1"),
    True,
)
check(
    "hook_event_name tetap menang kalau dua-duanya ada",
    api.hook(hook_event_name="Stop", event="pre_tool_call", agent="x")["state"],
    "done",
)

print("\nHermes: keterangan label dari payload-nya sendiri")
check(
    "args.command (Hermes) kebaca sama seperti tool_input (Claude Code)",
    api._detail_from("pre_tool_call", {"tool_name": "terminal", "args": {"command": "bench migrate\nbaris2"}}),
    "bench migrate",
)
check(
    "args.path -> nama file saja",
    api._detail_from("post_tool_call", {"tool_name": "write_file", "args": {"path": "/opt/data/notes/report.txt"}}),
    "report.txt",
)
check(
    "nunggu persetujuan nyebut tool-nya",
    api._detail_from("pre_approval_request", {"tool_name": "terminal"}),
    "nunggu persetujuan: terminal",
)
check(
    "pre_llm_call -> baris pertama pesan user",
    api._detail_from("pre_llm_call", {"user_message": "tolong cek stok\nbaris kedua"}),
    "tolong cek stok",
)
check("sesi gagal", api._detail_from("on_session_end", {"failed": True}), "sesi gagal")
check("sesi diputus", api._detail_from("on_session_end", {"interrupted": True}), "sesi diputus")
check(
    "sesi normal -> alasan keluarnya",
    api._detail_from("on_session_end", {"completed": True, "turn_exit_reason": "text_response(stop)"}),
    "text_response(stop)",
)
check(
    "subagent_stop -> status anaknya",
    api._detail_from("subagent_stop", {"child_status": "completed"}),
    "subagent: completed",
)

print("\nheader: event & agent HARUS bisa lewat header")
# Kenapa ini diuji: query string HILANG kalau request bawa body JSON (Frappe
# mengganti form_dict dengan isi body). Hook agent selalu bawa body, jadi dulu
# ?event=/?agent= ditelan diam-diam dan laporannya nggak pernah masuk.
HEADERS.clear()
HEADERS["X-Office-Event"] = "pre_tool_call"
HEADERS["X-Office-Agent"] = "hermes/accounting"
r = api.hook(session_id="s", tool_name="terminal", args={"command": "ls -la"})
check("event terbaca dari header", r.get("state"), "working")
check("agent terbaca dari header", r.get("agent"), "hermes/accounting")
check("detail tetap dari body", r.get("detail"), "ls -la")

HEADERS.clear()
HEADERS["X-Office-Agent"] = "hermes/marketing"
check(
    "header agent mengalahkan tebakan nama folder",
    api._agent_name({"cwd": "/home/lthv/frappe-bench"}),
    "hermes/marketing",
)

HEADERS.clear()
check(
    "tanpa header & tanpa event -> diabaikan, bukan error",
    "ignored" in api.hook(session_id="s", tool_name="terminal"),
    True,
)
check(
    "tanpa header agent, tebakan folder tetap jalan",
    api._agent_name({"cwd": "/proj/pos_next"}),
    "cc/pos_next",
)

print("\nbentuk payload asli Hermes buat error & persetujuan")
# Diambil dari titik pemanggilan hook DI DALAM image Hermes:
#   error={"type": ..., "message": ...}, status_code=..., reason=...
# `error` itu OBJEK, bukan teks. Dulu diperlakukan sebagai teks, jadi isinya
# hilang dan dokter cuma melihat "API error" tanpa tahu errornya apa — 42 kali
# tercatat di ALE, semuanya tanpa keterangan.
check(
    "api_request_error: pesan diambil dari objek error",
    api._detail_from(
        "api_request_error",
        {"error": {"type": "overloaded_error", "message": "Overloaded"}, "status_code": 529},
    ),
    "529: Overloaded",
)
check(
    "api_request_error: tanpa status_code",
    api._detail_from("api_request_error", {"error": {"message": "connection reset"}}),
    "connection reset",
)
check(
    "api_request_error: jatuh ke type kalau message kosong",
    api._detail_from("api_request_error", {"error": {"type": "rate_limit_error"}}),
    "rate_limit_error",
)
check(
    "api_request_error: jatuh ke reason",
    api._detail_from("api_request_error", {"reason": "timeout menunggu provider"}),
    "timeout menunggu provider",
)
check(
    "api_request_error: error berupa teks biasa tetap kebaca",
    api._detail_from("api_request_error", {"error": "boom"}),
    "boom",
)
check(
    "api_request_error: benar-benar kosong -> tetap ada keterangan",
    api._detail_from("api_request_error", {}),
    "API error",
)
check(
    "persetujuan: pakai tool_name kalau ada",
    api._detail_from("pre_approval_request", {"tool_name": "terminal"}),
    "nunggu persetujuan: terminal",
)
check(
    "persetujuan: coba kunci lain sebelum menyerah",
    api._detail_from("pre_approval_request", {"command": "rm -rf /tmp/x"}),
    "nunggu persetujuan: rm -rf /tmp/x",
)
check(
    "persetujuan: tanpa petunjuk, jangan ngarang nama 'tool'",
    api._detail_from("pre_approval_request", {}),
    "nunggu persetujuan",
)

print("\npemotongan keterangan panjang")
long = "x" * 500
d = api._detail_from("PostToolUseFailure", {"tool_error": long})
check("baris error panjang masih utuh di sini", len(d), 500)
check("batas potong terdefinisi", api.DETAIL_MAX, 140)

print(f"\n{ok} lolos, {bad} gagal")
sys.exit(1 if bad else 0)
