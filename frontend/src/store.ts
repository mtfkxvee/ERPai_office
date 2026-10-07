import { useEffect, useState } from "react";
import { LEISURE_POSES, type Agent, type AgentState, type OfficeEvent, type Pose } from "./types.ts";

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

/** Ganti nama tampilan tanpa menyentuh state. Dipicu endpoint set_name, jadi
 * office yang sedang terbuka langsung ikut berubah tanpa refresh. */
export function applyRename(agent: string, displayName: string | null) {
  const prev = agents.get(agent);
  if (!prev) return;
  agents = new Map(agents);
  agents.set(agent, { ...prev, display_name: displayName });
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

/* Batas antara "baru saja nganggur" dan "sudah lama".
 *
 * Di bawah ambang ini agent berdiri di pantry — seolah lagi jeda sebentar.
 * Di atasnya, dia dapat tempat santai dari LEISURE_PLAN.
 *
 * Lamanya nganggur TIDAK lagi bisa dibaca dari tempat duduknya (tempat dibagi
 * supaya nggak tumpuk, bukan menurut durasi). Angkanya ada di idleText(). */
const IDLE_PANTRY_MS = 45 * 1000;

/** Urutan pembagian tempat santai.
 *
 * Diselang-seling antar zona, bukan diisi satu zona sampai penuh dulu — biar
 * ruangannya kelihatan terpakai merata, bukan semua numpuk di sofa.
 *
 * `pair: true` artinya atomik: ping pong cuma dipakai kalau ADA DUA agent yang
 * bisa mengisinya. Satu orang main ping pong sendirian kelihatan aneh. */
const LEISURE_PLAN: { pose: Pose; slot: number; pair?: boolean }[] = [
  { pose: "gaming", slot: 0 },
  { pose: "lounging", slot: 0 },
  { pose: "pingpong", slot: 0, pair: true },
  { pose: "sleeping", slot: 0 },
  { pose: "reading", slot: 0 },
  { pose: "gaming", slot: 1 },
  { pose: "lounging", slot: 1 },
  { pose: "sleeping", slot: 1 },
  { pose: "gaming", slot: 2 },
  { pose: "lounging", slot: 2 },
  { pose: "sleeping", slot: 2 },
  { pose: "lounging", slot: 3 },
];

export type Placement = { pose: Pose; slot: number };

/** Tentukan pose DAN tempat duduk setiap agent sekaligus.
 *
 * Harus dihitung untuk SEMUA agent bersamaan, bukan satu per satu — kalau tiap
 * agent milih sendiri (misal dari hash namanya), dua agent bisa memilih tempat
 * yang sama dan karakternya tindih-menindih. Itu yang terjadi sebelum ini.
 *
 * Urutannya ditentukan nama agent (bukan urutan data dari server), supaya
 * pembagiannya stabil dan nggak berubah tiap kali data masuk.
 */
export function resolvePoses(agents: Agent[], now: number): Map<string, Placement> {
  const out = new Map<string, Placement>();
  const leisure: Agent[] = [];
  // Pemakaian tiap zona berdiri, biar yang sama-sama mikir nggak satu titik.
  const used: Record<string, number> = {};
  const nextSlot = (pose: string) => (used[pose] = (used[pose] ?? -1) + 1);

  const sorted = [...agents].sort((a, b) => a.agent.localeCompare(b.agent));

  for (const a of sorted) {
    const state = effectiveState(a, now);

    if (state === "working" || state === "done") {
      // Punya mejanya sendiri, nggak mungkin tabrakan.
      out.set(a.agent, { pose: state, slot: a.desk_index });
      continue;
    }
    if (state !== "idle") {
      out.set(a.agent, { pose: state, slot: nextSlot(state) });
      continue;
    }
    if (now - a.seen < IDLE_PANTRY_MS) {
      out.set(a.agent, { pose: "idle", slot: nextSlot("idle") });
      continue;
    }
    leisure.push(a);
  }

  // Bagikan tempat santai menurut rencana di atas.
  //
  // CATATAN: tempat mana yang didapat seorang agent NGGAK berarti apa-apa —
  // ini murni biar ruangannya nggak kelihatan kayak kamar mayat. Informasi
  // yang sebenarnya (sudah berapa lama nggak ada kabar) ada di idleText().
  // Jangan baca "lagi main PS" sebagai "baru saja nganggur".
  let i = 0;
  for (const entry of LEISURE_PLAN) {
    if (i >= leisure.length) break;
    if (entry.pair) {
      // Butuh dua. Kalau cuma sisa satu, lewati — biar nggak main sendirian.
      if (leisure.length - i < 2) continue;
      out.set(leisure[i++].agent, { pose: entry.pose, slot: 0 });
      out.set(leisure[i++].agent, { pose: entry.pose, slot: 1 });
      continue;
    }
    out.set(leisure[i++].agent, { pose: entry.pose, slot: entry.slot });
  }

  // Lebih banyak agent daripada tempat duduk: sisanya berdiri di pantry,
  // berjajar. Lebih jujur daripada menumpuk mereka di kursi yang sama.
  let extra = 0;
  while (i < leisure.length) {
    out.set(leisure[i++].agent, { pose: "idle", slot: nextSlot("idle") + extra++ });
  }

  return out;
}

/** Pose satu agent saja. Dipakai di tempat yang nggak punya daftar lengkap. */
export function displayPose(a: Agent, now: number): Pose {
  const state = effectiveState(a, now);
  if (state !== "idle") return state;
  const idle = now - a.seen;
  if (idle < IDLE_PANTRY_MS) return "idle";
  return LEISURE_POSES[0];
}

/** Berapa lama agent ini nggak ngasih kabar, dalam bahasa manusia.
 *
 * Ini yang jadi sumber kebenaran soal keaktifan, bukan posisi karakternya. */
export function idleText(a: Agent, now: number): string | null {
  const state = effectiveState(a, now);
  if (state !== "idle") return null;

  const s = Math.max(0, Math.floor((now - a.seen) / 1000));
  if (s < 45) return null; // masih di pantry, belum perlu angka
  if (s < 3600) return `${Math.floor(s / 60)} mnt`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam`;
  const d = Math.floor(s / 86400);
  return d > 900 ? "belum pernah" : `${d} hari`;
}

/** Nama yang ditampilkan: dari SOUL.md kalau ada, kalau nggak ya id agent-nya. */
export function nameOf(a: Agent) {
  return a.display_name?.trim() || a.agent;
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
