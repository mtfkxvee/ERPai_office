import { applyEvent, setAgents } from "./store";
import { AGENT_STATES, type Agent, type AgentState, type OfficeEvent } from "./types";

declare global {
  interface Window {
    frappe?: any;
    XshaOffice?: unknown;
  }
}

export function hasFrappe() {
  return typeof window.frappe?.call === "function";
}

function coerce(raw: any): OfficeEvent | null {
  const state = String(raw?.state || "").toLowerCase() as AgentState;
  if (!raw?.agent || !AGENT_STATES.includes(state)) return null;
  return { agent: String(raw.agent), state, tool: raw.tool ?? null, detail: raw.detail ?? null };
}

export async function loadInitial(): Promise<void> {
  if (!hasFrappe()) return;
  const r = await window.frappe.call({ method: "xsha_office.api.get_state" });
  const rows: Agent[] = (r?.message?.agents || []).map((a: any) => ({
    agent: a.agent,
    role: a.role,
    color: a.color,
    desk_index: Number(a.desk_index) || 0,
    state: (AGENT_STATES.includes(a.state) ? a.state : "idle") as AgentState,
    tool: a.tool,
    detail: a.detail,
    // `idle_for` = sudah berapa detik agent itu nggak ngasih kabar, dihitung di
    // server. Dipakai buat merekonstruksi kapan terakhir dia kedengaran.
    //
    // Penting: tanpa ini, semua agent dianggap "baru saja terlihat" tiap kali
    // halaman dibuka — yang lagi tidur bakal bangun dan jalan ke pantry cuma
    // gara-gara di-refresh. null = belum pernah lapor sama sekali, jadi dikasih
    // 0 (epoch) supaya langsung terbaca sebagai nggak-ada-kabar-sejak-lama.
    seen: a.idle_for == null ? 0 : Date.now() - Number(a.idle_for) * 1000,
  }));
  setAgents(rows);
}

/** Pasang listener realtime. Pakai socketio bawaan Frappe — nggak perlu
 * WebSocket server sendiri kayak proyek-proyek sejenis di luar. */
export function subscribe(): () => void {
  if (!hasFrappe() || !window.frappe.realtime?.on) return () => {};
  const handler = (raw: any) => {
    const e = coerce(raw);
    if (e) applyEvent(e);
  };
  window.frappe.realtime.on("ai_office_event", handler);
  return () => window.frappe.realtime.off?.("ai_office_event", handler);
}

/* ------------------------------------------------------------------ */
/* Mode demo: cuma jalan kalau Frappe nggak ada (yaitu `npm run dev`). */
/* Di dalam ERP ini NGGAK PERNAH aktif — supaya nggak ada animasi bohong. */
/* ------------------------------------------------------------------ */

/** Empat agent pertama yang aktif, sisanya sengaja dibikin nganggur dengan
 * `seen` yang dibackdate — biar lounge PS dan area tidur kelihatan tanpa harus
 * nungguin 4 menit, DAN tanpa ngubah ambang waktunya (kalau ambangnya yang
 * digeser, preview-nya bohong soal timing). */
const DEMO_AGENTS = [
  { agent: "jarvis", role: "Voice", idleFor: 0 },
  { agent: "erp-reporting", role: "Reporting", idleFor: 0 },
  { agent: "wa-bot", role: "WhatsApp", idleFor: 0 },
  { agent: "claude-code", role: "Dev", idleFor: 0 },
  { agent: "stock-opname", role: "Inventory", idleFor: 100 * 1000 },
  { agent: "gl-recon", role: "Finance", idleFor: 170 * 1000 },
  { agent: "sheet-sync", role: "Sheets", idleFor: 9 * 60 * 1000 },
  { agent: "pos-watcher", role: "POS", idleFor: 6 * 60 * 1000 },
];

const ACTIVE_COUNT = 4;

const DEMO_TOOLS = ["Read", "Edit", "Bash", "Grep", "WebFetch", "SQL"];

export function startDemo(): () => void {
  const now = Date.now();
  setAgents(
    DEMO_AGENTS.map((a, i) => ({
      agent: a.agent,
      role: a.role,
      desk_index: i,
      color: null,
      state: "idle" as AgentState,
      tool: null,
      detail: null,
      seen: now - a.idleFor,
    })),
  );

  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  const states: AgentState[] = [
    "working",
    "working",
    "working",
    "thinking",
    "idle",
    "blocked",
    "error",
    "done",
  ];

  const timer = setInterval(() => {
    const a = pick(DEMO_AGENTS.slice(0, ACTIVE_COUNT));
    const state = pick(states);
    applyEvent({
      agent: a.agent,
      state,
      tool: state === "working" ? pick(DEMO_TOOLS) : null,
      detail: state === "blocked" ? "nunggu izin" : null,
    });
  }, 1600);

  return () => clearInterval(timer);
}
