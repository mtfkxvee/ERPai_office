/** Satu-satunya sumber kebenaran soal bentuk ruangan.
 *
 * Backend cuma nyimpen `desk_index` (angka); posisi fisiknya dihitung di sini.
 * Mau ubah tata letak? cukup file ini, nggak ada migrasi data.
 *
 * Skala: 1 unit ~= 0.9 m. Karakter tinggi 2 unit, meja tinggi 0.78 unit.
 *
 * ARAH HADAP: karakter menghadap -z waktu rotY = 0, karena mukanya dibikin di
 * sisi -z kepala. Rotasi POSITIF di sumbu x bikin anggota badan MAJU (ke -z).
 * Dua aturan ini yang dulu kebalik dan bikin karakter ngetik memunggungi
 * monitor — jangan diubah tanpa jalanin `npm run verify`.
 */

import type { Pose } from "./types";

export const ROOM = {
  w: 41,
  d: 20,
  h: 4.6,
  wall: 0.25,
};

/** Sekat pemisah ruang kerja (kiri) dan ruang santai (kanan), dengan satu
 * bukaan pintu lebar di tengah. */
export const PARTITION = {
  x: 23.6,
  t: 0.3,
  doorZ0: 8.4,
  doorZ1: 11.6,
  doorH: 2.75,
};

export const DOOR = {
  z: (PARTITION.doorZ0 + PARTITION.doorZ1) / 2,
  xNear: PARTITION.x - 1.3,
  xFar: PARTITION.x + PARTITION.t + 1.3,
};

/** True kalau dua titik ini ada di ruangan yang beda. */
export function crossesPartition(fromX: number, toX: number) {
  return fromX < PARTITION.x !== toX < PARTITION.x;
}

/* ================================================================== */
/* RUANG KERJA                                                         */
/* ================================================================== */

/** Titik TENGAH tiap meja. Meja: lebar 2.3, dalam 1.1. */
export const DESKS: { x: number; z: number }[] = [
  { x: 4.5, z: 5.2 },
  { x: 9.5, z: 5.2 },
  { x: 14.5, z: 5.2 },
  { x: 19.5, z: 5.2 },
  { x: 4.5, z: 14.8 },
  { x: 9.5, z: 14.8 },
  { x: 14.5, z: 14.8 },
  { x: 19.5, z: 14.8 },
];

export const DESK_COUNT = DESKS.length;

export const DESK = { w: 2.3, d: 1.1, topY: 0.78, topT: 0.07 };

/** Posisi perabot meja RELATIF ke titik tengah meja.
 *
 * Dipakai bareng sama props.tsx (buat nempatin mesh) dan scripts/verify.ts
 * (buat ngitung posisi world-nya). Sebelum ada ini, kursi dikasih koordinat
 * absolut padahal grup mejanya udah digeser — kegeser dua kali dan nyasar ke
 * tengah ruangan. Kalau offset-nya satu sumber, itu nggak bisa keulang. */
export const DESK_LOCAL = {
  chair: { x: 0, z: 1.05 },
  monitor: { x: -0.34, z: -0.26 },
  monitor2: { x: 0.74, z: -0.22 },
  keyboard: { x: -0.26, z: 0.26 },
  mouse: { x: 0.34, z: 0.28 },
  mug: { x: 0.68, z: 0.3 },
  tower: { x: -DESK.w / 2 + 0.45, z: -0.15 },
  lamp: { x: -1.0, z: -0.3 },
};

/** Tinggi dudukan kursi. Harus pas sama DESK_SEAT di poses.ts, kalau nggak
 * karakternya ngambang atau nyusup ke kursi. `npm run verify` ngecek ini. */
export const CHAIR = { seatY: 0.49, seatT: 0.11, backZ: 0.27 };

/** Posisi kursi dalam koordinat DUNIA (buat tujuan jalan & tes). */
export function chairPos(deskIndex: number) {
  const d = DESKS[((deskIndex % DESK_COUNT) + DESK_COUNT) % DESK_COUNT];
  return { x: d.x + DESK_LOCAL.chair.x, z: d.z + DESK_LOCAL.chair.z };
}

export function deskStandPos(deskIndex: number) {
  const c = chairPos(deskIndex);
  return { x: c.x, z: c.z, rotY: 0 };
}

/** Whiteboard nempel dinding kiri, sejajar lorong. */
export const WHITEBOARD = { z: 10, zSpan: 3.4 };

/** Zona "ketahan/error" di ruang kerja. */
export const BUGZONE = { x: 21, z: 2.6 };

export const SHELF = { x: 8 };

/** Karpet lorong tengah ruang kerja. */
export const RUNNER = { x: 2, z: 9.4, w: 20.4, d: 1.2 };

/* ================================================================== */
/* RUANG SANTAI — gaya kantor Google: banyak sudut, banyak tanaman     */
/* ================================================================== */

export const RELAX_X0 = PARTITION.x + PARTITION.t;

/** Micro-kitchen: tujuan agent yang baru nganggur. */
export const KITCHEN = { x: 28.5, counterZ: 1.1, standZ: 2.9 };

/** Meja tinggi + bangku, nempel micro-kitchen. */
export const BAR = { x: 33.4, z: 2.8 };

/** Lounge PS: TV nempel dinding kanan, sofa menghadapnya. */
export const LOUNGE = {
  tvX: 40.45,
  sofaX: 37.8,
  z: 5.6,
  seatY: 0.625,
};

