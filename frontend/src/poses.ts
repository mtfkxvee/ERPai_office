/** Rig karakter + matematika pose, dipisah dari komponen React.
 *
 * Alasannya bukan kerapian: ini supaya bisa DITES. Bug arah hadap yang bikin
 * karakter ngetik memunggungi monitor nggak ketangkep `tsc` maupun build —
 * cuma ketangkep kalau posisi sendinya dihitung di world-space dan dicocokin
 * sama posisi perabot. `npm run verify` ngelakuin itu, dan dia mustahil akurat
 * kalau rig-nya ditulis dua kali. Jadi angka-angka RIG di bawah ini yang
 * dipakai BARENG oleh AgentChar.tsx dan scripts/verify.ts.
 *
 * ARAH: karakter menghadap -z waktu rotY = 0 (muka ada di sisi -z kepala).
 * Rotasi POSITIF di sumbu x bikin anggota badan MAJU, yaitu ke -z.
 */

export const RIG = {
  hipY: 0.75,
  hipX: 0.135,
  thighLen: 0.4,
  kneeY: -0.4,
  shinLen: 0.37,
  footY: -0.4,
  footZ: -0.05,

  shoulderY: 1.5,
  shoulderX: 0.375,
  upperArmLen: 0.38,
  elbowY: -0.38,
  forearmLen: 0.36,
  handY: -0.41,

  torsoY: 1.12,
  headY: 1.75,
  headSize: 0.5,
  /** Permukaan muka, relatif pusat kepala. Negatif = sisi depan. */
  faceZ: -0.251,
};

/** Maju = +PI/2 di sumbu x. */
export const FWD = Math.PI / 2;

/** Tinggi pinggul saat nempel dudukan. */
export const DESK_SEAT = 0.545;
export const SOFA_SEAT = 0.625;

export type Joints = {
  y: number;
  lean: number;
  recline: number;
  hipL: number;
  hipR: number;
  kneeL: number;
  kneeR: number;
  shL: number;
  shR: number;
  elL: number;
  elR: number;
  headZ: number;
  headX: number;
};

export const ZERO_JOINTS: Joints = {
  y: 0,
  lean: 0,
  recline: 0,
  hipL: 0,
  hipR: 0,
  kneeL: 0,
  kneeR: 0,
  shL: 0,
  shR: 0,
  elL: 0,
  elR: 0,
  headZ: 0,
  headX: 0,
};

export type Posture = "desk" | "sofa" | "bed" | "stand";

/** Sudut sendi yang dituju untuk sebuah pose. `t` dalam detik, buat animasi.
 * Fungsi murni — nggak nyentuh three.js, nggak nyentuh DOM. */
export function poseJoints(
  pose: string,
  posture: Posture,
  walking: boolean,
  t: number,
  matTop: number,
): { joints: Joints; shake: number } {
  const j: Joints = { ...ZERO_JOINTS };
  let shake = 0;

  if (walking) {
    const s = Math.sin(t * 8.5);
    j.hipL = s * 0.6;
    j.hipR = -s * 0.6;
    j.kneeL = -(0.2 + Math.max(0, s) * 0.5);
    j.kneeR = -(0.2 + Math.max(0, -s) * 0.5);
    j.shL = s * 0.5;
    j.shR = -s * 0.5;
    j.elL = 0.3;
    j.elR = 0.3;
    j.y = Math.abs(s) * 0.04;
    return { joints: j, shake };
  }

  if (posture === "desk") {
    j.y = DESK_SEAT - RIG.hipY;
    j.hipL = j.hipR = FWD - 0.08;
    j.kneeL = j.kneeR = -FWD + 0.12;
    if (pose === "working") {
      j.shL = j.shR = 0.68;
      j.elL = j.elR = 0.6 + Math.sin(t * 15) * 0.09;
      j.headX = 0.14;
      j.lean = 0.06;
    } else {
      // done: tangan ngangkat
      j.shL = j.shR = 2.5;
      j.elL = j.elR = 0.4;
      j.y += Math.max(0, Math.sin(t * 6)) * 0.07;
    }
    return { joints: j, shake };
  }

  if (posture === "sofa") {
    // nyender, kaki agak nyelonjor, dua tangan megang stik
    j.y = SOFA_SEAT - RIG.hipY;
    j.recline = -0.14;
    j.hipL = j.hipR = FWD - 0.22;
    j.kneeL = -FWD + 0.46;
    j.kneeR = -FWD + 0.38;
    j.shL = j.shR = 0.5;
    j.elL = 1.24 + Math.sin(t * 11) * 0.05;
    j.elR = 1.24 + Math.sin(t * 11 + 1.4) * 0.05;
    j.headX = 0.07;
    return { joints: j, shake };
  }

  if (posture === "bed") {
    // Badan diputar 90 derajat di sumbu x: kepala ke arah +z (sisi bantal).
    j.recline = FWD;
    j.y = matTop + 0.15 + Math.sin(t * 1.1) * 0.012;
    j.shL = j.shR = 0.06;
    j.elL = j.elR = 0.12;
    j.headZ = 0.12;
    return { joints: j, shake };
  }

  switch (pose) {
    case "thinking":
      // tangan kanan nunjuk whiteboard
      j.shR = 1.6;
      j.elR = 0.1;
      j.shL = 0.15;
      j.elL = 1.3;
      j.headZ = Math.sin(t * 1.5) * 0.16;
      break;
    case "blocked":
      j.shL = j.shR = 2.35;
      j.elL = j.elR = 0.9;
      shake = Math.sin(t * 15) * 0.03;
      break;
    case "error":
      j.shL = j.shR = 2.8;
      j.elL = j.elR = 1.1;
      shake = Math.sin(t * 25) * 0.06;
      break;
    default:
      // idle di micro-kitchen: napas, tangan kanan megang cangkir
      j.y = Math.sin(t * 2.2) * 0.03;
      j.shL = j.shR = 0.18;
      j.elL = j.elR = 1.5;
      j.headZ = Math.sin(t * 0.8) * 0.06;
  }
  return { joints: j, shake };
}
