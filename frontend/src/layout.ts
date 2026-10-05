/** Satu-satunya sumber kebenaran soal bentuk ruangan.
 *
 * Backend cuma nyimpen `desk_index` (angka); posisi fisiknya dihitung di sini.
 * Mau ubah tata letak office? cukup file ini, nggak ada migrasi data.
 *
 * Skala: 1 unit ~= 0.9 m. Karakter tinggi 2 unit, meja tinggi 0.78 unit.
 */

export const ROOM = {
  w: 26,
  d: 18,
  h: 4.6,
  wall: 0.25,
};

/** Titik TENGAH tiap meja. Meja: lebar 2.3, dalam 1.1. */
export const DESKS: { x: number; z: number }[] = [
  { x: 5, z: 5.5 },
  { x: 10, z: 5.5 },
  { x: 15, z: 5.5 },
  { x: 20, z: 5.5 },
  { x: 5, z: 12.5 },
  { x: 10, z: 12.5 },
  { x: 15, z: 12.5 },
  { x: 20, z: 12.5 },
];

export const DESK_COUNT = DESKS.length;

export const DESK = {
  w: 2.3,
  d: 1.1,
  topY: 0.78,
  topT: 0.07,
};

/** Kursi ada di belakang meja; karakter duduk di titik yang sama. */
export function chairPos(deskIndex: number) {
  const d = DESKS[((deskIndex % DESK_COUNT) + DESK_COUNT) % DESK_COUNT];
  return { x: d.x, z: d.z + 1.05 };
}

export const ZONES = {
  coffee: { x: 22.4, z: 3.2, rotY: Math.PI },
  whiteboard: { x: 2.6, z: 9, rotY: Math.PI / 2 },
  bug: { x: 22.4, z: 14.8, rotY: Math.PI },
};

export function deskStandPos(deskIndex: number) {
  const c = chairPos(deskIndex);
  return { x: c.x, z: c.z, rotY: Math.PI };
}

/** State mana -> karakter ada di mana. */
export function targetFor(state: string, deskIndex: number) {
  switch (state) {
    case "idle":
      return ZONES.coffee;
    case "thinking":
      return ZONES.whiteboard;
    case "blocked":
    case "error":
      return ZONES.bug;
    case "working":
    case "done":
    default:
      return deskStandPos(deskIndex);
  }
}

/** Cuma duduk kalau posisinya di meja. Di whiteboard/kopi/zona bug, berdiri. */
export function sitsAt(state: string) {
  return state === "working" || state === "done";
}

/** Jalur jendela di dinding depan & belakang. */
export const WINDOW_BAND = { y: 1.5, h: 1.6, inset: 2.5, mullionEvery: 3.2 };

/** Lampu plafon. */
export const CEILING_LIGHTS: { x: number; z: number }[] = [
  { x: 6, z: 4 },
  { x: 13, z: 4 },
  { x: 20, z: 4 },
  { x: 6, z: 9 },
  { x: 13, z: 9 },
  { x: 20, z: 9 },
  { x: 6, z: 14 },
  { x: 13, z: 14 },
  { x: 20, z: 14 },
];

/** Karpet lorong tengah. */
export const RUNNER = { x: 2.5, z: 8.2, w: 18, d: 1.6 };

export const PLANTS: { x: number; z: number; big: boolean }[] = [
  { x: 1.4, z: 1.6, big: true },
  { x: 1.4, z: 16.4, big: false },
  { x: 24.4, z: 8.4, big: true },
];
