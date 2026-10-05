/** Satu-satunya sumber kebenaran soal bentuk ruangan.
 *
 * Backend cuma nyimpen `desk_index` (angka); posisi fisiknya dihitung di sini.
 * Mau ubah tata letak office? cukup file ini, nggak ada migrasi data.
 *
 * Skala: 1 unit ~= 0.9 m. Karakter tinggi 2 unit, meja tinggi 0.78 unit.
 *
 * Konvensi arah: karakter menghadap -z waktu rotY = 0 (mukanya dibikin di sisi
 * -z kepala). Semua rotY di file ini ngikut itu.
 */

import type { Pose } from "./types";

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

/* ------------------------------------------------------------------ */
/* Lounge PS: sofa 3 orang menghadap TV.                               */
/* ------------------------------------------------------------------ */

export const LOUNGE = {
  x: 6.6,
  tvZ: 14.75,
  sofaZ: 16.6,
  seatY: 0.46,
};

/** Offset x tiap tempat duduk sofa. */
export const SOFA_SEATS = [-0.88, 0, 0.88];

export function psSeat(deskIndex: number) {
  const i = ((deskIndex % SOFA_SEATS.length) + SOFA_SEATS.length) % SOFA_SEATS.length;
  return { x: LOUNGE.x + SOFA_SEATS[i], z: LOUNGE.sofaZ - 0.12, rotY: 0 };
}

/* ------------------------------------------------------------------ */
/* Area tidur: 3 kasur, kepala di sisi +z (nempel dinding depan).       */
/* ------------------------------------------------------------------ */

export const BED = {
  z: 16.1,
  len: 2.15,
  w: 1.12,
  matTop: 0.62,
};

export const BED_X = [13.7, 15.9, 18.1];

export function bedSpot(deskIndex: number) {
  const i = ((deskIndex % BED_X.length) + BED_X.length) % BED_X.length;
  // Karakter ditaruh di ujung kaki; waktu dibaringin, badannya memanjang ke +z
  // sepanjang 2 unit, jadi kepalanya mendarat pas di bantal.
  return { x: BED_X[i], z: BED.z - BED.len / 2 + 0.05, rotY: 0 };
}

/* ------------------------------------------------------------------ */

export const ZONES = {
  coffee: { x: 22.4, z: 3.2, rotY: 0 },
  whiteboard: { x: 2.6, z: 9, rotY: Math.PI / 2 },
  bug: { x: 22.4, z: 14.8, rotY: 0 },
};

export function deskStandPos(deskIndex: number) {
  const c = chairPos(deskIndex);
  return { x: c.x, z: c.z, rotY: 0 };
}

/** Pose mana -> karakter ada di mana. */
export function targetFor(pose: Pose, deskIndex: number) {
  switch (pose) {
    case "idle":
      return ZONES.coffee;
    case "gaming":
      return psSeat(deskIndex);
    case "sleeping":
      return bedSpot(deskIndex);
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

export type Posture = "desk" | "sofa" | "bed" | "stand";

export function postureFor(pose: Pose): Posture {
  switch (pose) {
    case "working":
    case "done":
      return "desk";
    case "gaming":
      return "sofa";
    case "sleeping":
      return "bed";
    default:
      return "stand";
  }
}

/* ------------------------------------------------------------------ */

/** Jalur jendela di dinding depan & belakang. */
export const WINDOW_BAND = { y: 1.5, h: 1.6, inset: 2.5, mullionEvery: 3.2 };

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
