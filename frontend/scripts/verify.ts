/** Verifikasi geometri pose karakter, tanpa browser.
 *
 * Kenapa ini ada: pernah ada bug di mana karakter "duduk kerja" sebenernya
 * menghadap MENJAUH dari monitor, dan lengannya ngayun ke belakang. `tsc` lolos,
 * `vite build` lolos, dan dari kamera orbit yang jauh itu kelihatan wajar. Satu-
 * satunya cara nangkep yang kayak gitu tanpa mata: bangun hierarki transform-nya
 * beneran, hitung posisi sendi di world-space, lalu cocokin sama posisi perabot.
 *
 * Rig dan matematika pose-nya diimpor dari src/poses.ts — file yang sama yang
 * dipakai AgentChar.tsx buat ngerender. Jadi tes ini nggak bisa "benar" sambil
 * render-nya salah.
 *
 * Jalanin: npm run verify
 */

import * as THREE from "three";
import {
  BEANBAG_SPOTS,
  beanbagSpot,
  CAPACITY,
  BED,
  bedSpot,
  CHAIR,
  chairPos,
  DESK,
  DESK_COUNT,
  DESK_LOCAL,
  DESKS,
  DOOR,
  LOUNGE,
  PARTITION,
  PINGPONG,
  pingpongSpot,
  postureFor,
  psSeat,
  readingSpot,
  RELAX_X0,
  ROOM,
  RUNNER,
  routeTo,
  SEAT_Y,
  targetFor,
  WHITEBOARD,
  ZONES,
} from "../src/layout.ts";
import { DESK_SEAT, facingFor, poseJoints, RIG } from "../src/poses.ts";
import { LEISURE_POSES } from "../src/types.ts";
import { blocked, move, solids } from "../src/collide.ts";
import { resolvePoses } from "../src/store.ts";

/* ---------------------------------------------------------------- */
/* Rig: hierarki yang sama persis dengan JSX di AgentChar.tsx        */
/* ---------------------------------------------------------------- */

type Rig = {
  root: THREE.Object3D;
  body: THREE.Object3D;
  hinge: THREE.Object3D;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  face: THREE.Object3D;
  faceAhead: THREE.Object3D;
  shoulder: Record<"L" | "R", THREE.Object3D>;
  elbow: Record<"L" | "R", THREE.Object3D>;
  hand: Record<"L" | "R", THREE.Object3D>;
  hip: Record<"L" | "R", THREE.Object3D>;
  knee: Record<"L" | "R", THREE.Object3D>;
  foot: Record<"L" | "R", THREE.Object3D>;
};