/** Offset z tiap tempat duduk sofa (sofa-nya memanjang di sumbu z). */
export const SOFA_SEATS = [-0.88, 0, 0.88];

export function psSeat(deskIndex: number) {
  const i = ((deskIndex % SOFA_SEATS.length) + SOFA_SEATS.length) % SOFA_SEATS.length;
  // Menghadap +x ke arah TV.
  return { x: LOUNGE.sofaX, z: LOUNGE.z + SOFA_SEATS[i], rotY: -Math.PI / 2 };
}

/** Nap pod: kepala di sisi +z (nempel dinding depan). */
export const BED = { z: 17.7, len: 2.15, w: 1.12, matTop: 0.62 };
export const BED_X = [25.9, 28.1, 30.3];

export function bedSpot(deskIndex: number) {
  const i = ((deskIndex % BED_X.length) + BED_X.length) % BED_X.length;
  // Karakter ditaruh di ujung kaki; waktu dibaringin badannya memanjang ke +z
  // sepanjang 2 unit, jadi kepalanya mendarat pas di bantal.
  return { x: BED_X[i], z: BED.z - BED.len / 2 + 0.05, rotY: 0 };
}

export const BEANBAGS = { x: 34.8, z: 12 };
export const PINGPONG = { x: 36.2, z: 17.3 };
export const BOOTH = { x: 25.1, z: 12.2 };
export const LIBRARY = { x: 25.3, z: 7 };

/** Lampu gantung ruang santai — hangat, beda dari panel putih ruang kerja. */
export const PENDANTS: { x: number; z: number }[] = [
  { x: 28.5, z: 3.4 },
  { x: 33.4, z: 2.8 },
  { x: 37.8, z: 5.6 },
  { x: 34.8, z: 12 },
  { x: 28.1, z: 15.4 },
  { x: 36.2, z: 17.3 },
  { x: 26.5, z: 9.6 },
];

/* ================================================================== */

export const ZONES = {
  kitchen: { x: KITCHEN.x, z: KITCHEN.standZ, rotY: 0 },
  whiteboard: { x: 2.6, z: WHITEBOARD.z, rotY: Math.PI / 2 },
  bug: { x: BUGZONE.x, z: BUGZONE.z + 2.2, rotY: 0 },
};

/** Pose mana -> karakter ada di mana. */
export function targetFor(pose: Pose, deskIndex: number) {
  switch (pose) {
    case "idle":
      return ZONES.kitchen;
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

/** Rute dari posisi sekarang ke tujuan. Sekarang ada sekat, jadi karakter
 * nggak boleh jalan nembus dinding — kalau pindah ruangan, lewat pintu dulu.
 * Cuma segini pathfinding-nya; ruangannya lega dan nggak ada rintangan lain. */
export function routeTo(
  fromX: number,
  fromZ: number,
  to: { x: number; z: number },
): { x: number; z: number }[] {
  if (!crossesPartition(fromX, to.x)) return [to];
  const goingRight = fromX < PARTITION.x;
  void fromZ;
  return goingRight
    ? [{ x: DOOR.xNear, z: DOOR.z }, { x: DOOR.xFar, z: DOOR.z }, to]
    : [{ x: DOOR.xFar, z: DOOR.z }, { x: DOOR.xNear, z: DOOR.z }, to];
}

/* ================================================================== */

/** Jalur jendela di dinding depan & belakang. */
export const WINDOW_BAND = { y: 1.5, h: 1.6, inset: 2.5, mullionEvery: 3.2 };

/** Panel lampu plafon ruang kerja (ruang santai pakai lampu gantung). */
export const CEILING_LIGHTS: { x: number; z: number }[] = [
  { x: 5, z: 3.5 },
  { x: 12, z: 3.5 },
  { x: 19, z: 3.5 },
  { x: 5, z: 10 },
  { x: 12, z: 10 },
  { x: 19, z: 10 },
  { x: 5, z: 16.5 },
  { x: 12, z: 16.5 },
  { x: 19, z: 16.5 },
];

export const PLANTS: { x: number; z: number; big: boolean }[] = [
  // ruang kerja: seadanya
  { x: 1.3, z: 1.5, big: true },
  { x: 1.3, z: 18.5, big: false },
  { x: 22.4, z: 18.6, big: true },
  // ruang santai: banyak, ini ciri khasnya
  { x: 24.8, z: 1.4, big: true },
  { x: 31.6, z: 3.6, big: false },
  { x: 39.4, z: 1.5, big: true },
  { x: 32.2, z: 8.6, big: true },
  { x: 39.5, z: 9.8, big: false },
  { x: 26.4, z: 14.2, big: false },
  { x: 32.4, z: 15.4, big: true },
  { x: 39.4, z: 13.6, big: true },
  { x: 39.5, z: 19, big: false },
];

/** Pot gantung — nempel langit-langit ruang santai. */
export const HANGING: { x: number; z: number; drop: number }[] = [
  { x: 26.2, z: 5.2, drop: 1.5 },
  { x: 30.4, z: 7.4, drop: 1.9 },
  { x: 35.6, z: 9.2, drop: 1.6 },
  { x: 38.6, z: 15.8, drop: 2 },
  { x: 29.2, z: 11.8, drop: 1.7 },
];
