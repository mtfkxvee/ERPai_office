export type AgentState = "idle" | "thinking" | "working" | "blocked" | "error" | "done";

export const AGENT_STATES: AgentState[] = [
  "idle",
  "thinking",
  "working",
  "blocked",
  "error",
  "done",
];

export type Agent = {
  agent: string;
  role?: string | null;
  color?: string | null;
  desk_index: number;
  state: AgentState;
  tool?: string | null;
  detail?: string | null;
  /** epoch ms event terakhir, buat deteksi sesi yang udah mati */
  seen: number;
};

export type OfficeEvent = {
  agent: string;
  state: AgentState;
  tool?: string | null;
  detail?: string | null;
};
