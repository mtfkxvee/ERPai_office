/** Mode jalan: mengemudikan satu karakter dari sudut pandangnya.
 *
 * PENTING — ini TIDAK melaporkan apa pun ke server.
 *
 * Office ini dibangun dengan satu aturan: yang ditampilkan harus sinyal nyata
 * dari agent. Mode jalan melanggar itu kalau dibiarkan ambigu, karena karakter
 * bergerak bukan karena agent-nya mengerjakan sesuatu. Jadi:
 *
 *   - tidak ada panggilan API sama sekali selama mengemudi
 *   - karakter yang dikemudikan diberi penanda jelas di layar
 *   - begitu keluar, dia kembali ke posisi yang ditentukan state-nya
 *
 * Yang kamu gerakkan cuma kamera dan boneka, bukan laporan.
 */

import { useEffect, useState } from "react";
import { freeSpotNear, move, WALK_RADIUS } from "./collide.ts";

export const EYE_HEIGHT = 1.62;
const SPEED = 3.2;
const SPEED_LARI = 5.6;
/** Batas tengadah/menunduk, sedikit di bawah tegak lurus biar tidak terbalik. */
const PITCH_MAX = Math.PI / 2 - 0.08;

export type PilotState = {
  agent: string;
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  moving: boolean;
};

let pilot: PilotState | null = null;
const listeners = new Set<() => void>();
const keys = new Set<string>();

function emit() {
  for (const l of listeners) l();
}

export function startPilot(agent: string, x: number, z: number, yaw: number) {
  // Karakter yang sedang duduk atau tidur berada DI DALAM kotak padat
  // perabotnya. Dipindah dulu ke lantai kosong terdekat supaya dia langsung
  // berdiri di tempat yang masuk akal, bukan mengambang di dalam kasur.
  const bebas = freeSpotNear(x, z);
  pilot = { agent, x: bebas.x, z: bebas.z, yaw, pitch: 0, moving: false };
  keys.clear();
  emit();
}

export function stopPilot() {
  pilot = null;
  keys.clear();
  emit();
}

export function getPilot() {
  return pilot;
}

export function isPiloted(agent: string) {
  return pilot?.agent === agent;
}

export function keyDown(code: string) {
  keys.add(code);
}

export function keyUp(code: string) {
  keys.delete(code);
}

export function look(dx: number, dy: number) {
  if (!pilot) return;
  // Tanda minus: geser tetikus ke kanan harus memutar pandangan ke kanan.
  pilot.yaw -= dx;
  pilot.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pilot.pitch - dy));
}

/** Satu langkah waktu. Dipanggil dari useFrame, bukan dari timer sendiri. */
export function step(dt: number) {
  if (!pilot) return;

  let maju = 0;
  let samping = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) maju += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) maju -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) samping -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) samping += 1;

  const bergerak = maju !== 0 || samping !== 0;
  if (bergerak !== pilot.moving) {
    pilot.moving = bergerak;
    emit();
  }
  if (!bergerak) return;

  const panjang = Math.hypot(maju, samping);
  maju /= panjang;
  samping /= panjang;

  const laju = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? SPEED_LARI : SPEED) * dt;

  // Karakter menghadap -z pada yaw 0, sama seperti rotY di layout.ts.
  const fx = -Math.sin(pilot.yaw);
  const fz = -Math.cos(pilot.yaw);
  // Kanan = maju diputar -90 derajat.
  const rx = -fz;
  const rz = fx;

  const dx = (fx * maju + rx * samping) * laju;
  const dz = (fz * maju + rz * samping) * laju;

  const next = move(pilot.x, pilot.z, dx, dz);
  pilot.x = next.x;
  pilot.z = next.z;
}

export function usePilot(): PilotState | null {
  const [snap, setSnap] = useState<PilotState | null>(pilot);
  useEffect(() => {
    const update = () => setSnap(pilot ? { ...pilot } : null);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return snap;
}

export { WALK_RADIUS };
