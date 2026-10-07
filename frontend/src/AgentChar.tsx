import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { BED, postureFor, routeTo, targetFor } from "./layout";
import { facingFor, poseJoints, RIG, ZERO_JOINTS, type Joints } from "./poses";
import { colorOf, idleText, nameOf, type Placement } from "./store";
import type { Agent, Pose } from "./types";

const SKIN = "#d9a06b";
const HAIR = "#2b2320";
const TROUSERS = "#39414f";
const SHOE = "#23262b";
const WALK_SPEED = 2.6;

const STATE_LABEL: Record<Pose, { text: string; color: string }> = {
  idle: { text: "idle", color: "#c3c8d0" },
  gaming: { text: "main PS", color: "#b388ff" },
  sleeping: { text: "tidur", color: "#7a8699" },
  lounging: { text: "leyeh-leyeh", color: "#9aa7bd" },
  reading: { text: "baca", color: "#a3b58c" },
  pingpong: { text: "ping pong", color: "#8fc4d6" },
  thinking: { text: "mikir", color: "#ffd166" },
  working: { text: "kerja", color: "#8ee07a" },
  blocked: { text: "ketahan", color: "#f0932b" },
  error: { text: "error", color: "#ff6b5e" },
  done: { text: "kelar", color: "#5ad7e0" },
};

/** Karakter bersendi (lutut & siku) yang bisa duduk, main PS, dan rebahan.
 * Angka rig-nya dari poses.ts, dipakai bareng sama `npm run verify`. */
