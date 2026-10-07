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

/** Maju = +PI/2 di sumbu x, UNTUK ANGGOTA BADAN.
 *
 * HATI-HATI, tandanya berlawanan antara anggota badan dan badan/kepala:
 *
 *   Lengan & paha menggantung ke BAWAH (mesh-nya di -y). Rotasi +x memutar
 *   ujungnya ke -z, yaitu ke arah hadap -> +x = MAJU.
 *
 *   Badan & kepala menjulur ke ATAS (+y). Rotasi +x memutar ujung atasnya ke
 *   +z, menjauh dari arah hadap -> +x = MENYANDAR KE BELAKANG / dagu naik.
 *
 * Tanda yang sama, hasil yang berlawanan, semata-mata karena yang satu
 * mengarah ke bawah dan yang satu ke atas. Ini sudah salah sekali: semua
 * `recline` diberi nilai negatif dengan maksud "menyandar", padahal yang
 * terjadi badannya membungkuk ke depan. `npm run verify` sekarang mengunci
 * arahnya. */
export const FWD = Math.PI / 2;

/** Rotasi y supaya karakter MENGHADAP arah (dx, dz).
 *
 * Muka ada di sisi -z, jadi vektor maju pada rotasi t adalah
 * (-sin t, 0, -cos t). Biar itu searah (dx, dz):
 *   -sin t = dx  dan  -cos t = dz   ->   t = atan2(-dx, -dz)
 *
 * Dulu di sini kepakai atan2(dx, dz), yang bikin vektor majunya jadi
 * (-dx, -dz) — tepat berlawanan, jadi karakternya jalan mundur. */
export function facingFor(dx: number, dz: number) {
  return Math.atan2(-dx, -dz);
}

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
  /** Tinggi permukaan dudukan. Sofa, bean bag, dan kursi baca beda-beda —
   * kalau dipukul rata, karakternya ngambang atau nyusup ke perabotnya. */
  seatY: number = SOFA_SEAT,
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
      j.headX = -0.16;
      j.lean = -0.12;
    } else {
      // done: tangan ngangkat
      j.shL = j.shR = 2.5;
      j.elL = j.elR = 0.4;
      j.y += Math.max(0, Math.sin(t * 6)) * 0.07;
    }
    return { joints: j, shake };
  }

  if (posture === "sofa") {
    // Duduk di permukaan apa pun: sofa, bean bag, atau kursi baca.
    j.y = seatY - RIG.hipY;
    j.hipL = j.hipR = FWD - 0.22;
    j.kneeL = -FWD + 0.46;
    j.kneeR = -FWD + 0.38;

    if (pose === "lounging") {
      // bean bag: paling nyender, kaki paling nyelonjor, tangan di belakang
      j.recline = 0.34;
      j.hipL = j.hipR = FWD - 0.42;
      j.kneeL = -FWD + 0.72;
      j.kneeR = -FWD + 0.64;
      j.shL = j.shR = -0.5;
      j.elL = j.elR = 0.25;
      j.headX = -0.1;
      j.y += Math.sin(t * 1.4) * 0.012;
    } else if (pose === "reading") {
      // kursi baca: tegak, dua tangan megang buku di depan dada
      j.recline = 0.07;
      j.shL = j.shR = 0.62;
      j.elL = j.elR = 1.05;
      j.headX = -0.22;
      j.y += Math.sin(t * 1.6) * 0.008;
    } else {
      // gaming: nyender, dua tangan megang stik, jempol gerak
      j.recline = 0.16;
      j.shL = j.shR = 0.5;
      j.elL = 1.24 + Math.sin(t * 11) * 0.05;
      j.elR = 1.24 + Math.sin(t * 11 + 1.4) * 0.05;
      j.headX = -0.05;
    }
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

  if (pose === "pingpong") {
    // berdiri di ujung meja, satu tangan megang bet dan mengayun
    const swing = Math.sin(t * 3.2);
    j.shR = 0.9 + swing * 0.55;
    j.elR = 0.7 - swing * 0.3;
    j.shL = 0.2;
    j.elL = 0.5;
    j.hipL = 0.12;
    j.hipR = -0.12;
    j.kneeL = j.kneeR = -0.18;
    j.lean = 0.1;
    j.y = Math.abs(swing) * 0.03;
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
