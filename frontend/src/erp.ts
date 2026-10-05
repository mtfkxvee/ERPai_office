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
    // Dianggap baru dilihat sekarang; backend udah nurunin yang stale ke idle.
    seen: Date.now(),
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

const DEMO_AGENTS = [
  { agent: "jarvis", role: "Voice" },
  { agent: "erp-reporting", role: "Reporting" },
  { agent: "wa-bot", role: "WhatsApp" },
  { agent: "stock-opname", role: "Inventory" },
  { agent: "claude-code", role: "Dev" },
];

const DEMO_TOOLS = ["Read", "Edit", "Bash", "Grep", "WebFetch", "SQL"];

export function startDemo(): () => void {
  setAgents(
    DEMO_AGENTS.map((a, i) => ({
      ...a,
      desk_index: i,
      color: null,
      state: "idle" as AgentState,
      tool: null,
      detail: null,
      seen: Date.now(),
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
    const a = pick(DEMO_AGENTS);
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