export function AgentChar({ agent, placement }: { agent: Agent; placement: Placement }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const labelAnchor = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const hipL = useRef<THREE.Group>(null);
  const hipR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const shoulderL = useRef<THREE.Group>(null);
  const shoulderR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const heldMug = useRef<THREE.Group>(null);
  const pad = useRef<THREE.Group>(null);

  const shirt = colorOf(agent);
  const spawn = targetFor(placement.pose, placement.slot);
  const pos = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  const cur = useRef<Joints>({ ...ZERO_JOINTS });
  // Rute yang sedang dijalanin. Isinya >1 titik kalau harus lewat pintu.
  const path = useRef<{ x: number; z: number }[]>([]);
  const lastGoal = useRef("");

  useFrame((_, dtRaw) => {
    const g = root.current;
    if (!g || !body.current) return;
    // Clamp dt: kalau tab-nya sempet ke-background, jangan sampai karakter
    // teleport gara-gara delta raksasa.
    const dt = Math.min(dtRaw, 0.1);
    const t = performance.now() / 1000;

    // Pose & tempat duduk ditentukan resolvePoses() untuk semua agent
    // sekaligus — tidak boleh dihitung sendiri di sini, nanti dua agent bisa
    // memilih tempat yang sama.
    const pose = placement.pose;
    const goal = targetFor(pose, placement.slot);

    // Tujuan ganti -> hitung ulang rutenya (bisa mampir ke pintu dulu).
    const goalKey = `${goal.x},${goal.z}`;
    if (goalKey !== lastGoal.current) {
      lastGoal.current = goalKey;
      path.current = routeTo(pos.current.x, pos.current.z, goal);
    }

    let wp = path.current[0] ?? goal;
    let dx = wp.x - pos.current.x;
    let dz = wp.z - pos.current.z;
    let dist = Math.hypot(dx, dz);
    while (dist < 0.12 && path.current.length > 1) {
      path.current.shift();
      wp = path.current[0];
      dx = wp.x - pos.current.x;
      dz = wp.z - pos.current.z;
      dist = Math.hypot(dx, dz);
    }

    const walking = dist > 0.08;
    if (walking) {
      const step = Math.min(WALK_SPEED * dt, dist);
      pos.current.x += (dx / dist) * step;
      pos.current.z += (dz / dist) * step;
      body.current.rotation.y = facingFor(dx, dz);
    } else {
      body.current.rotation.y = goal.rotY;
    }

    const posture = walking ? "stand" : postureFor(pose);
    // Tinggi dudukan ikut tempatnya: sofa, bean bag, dan kursi baca beda-beda.
    const seatY = (goal as { seatY?: number }).seatY;
    const { joints: want, shake } = poseJoints(pose, posture, walking, t, BED.matTop, seatY);

    // Lerp ke pose tujuan — bangun dari kasur jadi mulus, bukan patah.
    const k = 1 - Math.exp(-9 * dt);
    const c = cur.current;
    for (const key of Object.keys(want) as (keyof Joints)[]) {
      c[key] = THREE.MathUtils.lerp(c[key], want[key], k);
    }

    g.position.set(pos.current.x + shake, c.y, pos.current.z);
    // Urutan HARUS Y dulu baru X. Default three.js (XYZ) mengenakan rotasi X di
    // sumbu DUNIA, jadi begitu karakter menghadap ke samping, "menyandar"
    // berubah jadi miring ke samping. Di sofa (hadap -90 derajat) efeknya
    // total: komponen sandarannya nol.
    // Sandaran berporos di PINGGUL, bukan di telapak kaki. Grup `body`
    // titik asalnya di lantai; kalau recline dikenakan di situ, seluruh badan
    // mengayun ke belakang-bawah dan pinggulnya meleset dari dudukan —
    // karakternya kelihatan nangkring dan melayang.
    body.current.rotation.order = "YXZ";
    body.current.rotation.x = c.lying;
    if (hinge.current) hinge.current.rotation.x = c.recline;
    if (torso.current) torso.current.rotation.x = c.lean;
    if (hipL.current) hipL.current.rotation.x = c.hipL;
    if (hipR.current) hipR.current.rotation.x = c.hipR;
    if (kneeL.current) kneeL.current.rotation.x = c.kneeL;
    if (kneeR.current) kneeR.current.rotation.x = c.kneeR;
    if (shoulderL.current) shoulderL.current.rotation.x = c.shL;
    if (shoulderR.current) shoulderR.current.rotation.x = c.shR;
    if (elbowL.current) elbowL.current.rotation.x = c.elL;
    if (elbowR.current) elbowR.current.rotation.x = c.elR;
    if (head.current) {
      head.current.rotation.z = c.headZ;
      head.current.rotation.x = c.headX;
    }

    // Label nggak boleh ikut miring waktu karakternya rebahan.
    if (labelAnchor.current) {
      labelAnchor.current.position.y = posture === "bed" ? 1.5 - c.y : 2.5;
    }
    if (heldMug.current) heldMug.current.visible = posture === "stand" && pose === "idle";
    if (pad.current) pad.current.visible = posture === "sofa";
  });

  const now = Date.now();
  const pose = placement.pose;
  const badge = STATE_LABEL[pose];
  const idle = idleText(agent, now);

  const Arm = ({
    side,
    shoulderRef,
    elbowRef,
  }: {
    side: number;
    shoulderRef: React.RefObject<THREE.Group | null>;
    elbowRef: React.RefObject<THREE.Group | null>;
  }) => (
    <group ref={shoulderRef} position={[RIG.shoulderX * side, RIG.shoulderY, 0]}>
      <mesh position={[0, -RIG.upperArmLen / 2, 0]} castShadow>
        <boxGeometry args={[0.24, RIG.upperArmLen, 0.24]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <group ref={elbowRef} position={[0, RIG.elbowY, 0]}>
        <mesh position={[0, -RIG.forearmLen / 2, 0]} castShadow>
          <boxGeometry args={[0.22, RIG.forearmLen, 0.22]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        <mesh position={[0, RIG.handY, 0]} castShadow>
          <boxGeometry args={[0.2, 0.15, 0.22]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
        {side > 0 && (
          <group ref={heldMug} position={[0, RIG.handY - 0.06, -0.13]}>
            <mesh castShadow>
              <boxGeometry args={[0.13, 0.15, 0.13]} />
              <meshStandardMaterial color="#e8e4dc" roughness={0.5} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );

  const Leg = ({
    side,
    hipRef,
    kneeRef,
  }: {
    side: number;
    hipRef: React.RefObject<THREE.Group | null>;
    kneeRef: React.RefObject<THREE.Group | null>;
  }) => (
    <group ref={hipRef} position={[RIG.hipX * side, RIG.hipY, 0]}>
      <mesh position={[0, -RIG.thighLen / 2, 0]} castShadow>
        <boxGeometry args={[0.25, RIG.thighLen, 0.26]} />
        <meshStandardMaterial color={TROUSERS} roughness={0.9} />
      </mesh>
      <group ref={kneeRef} position={[0, RIG.kneeY, 0]}>
        <mesh position={[0, -RIG.shinLen / 2, 0]} castShadow>
          <boxGeometry args={[0.23, RIG.shinLen, 0.24]} />
          <meshStandardMaterial color={TROUSERS} roughness={0.9} />
        </mesh>
        <mesh position={[0, RIG.footY, RIG.footZ]} castShadow>
          <boxGeometry args={[0.26, 0.1, 0.34]} />
          <meshStandardMaterial color={SHOE} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group ref={root}>
      {/* Label DOM, bukan teks 3D — nggak perlu load font dari mana pun.
          Ditaruh di luar grup badan supaya nggak ikut terbalik waktu tidur. */}
      <group ref={labelAnchor} position={[0, 2.5, 0]}>
        <Html position={[0, 0, 0]} center distanceFactor={15} zIndexRange={[10, 0]}>
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
              lineHeight: 1.35,
              textAlign: "center",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              userSelect: "none",
              textShadow: "0 1px 3px rgba(0,0,0,.7)",
              color: "#fff",
            }}
          >
            <div style={{ fontWeight: 700 }}>{nameOf(agent)}</div>
            <div style={{ color: badge.color }}>
              {badge.text}
              {agent.tool && pose === "working" ? ` · ${agent.tool}` : ""}
              {/* Lamanya nganggur ditempel di sini. Posisi karakter sengaja
                  disebar biar ruangannya nggak suram, jadi ANGKA INI yang jadi
                  sumber kebenaran soal keaktifan — bukan dia lagi di mana. */}
              {idle ? ` · ${idle}` : ""}
            </div>
          </div>
        </Html>
      </group>

      <group ref={body}>
        {/* engsel di ketinggian pinggul; isinya digeser balik supaya koordinat
            semua anggota badan tetap sama seperti sebelumnya */}
        <group ref={hinge} position={[0, RIG.hipY, 0]}>
        <group position={[0, -RIG.hipY, 0]}>
        <group ref={torso}>
          <mesh position={[0, RIG.torsoY, 0]} castShadow>
            <boxGeometry args={[0.52, 0.78, 0.29]} />
            <meshStandardMaterial color={shirt} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.47, 0]}>
            <boxGeometry args={[0.46, 0.07, 0.3]} />
            <meshStandardMaterial color="#f0efe9" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.28, -0.149]}>
            <boxGeometry args={[0.07, 0.3, 0.008]} />
            <meshStandardMaterial color="#2a3340" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.04, -0.152]} castShadow>
            <boxGeometry args={[0.15, 0.2, 0.012]} />
            <meshStandardMaterial color="#f5f4f0" roughness={0.7} />
          </mesh>

          {/* stik PS, muncul cuma waktu main */}
          <group ref={pad} position={[0, 1.02, -0.46]} visible={false}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.08, 0.19]} />
              <meshStandardMaterial color="#20242b" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.045, 0.02]}>
              <boxGeometry args={[0.1, 0.012, 0.07]} />
              <meshBasicMaterial color="#6ab7ff" toneMapped={false} />
            </mesh>
            {[-0.16, 0.16].map((hx) => (
              <mesh key={hx} position={[hx, -0.03, 0.05]} rotation={[0, 0, hx > 0 ? -0.3 : 0.3]}>
                <boxGeometry args={[0.08, 0.12, 0.14]} />
                <meshStandardMaterial color="#20242b" roughness={0.6} />
              </mesh>
            ))}
          </group>

          <group ref={head} position={[0, RIG.headY, 0]}>
            <mesh castShadow>
              <boxGeometry args={[RIG.headSize, RIG.headSize, RIG.headSize]} />
              <meshStandardMaterial color={SKIN} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.23, 0.01]} castShadow>
              <boxGeometry args={[0.53, 0.12, 0.53]} />
              <meshStandardMaterial color={HAIR} roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.02, 0.22]}>
              <boxGeometry args={[0.52, 0.42, 0.11]} />
              <meshStandardMaterial color={HAIR} roughness={0.95} />
            </mesh>
            {/* mata — muka ada di sisi -z, itu yang nentuin arah hadap */}
            {[-0.115, 0.115].map((ex) => (
              <group key={ex} position={[ex, 0.035, RIG.faceZ]}>
                <mesh>
                  <boxGeometry args={[0.09, 0.1, 0.008]} />
                  <meshStandardMaterial color="#f7f7f5" roughness={0.6} />
                </mesh>
                <mesh position={[0, -0.005, 0.006]}>
                  <boxGeometry args={[0.042, 0.055, 0.006]} />
                  <meshStandardMaterial color="#1e2733" roughness={0.5} />
                </mesh>
              </group>
            ))}
            {[-0.115, 0.115].map((ex) => (
              <mesh key={`b${ex}`} position={[ex, 0.115, RIG.faceZ]}>
                <boxGeometry args={[0.1, 0.022, 0.006]} />
                <meshStandardMaterial color={HAIR} roughness={0.9} />
              </mesh>
            ))}
            <mesh position={[0, -0.13, RIG.faceZ]}>
              <boxGeometry args={[0.11, 0.025, 0.006]} />
              <meshStandardMaterial color="#9c6b58" roughness={0.8} />
            </mesh>
          </group>

          <Arm side={-1} shoulderRef={shoulderL} elbowRef={elbowL} />
          <Arm side={1} shoulderRef={shoulderR} elbowRef={elbowR} />
        </group>

        </group>
        </group>

        {/* Kaki di LUAR engsel: menyandar itu gerakan badan atas, kaki tetap
            di tempatnya. Waktu tidur, yang memutar semuanya `lying` di grup
            badan, jadi kaki tetap ikut. */}
        <Leg side={-1} hipRef={hipL} kneeRef={kneeL} />
        <Leg side={1} hipRef={hipR} kneeRef={kneeR} />
      </group>
    </group>
  );
}