function node(parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function buildRig(): Rig {
  const root = new THREE.Object3D();
  const body = node(root);
  // Engsel di ketinggian pinggul, isinya digeser balik — persis seperti
  // AgentChar.tsx. Kalau tidak sama, tes mengukur rig yang berbeda dari yang
  // dirender dan hasilnya tidak berarti apa-apa.
  const hinge = node(body, 0, RIG.hipY, 0);
  const core = node(hinge, 0, -RIG.hipY, 0);
  const torso = node(core);

  const head = node(torso, 0, RIG.headY, 0);
  const face = node(head, 0, 0.035, RIG.faceZ);
  // Titik 0.6 unit di depan muka: dipakai buat ngetes arah pandang.
  const faceAhead = node(head, 0, 0.035, RIG.faceZ - 0.6);

  const shoulder = {} as Rig["shoulder"];
  const elbow = {} as Rig["elbow"];
  const hand = {} as Rig["hand"];
  const hip = {} as Rig["hip"];
  const knee = {} as Rig["knee"];
  const foot = {} as Rig["foot"];

  for (const [k, side] of [
    ["L", -1],
    ["R", 1],
  ] as const) {
    shoulder[k] = node(torso, RIG.shoulderX * side, RIG.shoulderY, 0);
    elbow[k] = node(shoulder[k], 0, RIG.elbowY, 0);
    hand[k] = node(elbow[k], 0, RIG.handY, 0);
    hip[k] = node(body, RIG.hipX * side, RIG.hipY, 0);
    knee[k] = node(hip[k], 0, RIG.kneeY, 0);
    foot[k] = node(knee[k], 0, RIG.footY, RIG.footZ);
  }

  return { root, body, hinge, torso, head, face, faceAhead, shoulder, elbow, hand, hip, knee, foot };
}

/** Taruh karakter sesuai pose, lalu hitung semua matriks world. */
function apply(rig: Rig, pose: string, deskIndex: number, t = 0.37) {
  const goal = targetFor(pose, deskIndex);
  const posture = postureFor(pose);
  const { joints } = poseJoints(
    pose, posture, false, t, BED.matTop,
    (goal as { seatY?: number }).seatY,
  );

  rig.root.position.set(goal.x, joints.y, goal.z);
  rig.body.rotation.order = "YXZ";
  rig.body.rotation.set(joints.lying, goal.rotY, 0);
  rig.hinge.rotation.x = joints.recline;
  rig.torso.rotation.x = joints.lean;
  rig.head.rotation.set(joints.headX, 0, joints.headZ);
  rig.shoulder.L.rotation.x = joints.shL;
  rig.shoulder.R.rotation.x = joints.shR;
  rig.elbow.L.rotation.x = joints.elL;
  rig.elbow.R.rotation.x = joints.elR;
  rig.hip.L.rotation.x = joints.hipL;
  rig.hip.R.rotation.x = joints.hipR;
  rig.knee.L.rotation.x = joints.kneeL;
  rig.knee.R.rotation.x = joints.kneeR;

  rig.root.updateMatrixWorld(true);
  return goal;
}

const wp = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

/* ---------------------------------------------------------------- */

let failed = 0;
let passed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Inti tesnya: apakah menghadap ke arah benda itu? Titik di depan muka harus
 * lebih dekat ke benda daripada mukanya sendiri. */
function facesToward(rig: Rig, thing: THREE.Vector3, name: string) {
  const f = wp(rig.face);
  const a = wp(rig.faceAhead);
  const dFace = f.distanceTo(thing);
  const dAhead = a.distanceTo(thing);
  check(
    `menghadap ${name}`,
    dAhead < dFace,
    `jarak muka ${dFace.toFixed(2)} vs sejengkal di depan ${dAhead.toFixed(2)} (harus mengecil)`,
  );
}

const rig = buildRig();

/* ---- 1. kerja di meja ------------------------------------------- */
console.log("\nkerja di meja (desk 0)");
{
  apply(rig, "working", 0);
  const d = DESKS[0];
  // Posisi perabot dihitung dari offset yang SAMA yang dipakai props.tsx.
  const monitor = new THREE.Vector3(
    d.x + DESK_LOCAL.monitor.x,
    DESK.topY + 0.63,
    d.z + DESK_LOCAL.monitor.z,
  );
  const keyboard = new THREE.Vector3(
    d.x + DESK_LOCAL.keyboard.x,
    DESK.topY + 0.015,
    d.z + DESK_LOCAL.keyboard.z,
  );

  facesToward(rig, monitor, "monitor");

  const hand = wp(rig.hand.R);
  check(
    "tangan di atas keyboard",
    Math.abs(hand.y - keyboard.y) < 0.4 && hand.z > d.z && hand.z < chairPos(0).z,
    `tangan y=${hand.y.toFixed(2)} z=${hand.z.toFixed(2)}; keyboard y=${keyboard.y.toFixed(2)} z=${keyboard.z.toFixed(2)}`,
  );

  const foot = wp(rig.foot.R);
  check(
    "kaki masuk kolong meja",
    foot.z < d.z + DESK.d / 2 + 0.2 && foot.y < 0.35,
    `kaki z=${foot.z.toFixed(2)} (batas ${(d.z + DESK.d / 2 + 0.2).toFixed(2)}) y=${foot.y.toFixed(2)}`,
  );

  const head = wp(rig.head);
  check(
    "kepala di atas tinggi meja",
    head.y > DESK.topY + 0.3,
    `kepala y=${head.y.toFixed(2)}`,
  );
}

/* ---- 1b. kursi ketemu sama yang duduk --------------------------- */
console.log("\nkursi vs orang yang duduk");
{
  apply(rig, "working", 0);
  const hip = wp(rig.hip.R);
  const seat = chairPos(0);
  const seatTop = CHAIR.seatY + CHAIR.seatT / 2;

  check(
    "kursi sebidang sama pinggul",
    Math.abs(hip.x - seat.x) < 0.3 && Math.abs(hip.z - seat.z) < 0.3,
    `pinggul (${hip.x.toFixed(2)}, ${hip.z.toFixed(2)}) vs kursi (${seat.x}, ${seat.z})`,
  );
  check(
    "tinggi dudukan pas sama pose duduk",
    Math.abs(seatTop - DESK_SEAT) < 0.02,
    `dudukan ${seatTop.toFixed(3)} vs DESK_SEAT ${DESK_SEAT}`,
  );
  check(
    "sandaran ada di belakang orangnya",
    seat.z + CHAIR.backZ > hip.z,
    `sandaran z=${(seat.z + CHAIR.backZ).toFixed(2)}, pinggul z=${hip.z.toFixed(2)}`,
  );
  // Kursi dan tujuan jalan harus sumber yang sama. Kalau salah satu pindah ke
  // koordinat yang lain, selisih ini langsung kebuka.
  const target = targetFor("working", 0);
  check(
    "kursi dan tujuan jalan satu titik",
    seat.x === target.x && seat.z === target.z,
    `kursi (${seat.x}, ${seat.z}) vs tujuan (${target.x}, ${target.z})`,
  );
  let allAligned = true;
  for (let i = 0; i < DESK_COUNT; i++) {
    const c = chairPos(i);
    const dd = DESKS[i];
    if (Math.abs(c.x - (dd.x + DESK_LOCAL.chair.x)) > 1e-9) allAligned = false;
    if (Math.abs(c.z - (dd.z + DESK_LOCAL.chair.z)) > 1e-9) allAligned = false;
  }
  check("semua kursi nempel mejanya masing-masing", allAligned);
}

/* ---- 1c. arah jalan --------------------------------------------- */
console.log("\narah jalan");
{
  const dirs: [string, number, number][] = [
    ["ke +x (kanan)", 1, 0],
    ["ke -x (kiri)", -1, 0],
    ["ke +z (depan)", 0, 1],
    ["ke -z (belakang)", 0, -1],
    ["diagonal", 0.7, -0.7],
  ];
  for (const [name, dx, dz] of dirs) {
    const { joints } = poseJoints("idle", "stand", true, 0.37, BED.matTop);
    rig.root.position.set(10, joints.y, 10);
    rig.body.rotation.set(0, facingFor(dx, dz), 0);
    rig.torso.rotation.x = 0;
    rig.head.rotation.set(0, 0, 0);
    rig.root.updateMatrixWorld(true);

    const forward = wp(rig.faceAhead).sub(wp(rig.face)).setY(0).normalize();
    const want = new THREE.Vector3(dx, 0, dz).normalize();
    const dot = forward.dot(want);
    check(
      `jalan maju ${name}`,
      dot > 0.97,
      `dot=${dot.toFixed(3)} (negatif = mundur); hadap (${forward.x.toFixed(2)}, ${forward.z.toFixed(2)}) vs gerak (${want.x.toFixed(2)}, ${want.z.toFixed(2)})`,
    );
  }
}

/* ---- 2. tidur di nap pod ---------------------------------------- */
console.log("\ntidur di nap pod (bed 0)");
{
  apply(rig, "sleeping", 0);
  const spot = bedSpot(0);
  const pillowZ = BED.z + BED.len / 2 - 0.42;
  const head = wp(rig.head);
  const foot = wp(rig.foot.R);

  check(
    "kepala mendarat di bantal",
    Math.abs(head.z - pillowZ) < 0.5,
    `kepala z=${head.z.toFixed(2)} vs bantal z=${pillowZ.toFixed(2)}`,
  );
  check(
    "kepala setinggi kasur",
    head.y > BED.matTop - 0.1 && head.y < BED.matTop + 0.6,
    `kepala y=${head.y.toFixed(2)}, atas kasur=${BED.matTop}`,
  );
  check(
    "badan rebahan, bukan berdiri",
    Math.abs(head.y - foot.y) < 0.45 && head.z - foot.z > 1.2,
    `selisih tinggi ${Math.abs(head.y - foot.y).toFixed(2)}, panjang ${(head.z - foot.z).toFixed(2)}`,
  );
  check(
    "kaki masih di dalam ranjang",
    foot.z > BED.z - BED.len / 2 - 0.3,
    `kaki z=${foot.z.toFixed(2)}, ujung ranjang=${(BED.z - BED.len / 2).toFixed(2)}`,
  );
  check("posisi tidur di ruang santai", spot.x > RELAX_X0);
}

/* ---- 3. main PS di sofa ----------------------------------------- */
console.log("\nmain PS di sofa (seat 0)");
{
  apply(rig, "gaming", 0);
  const seat = psSeat(0);
  const tv = new THREE.Vector3(LOUNGE.tvX, 1.55, LOUNGE.z);
  facesToward(rig, tv, "TV");
  check(
    "duduk, bukan berdiri",
    wp(rig.hip.R).y < RIG.hipY - 0.05,
    `pinggul y=${wp(rig.hip.R).y.toFixed(2)} (berdiri = ${RIG.hipY})`,
  );
  check("sofa ada di ruang santai", seat.x > RELAX_X0);
}

/* ---- 4. mikir di whiteboard ------------------------------------- */
console.log("\nmikir di whiteboard");
{
  apply(rig, "thinking", 0);
  const board = new THREE.Vector3(0.19, 2.15, WHITEBOARD.z);
  facesToward(rig, board, "whiteboard");
  const handR = wp(rig.hand.R);
  check(
    "tangan kanan terangkat (nunjuk)",
    handR.y > RIG.shoulderY - 0.3,
    `tangan y=${handR.y.toFixed(2)}, pundak y=${RIG.shoulderY}`,
  );
}

/* ---- 5. idle di micro-kitchen ----------------------------------- */
console.log("\nidle di micro-kitchen");
{
  apply(rig, "idle", 0);
  const counter = new THREE.Vector3(ZONES.kitchen.x, 0.95, 1.1);
  facesToward(rig, counter, "meja dapur");
  check("micro-kitchen di ruang santai", ZONES.kitchen.x > RELAX_X0);
}

/* ---- 6. ketahan di zona bug ------------------------------------- */
console.log("\nketahan di zona bug");
{
  apply(rig, "blocked", 0);
  const sign = new THREE.Vector3(22.1, 1.12, 1.7);
  facesToward(rig, sign, "papan peringatan");
  check(
    "dua tangan terangkat",
    wp(rig.hand.L).y > RIG.shoulderY && wp(rig.hand.R).y > RIG.shoulderY,
    `tangan y=${wp(rig.hand.R).y.toFixed(2)}, pundak y=${RIG.shoulderY}`,
  );
  check("zona bug di ruang kerja", ZONES.bug.x < PARTITION.x);
}

/* ---- 7. rute lewat pintu ---------------------------------------- */
console.log("\nrute antar ruangan");
{
  const toRelax = routeTo(5, 5, ZONES.kitchen);
  check("kerja -> santai mampir pintu", toRelax.length === 3, `dapat ${toRelax.length} titik`);
  check(
    "titik pintu urut kiri lalu kanan",
    toRelax[0].x === DOOR.xNear && toRelax[1].x === DOOR.xFar,
    `${toRelax[0].x} lalu ${toRelax[1].x}`,
  );
  check(
    "titik pintu sejajar bukaan",
    toRelax[0].z === DOOR.z && toRelax[1].z === DOOR.z,
  );
  check(
    "titik pintu ada di dalam bukaan",
    DOOR.z > PARTITION.doorZ0 && DOOR.z < PARTITION.doorZ1,
  );

  const toWork = routeTo(28, 3, chairPos(0));
  check("santai -> kerja mampir pintu", toWork.length === 3, `dapat ${toWork.length} titik`);
  check(
    "arah baliknya kanan lalu kiri",
    toWork[0].x === DOOR.xFar && toWork[1].x === DOOR.xNear,
  );

  const sameRoom = routeTo(5, 5, chairPos(3));
  check("dalam satu ruangan tanpa mampir", sameRoom.length === 1);
}

/* ---- 7b. tempat santai ------------------------------------------ */
console.log("\ntempat santai (buat agent yang lama nggak ada kabar)");
{
  // Tinggi dudukan harus pas sama perabotnya, kalau nggak karakternya ngambang
  // atau nyusup. Angka perabot diambil dari relax.tsx.
  check("sofa: dudukan 0.54 + tebal 0.17/2 = 0.625", SEAT_Y.sofa, 0.54 + 0.17 / 2);
  check("kursi baca: dudukan 0.56 + tebal 0.16/2 = 0.64", SEAT_Y.armchair, 0.56 + 0.16 / 2);
  // Bean bag itu TENGGELAM, bukan nangkring: pinggul harus di BAWAH permukaan
  // bantalan (0.34), tapi jelas di atas lantai.
  check(
    "bean bag: pinggul tenggelam di bawah permukaan bantalan (0.34)",
    SEAT_Y.beanbag > 0.12 && SEAT_Y.beanbag < 0.34,
    `seatY=${SEAT_Y.beanbag}`,
  );

  // Yang membedakan bean bag dari kursi: lutut lebih TINGGI dari pinggul.
  {
    apply(rig, "lounging", 0);
    const pinggul = wp(rig.hip.R);
    const lutut = wp(rig.knee.R);
    const kaki = wp(rig.foot.R);
    check(
      "bean bag: lutut lebih tinggi dari pinggul",
      lutut.y > pinggul.y,
      `lutut y=${lutut.y.toFixed(3)} vs pinggul y=${pinggul.y.toFixed(3)}`,
    );
    check(
      "bean bag: telapak kaki nyaris menyentuh lantai",
      kaki.y > -0.05 && kaki.y < 0.3,
      `kaki y=${kaki.y.toFixed(3)}`,
    );
    const kepala = wp(rig.head);
    check(
      "bean bag: kepala tidak tenggelam di bawah bantalan",
      kepala.y > 0.6,
      `kepala y=${kepala.y.toFixed(3)}`,
    );
  }

  // Karakter harus menghadap SEARAH bean bag-nya, bukan membelakangi sandaran.
  let hadap = true;
  for (let i = 0; i < BEANBAG_SPOTS.length; i++) {
    if (Math.abs(beanbagSpot(i).rotY - BEANBAG_SPOTS[i].r) > 1e-9) hadap = false;
  }
  check("bean bag: putaran karakter ikut putaran bag-nya", hadap);

  // Semua titik santai harus di dalam ruang santai dan di dalam dinding.
  let didalam = true;
  let det = "";
  const titik: [string, { x: number; z: number }][] = [
    ...BEANBAG_SPOTS.map((_, i) => [`beanbag${i}`, beanbagSpot(i)] as [string, { x: number; z: number }]),
    ["kursi baca", readingSpot()],
    ["pingpong0", pingpongSpot(0)],
    ["pingpong1", pingpongSpot(1)],
  ];
  for (const [nama, p] of titik) {
    if (p.x < RELAX_X0 + 0.4 || p.x > ROOM.w - 0.4) {
      didalam = false;
      det = `${nama} x=${p.x.toFixed(2)} di luar ruang santai`;
    }
    if (p.z < 0.4 || p.z > ROOM.d - 0.4) {
      didalam = false;
      det = `${nama} z=${p.z.toFixed(2)} nembus dinding`;
    }
  }
  check("semua titik santai di dalam ruang santai", didalam, det);

  // Dua pemain ping pong harus saling berhadapan di sisi berlawanan meja.
  const a = pingpongSpot(0);
  const b = pingpongSpot(1);
  check(
    "ping pong: dua pemain berseberangan",
    (a.z - PINGPONG.z) * (b.z - PINGPONG.z) < 0,
    `z=${a.z} dan z=${b.z}, meja di z=${PINGPONG.z}`,
  );

  // Pose santai harus punya tujuan yang beda-beda, bukan numpuk satu titik.
  const tujuan = new Set(
    LEISURE_POSES.map((p, i) => {
      const t = targetFor(p, i);
      return `${t.x.toFixed(2)},${t.z.toFixed(2)}`;
    }),
  );
  check(
    "lima pose santai mendarat di lima titik berbeda",
    tujuan.size,
    LEISURE_POSES.length,
  );
}

/* ---- 7bb. arah sandaran: harus ke belakang, bukan membungkuk ----- */
console.log("\narah badan waktu duduk (menyandar, bukan membungkuk)");
{
  // Rotasi +x punya arti BERLAWANAN untuk anggota badan (menggantung ke bawah)
  // dan badan/kepala (menjulur ke atas). Semua `recline` pernah diberi nilai
  // negatif dengan maksud "menyandar", padahal hasilnya membungkuk ke depan.
  // Assert ini membandingkan posisi kepala dengan pinggul dalam arah hadap:
  // kalau menyandar, kepala harus lebih ke BELAKANG daripada pinggul.
  const sandar = (pose: string, nama: string, minimal: number) => {
    apply(rig, pose, 0);
    const kepala = wp(rig.head);
    const pinggul = wp(rig.hip.R);
    // Vektor "ke belakang" = kebalikan arah hadap, diambil dari rig itu sendiri.
    const hadap = wp(rig.faceAhead).sub(wp(rig.face)).setY(0).normalize();
    const mundur = kepala.clone().sub(pinggul).setY(0).dot(hadap.negate());
    check(
      `${nama}: kepala di belakang pinggul`,
      mundur > minimal,
      `selisih ${mundur.toFixed(3)} (negatif = membungkuk ke depan)`,
    );
  };

  sandar("lounging", "bean bag", 0.1);
  sandar("gaming", "sofa", 0.03);
  sandar("reading", "kursi baca", 0.0);

  // Kerja di meja justru HARUS condong ke depan, ke arah keyboard.
  {
    apply(rig, "working", 0);
    const kepala = wp(rig.head);
    const pinggul = wp(rig.hip.R);
    const hadap = wp(rig.faceAhead).sub(wp(rig.face)).setY(0).normalize();
    const maju = kepala.clone().sub(pinggul).setY(0).dot(hadap);
    check(
      "meja kerja: badan condong ke depan",
      maju > 0,
      `selisih ${maju.toFixed(3)} (negatif = menyandar menjauhi monitor)`,
    );
  }
}

/* ---- 7c. pembagian tempat: tidak boleh ada yang tindih ----------- */
console.log("\npembagian tempat (jangan ada karakter tumpuk)");
{
  const agen = (n: number, idleDetik: number) =>
    Array.from({ length: n }, (_, i) => ({
      agent: `agent-${String(i).padStart(2, "0")}`,
      desk_index: i,
      state: "idle" as const,
      seen: Date.now() - idleDetik * 1000,
      tool: null,
      detail: null,
      color: null,
    }));

  const titik = (p: { pose: string; slot: number }) => {
    const t = targetFor(p.pose as never, p.slot);
    return `${t.x.toFixed(2)},${t.z.toFixed(2)}`;
  };

  for (const n of [1, 2, 3, 5, 7, 12, 13]) {
    const map = resolvePoses(agen(n, 600), Date.now());
    const titikDipakai = [...map.values()].map(titik);
    const unik = new Set(titikDipakai);
    check(
      `${String(n).padStart(2)} agent nganggur -> ${unik.size} titik berbeda`,
      unik.size === n,
      `ada ${n - unik.size} karakter yang tumpuk`,
    );
  }

  // Kapasitas tiap zona tidak boleh dilampaui.
  let muat = true;
  let det = "";
  for (const n of [5, 9, 13, 20]) {
    const map = resolvePoses(agen(n, 600), Date.now());
    const hitung: Record<string, number> = {};
    for (const p of map.values()) hitung[p.pose] = (hitung[p.pose] ?? 0) + 1;
    for (const [pose, jml] of Object.entries(hitung)) {
      const kap = CAPACITY[pose];
      if (kap && jml > kap && pose !== "idle") {
        muat = false;
        det = `${n} agent: ${pose} diisi ${jml}, kapasitas ${kap}`;
      }
    }
  }
  check("kapasitas tiap zona tidak dilampaui", muat, det);

  // Ping pong harus 0 atau 2, tidak pernah 1.
  let pp = true;
  let ppDet = "";
  for (let n = 1; n <= 14; n++) {
    const map = resolvePoses(agen(n, 600), Date.now());
    const jml = [...map.values()].filter((p) => p.pose === "pingpong").length;
    if (jml === 1) {
      pp = false;
      ppDet = `${n} agent -> 1 orang main ping pong sendirian`;
    }
  }
  check("ping pong selalu 0 atau 2 orang, tidak pernah 1", pp, ppDet);

  // Agent yang baru nganggur tetap di pantry, dan juga tidak tumpuk.
  {
    const map = resolvePoses(agen(3, 10), Date.now());
    const semuaPantry = [...map.values()].every((p) => p.pose === "idle");
    const unik = new Set([...map.values()].map(titik));
    check("baru nganggur (10 dtk) -> pantry semua", semuaPantry);
    check("tiga orang di pantry berdiri terpisah", unik.size, 3);
  }

  // Pembagian harus stabil: urutan data dari server tidak boleh mengubahnya.
  {
    const a = agen(7, 600);
    const m1 = resolvePoses(a, Date.now());
    const m2 = resolvePoses([...a].reverse(), Date.now());
    const sama = [...m1.entries()].every(
      ([k, v]) => m2.get(k)?.pose === v.pose && m2.get(k)?.slot === v.slot,
    );
    check("urutan data dibalik -> pembagian tetap sama", sama);
  }
}

/* ---- 7d. mode jalan: tabrakan ----------------------------------- */
console.log("\nmode jalan (POV karakter)");
{
  /** Coba jalan dari A ke B langkah demi langkah; balikin posisi akhirnya. */
  const jalan = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    langkah = 400,
  ) => {
    let x = x0;
    let z = z0;
    for (let i = 0; i < langkah; i++) {
      const dx = x1 - x;
      const dz = z1 - z;
      const sisa = Math.hypot(dx, dz);
      if (sisa < 0.05) break;
      const s = Math.min(0.05, sisa);
      const n = move(x, z, (dx / sisa) * s, (dz / sisa) * s);
      if (Math.abs(n.x - x) < 1e-9 && Math.abs(n.z - z) < 1e-9) break; // mentok
      x = n.x;
      z = n.z;
    }
    return { x, z, sampai: Math.hypot(x1 - x, z1 - z) < 0.3 };
  };

  // Tidak boleh bisa berdiri di dalam perabot.
  let didalam = "";
  for (const b of solids()) {
    if (!blocked(b.x, b.z)) didalam = b.label;
  }
  check("semua perabot padat memang memblokir", didalam === "", `${didalam} tidak memblokir`);

  // Tidak boleh keluar ruangan.
  const keluar = jalan(5, 5, -20, 5);
  check("tidak bisa menembus dinding kiri", keluar.x > 0, `berhenti di x=${keluar.x.toFixed(2)}`);
  const keluar2 = jalan(5, 5, 5, 60);
  check("tidak bisa menembus dinding depan", keluar2.z < ROOM.d, `berhenti di z=${keluar2.z.toFixed(2)}`);

  // Sekat harus memblokir, KECUALI di bukaan pintunya.
  const tembusSekat = jalan(20, 3, 30, 3);
  check(
    "sekat memblokir di luar pintu",
    tembusSekat.x < PARTITION.x,
    `tembus sampai x=${tembusSekat.x.toFixed(2)}`,
  );
  const lewatPintu = jalan(21, DOOR.z, 27, DOOR.z);
  check(
    "pintu bisa dilewati",
    lewatPintu.sampai,
    `berhenti di x=${lewatPintu.x.toFixed(2)}, z=${lewatPintu.z.toFixed(2)}`,
  );

  // Meja harus memblokir, tapi lorong di antara dua baris meja harus lowong.
  const kemeja = jalan(DESKS[0].x, DESKS[0].z + 3, DESKS[0].x, DESKS[0].z);
  check(
    "tidak bisa berdiri di dalam meja",
    !blocked(kemeja.x, kemeja.z),
    `berhenti di dalam perabot`,
  );
  const lorong = jalan(2.5, RUNNER.z + 0.6, 22, RUNNER.z + 0.6);
  check("lorong tengah ruang kerja bisa dilalui", lorong.sampai, `berhenti di x=${lorong.x.toFixed(2)}`);

  // Menyusur dinding harus MENGGESER, bukan mentok.
  {
    const n = move(0.5, 5, -1, 0.5);
    check(
      "menabrak dinding menyamping tetap bisa geser",
      Math.abs(n.z - 5.5) < 1e-6,
      `z bergerak ${(n.z - 5).toFixed(3)} dari 0.5 yang diminta`,
    );
  }

  // Titik tempat karakter berdiri/duduk tidak boleh berada di dalam perabot
  // padat — kalau iya, begitu keluar dari mode jalan dia terjebak.
  let terjebak = "";
  for (let i = 0; i < DESK_COUNT; i++) {
    const c = chairPos(i);
    if (blocked(c.x, c.z)) terjebak = `kursi meja ${i}`;
  }
  check("titik duduk di meja tidak terjebak di dalam perabot", terjebak === "", terjebak);
}

/* ---- 8. tata letak masuk ruangan -------------------------------- */
console.log("\ntata letak");
{
  let allIn = true;
  let detail = "";
  for (let i = 0; i < DESK_COUNT; i++) {
    const d = DESKS[i];
    if (d.x + DESK.w / 2 > PARTITION.x - 0.2) {
      allIn = false;
      detail = `meja ${i} nembus sekat`;
    }
    const c = chairPos(i);
    if (c.z + 0.8 > ROOM.d || c.z < 0.5) {
      allIn = false;
      detail = `kursi ${i} nembus dinding`;
    }
  }
  check("semua meja & kursi di dalam ruang kerja", allIn, detail);

  let relaxOk = true;
  for (let i = 0; i < 3; i++) {
    if (psSeat(i).x < RELAX_X0 || bedSpot(i).x < RELAX_X0) relaxOk = false;
    if (bedSpot(i).z + 2.1 > ROOM.d) relaxOk = false;
  }
  check("sofa & nap pod di dalam ruang santai", relaxOk);
}

/* ---------------------------------------------------------------- */

console.log(`\n${passed} lolos, ${failed} gagal`);
process.exit(failed > 0 ? 1 : 0);
