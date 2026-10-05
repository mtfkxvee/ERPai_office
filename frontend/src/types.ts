/** State yang DILAPORIN agent. Ini kontrak API-nya — jangan diubah sembarangan,
 * karena hook/agent di luar sana ngirim nilai-nilai ini. */
export type AgentState = "idle" | "thinking" | "working" | "blocked" | "error" | "done";

export const AGENT_STATES: AgentState[] = [
  "idle",
  "thinking",
  "working",
  "blocked",
  "error",
  "done",
];

/** Pose yang DITAMPILIN. Turunan dari state + udah berapa lama nganggur.
 *
 * `gaming` dan `sleeping` bukan state baru yang bisa dilaporin agent — dua-duanya
 * dihitung dari lamanya `idle`. Jadi nggak ada informasi yang dikarang: posisi
 * karakter nunjukin berapa lama dia nggak ngasih kabar. */
export type Pose = AgentState | "gaming" | "sleeping";

export type Agent = {
  agent: string;
  role?: string | null;
  color?: string | null;
  desk_index: number;
  state: AgentState;
  tool?: string | null;
  detail?: string | null;
  /** epoch ms event terakhir, buat ngitung lama nganggur */
  seen: number;
};

export type OfficeEvent = {
  agent: string;
  state: AgentState;
  tool?: string | null;
  detail?: string | null;
};
