import { useEffect, useState } from "react";
import type { Agent, AgentState, OfficeEvent } from "./types";

/** Store mini, tanpa dependency. Cuma Map + listener. */

const DEFAULT_COLORS = [
  "#6ab04c",
  "#4834d4",
  "#eb4d4b",
  "#f0932b",
  "#22a6b3",
  "#be2edd",
  "#f9ca24",
  "#7f8fa6",
];

/** Kalau agent nggak lapor selama ini, dianggap idle — biar karakternya nggak
 * keliatan ngetik terus padahal sesinya udah mati. Sama kayak STALE_SECONDS
 * di api.py. */
const STALE_MS = 5 * 60 * 1000;

/** `done` itu signal nyata tapi sekejap. Setelah beberapa detik kita turunin
 * ke idle secara lokal — ini peluruhan tampilan, bukan state karangan. */
const DONE_DECAY_MS = 6000;

let agents = new Map<string, Agent>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setAgents(list: Agent[]) {
  agents = new Map(list.map((a) => [a.agent, a]));
  emit();
}

export function applyEvent(e: OfficeEvent) {
  const prev = agents.get(e.agent);
  const next: Agent = prev
    ? { ...prev, state: e.state, tool: e.tool, detail: e.detail, seen: Date.now() }
    : {
        agent: e.agent,
        desk_index: agents.size,
        color: DEFAULT_COLORS[agents.size % DEFAULT_COLORS.length],
        state: e.state,
        tool: e.tool,
        detail: e.detail,
        seen: Date.now(),
      };
  agents = new Map(agents);
  agents.set(e.agent, next);
  emit();
}

/** State yang benar-benar ditampilin, setelah peluruhan stale & done. */
export function effectiveState(a: Agent, now: number): AgentState {
  const age = now - a.seen;
  if (age > STALE_MS) return "idle";
  if (a.state === "done" && age > DONE_DECAY_MS) return "idle";
  return a.state;
}

export function colorOf(a: Agent) {
  return a.color || DEFAULT_COLORS[a.desk_index % DEFAULT_COLORS.length];
}

export function useAgents(): Agent[] {
  const [snapshot, setSnapshot] = useState<Agent[]>(() => [...agents.values()]);
  useEffect(() => {
    const update = () => setSnapshot([...agents.values()]);
    listeners.add(update);
    update();
    // Tick lambat supaya peluruhan stale/done kebaca walau nggak ada event masuk.
    const timer = setInterval(update, 2000);
    return () => {
      listeners.delete(update);
      clearInterval(timer);
    };
  }, []);
  return snapshot;
}
