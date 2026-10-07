/** Tabrakan buat mode jalan (POV karakter).
 *
 * Sengaja sederhana: daftar kotak sejajar sumbu, plus geser-menggeser per
 * sumbu supaya nggak nyangkut di dinding. Nggak ada fisika, nggak ada tinggi —
 * semuanya dianggap setinggi orang. Yang penting nggak bisa nembus dinding dan
 * nggak bisa berdiri di dalam meja.
 *
 * Semua kotak diturunkan dari konstanta yang SAMA yang dipakai menggambar
 * perabotnya. Kalau ditulis ulang di sini, cepat atau lambat melenceng dan
 * orang bisa jalan menembus meja yang kelihatan padat.
 */

import {
  BAR,
  BEANBAG_SPOTS,
  BEANBAGS,
  BED,
  BED_X,
  BOOTH,
  DESK,
  DESKS,
  KITCHEN,
  LIBRARY,
  LOUNGE,
  PARTITION,
  PINGPONG,
  ROOM,
  SHELF,
} from "./layout.ts";

export type Box = { x: number; z: number; w: number; d: number; label: string };

/** Setengah lebar badan pejalan. Dipakai buat menggembungkan kotak. */
export const WALK_RADIUS = 0.32;

function box(label: string, x: number, z: number, w: number, d: number): Box {
  return { label, x, z, w, d };
}

export function solids(): Box[] {
  const out: Box[] = [];

  // --- ruang kerja ---
  for (let i = 0; i < DESKS.length; i++) {
    const d = DESKS[i];
    out.push(box(`meja${i}`, d.x, d.z, DESK.w, DESK.d));
  }
  out.push(box("rak-dokumen", SHELF.x, 0.55, 3.4, 0.42));

  // --- sekat, dua ruas, lubang pintunya dibiarkan terbuka ---
  const cx = PARTITION.x + PARTITION.t / 2;
  out.push(box("sekat-atas", cx, PARTITION.doorZ0 / 2, PARTITION.t, PARTITION.doorZ0));
  out.push(
    box(
      "sekat-bawah",
      cx,
      (PARTITION.doorZ1 + ROOM.d) / 2,
      PARTITION.t,
      ROOM.d - PARTITION.doorZ1,
    ),
  );

  // --- ruang santai ---
  out.push(box("dapur", KITCHEN.x, KITCHEN.counterZ, 6.4, 0.95));
  out.push(box("kulkas", KITCHEN.x + 3.85, KITCHEN.counterZ + 0.05, 1.1, 0.78));
  out.push(box("meja-bar", BAR.x, BAR.z, 2.2, 0.9));

  // Lounge digambar sebagai satu grup yang diputar -90 derajat, jadi ukuran
  // lokalnya tertukar: lebar lokal jadi kedalaman dunia.
  out.push(box("rak-tv", LOUNGE.tvX - 0.05, LOUNGE.z, 0.5, 3.0));
  out.push(box("meja-kopi", LOUNGE.tvX - 1.55, LOUNGE.z, 0.78, 1.6));
  out.push(box("sofa", LOUNGE.sofaX, LOUNGE.z, 1.02, 3.6));

  for (let i = 0; i < BED_X.length; i++) {
    out.push(box(`nappod${i}`, BED_X[i], BED.z, BED.w, BED.len));
  }
  for (let i = 0; i < BEANBAG_SPOTS.length; i++) {
    const b = BEANBAG_SPOTS[i];
    out.push(box(`beanbag${i}`, BEANBAGS.x + b.dx, BEANBAGS.z + b.dz, 0.92, 0.92));
  }
  out.push(box("pingpong", PINGPONG.x, PINGPONG.z, 1.7, 3.05));
  out.push(box("booth", BOOTH.x, BOOTH.z, 1.5, 1.6));
  out.push(box("rak-buku", LIBRARY.x - 0.9, LIBRARY.z, 0.44, 3.0));

  return out;
}

const SOLIDS = solids();

/** Dinding luar: pejalan harus tetap di dalam kotak ini. */
export const BOUNDS = {
  x0: WALK_RADIUS,
  x1: ROOM.w - WALK_RADIUS,
  z0: WALK_RADIUS,
  z1: ROOM.d - WALK_RADIUS,
};

function inside(x: number, z: number, b: Box): boolean {
  return (
    Math.abs(x - b.x) < b.w / 2 + WALK_RADIUS && Math.abs(z - b.z) < b.d / 2 + WALK_RADIUS
  );
}

/** Ada perabot padat di titik ini? */
export function blocked(x: number, z: number): Box | null {
  for (const b of SOLIDS) if (inside(x, z, b)) return b;
  return null;
}

/** Pindah dari (x,z) sejauh (dx,dz), berhenti di perabot dan dinding.
 *
 * Tiap sumbu diuji terpisah supaya menabrak dinding menyamping jadi
 * MENGGESER, bukan mentok total. Tanpa ini, jalan menyusur dinding terasa
 * seperti nyangkut.
 */
export function move(x: number, z: number, dx: number, dz: number) {
  let nx = x;
  let nz = z;

  const coba = (cx: number, cz: number) =>
    cx >= BOUNDS.x0 && cx <= BOUNDS.x1 && cz >= BOUNDS.z0 && cz <= BOUNDS.z1 && !blocked(cx, cz);

  if (dx !== 0 && coba(nx + dx, nz)) nx += dx;
  if (dz !== 0 && coba(nx, nz + dz)) nz += dz;

  return { x: nx, z: nz };
}
