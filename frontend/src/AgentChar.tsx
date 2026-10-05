import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { BED, postureFor, targetFor } from "./layout";
import { colorOf, displayPose } from "./store";
import type { Agent, Pose } from "./types";

const SKIN = "#d9a06b";
const HAIR = "#2b2320";
const TROUSERS = "#39414f";
const SHOE = "#23262b";
const WALK_SPEED = 2.6;

/** Tinggi pinggul (lokal) karakter waktu berdiri. Dipakai buat ngitung seberapa
 * jauh badan diturunin waktu duduk. */
const HIP_Y = 0.75;
const DESK_SEAT = 0.545;
const SOFA_SEAT = 0.625;

/** Rotasi POSITIF di sumbu x = anggota badan maju (ke -z), karena karakter
 * menghadap -z. Semua angka di bawah ngikut konvensi ini. */
const FWD = Math.PI / 2;

const STATE_LABEL: Record<Pose, { text: string; color: string }> = {
  idle: { text: "idle", color: "#c3c8d0" },
  gaming: { text: "main PS", color: "#b388ff" },
  sleeping: { text: "tidur", color: "#7a8699" },
  thinking: { text: "mikir", color: "#ffd166" },
  working: { text: "kerja", color: "#8ee07a" },
  blocked: { text: "ketahan", color: "#f0932b" },
  error: { text: "error", color: "#ff6b5e" },
  done: { text: "kelar", color: "#5ad7e0" },
};

type Joints = {
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

const ZERO: Joints = {
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

export function AgentChar({ agent }: { agent: Agent }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
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
  const spawn = targetFor(agent.state, agent.desk_index);
  const pos = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  // Sudut yang sedang dipakai, biar perpindahan pose dilerp bukan nyeplak.
  const cur = useRef<Joints>({ ...ZERO });

  useFrame((_, dtRaw) => {
    const g = root.current;
    if (!g || !body.current) return;
    // Clamp dt: kalau tab-nya sempet ke-background, jangan sampai karakter
    // teleport gara-gara delta raksasa.
    const dt = Math.min(dtRaw, 0.1);
    const t = performance.now() / 1000;

    const pose = displayPose(agent, Date.now());
    const target = targetFor(pose, agent.desk_index);

    const dx = target.x - pos.current.x;
    const dz = target.z - pos.current.z;
    const dist = Math.hypot(dx, dz);
    const walking = dist > 0.08;

    if (walking) {
      const step = Math.min(WALK_SPEED * dt, dist);
      pos.current.x += (dx / dist) * step;
      pos.current.z += (dz / dist) * step;
      body.current.rotation.y = Math.atan2(dx, dz);
    } else {
      body.current.rotation.y = target.rotY;
    }

    const posture = walking ? "stand" : postureFor(pose);
    const want: Joints = { ...ZERO };
    let shake = 0;

    if (walking) {
      const s = Math.sin(t * 8.5);
      want.hipL = s * 0.6;
      want.hipR = -s * 0.6;
      want.kneeL = -(0.2 + Math.max(0, s) * 0.5);
      want.kneeR = -(0.2 + Math.max(0, -s) * 0.5);
      want.shL = s * 0.5;
      want.shR = -s * 0.5;
      want.elL = 0.3;
      want.elR = 0.3;
      want.y = Math.abs(s) * 0.04;
    } else if (posture === "desk") {
      want.y = DESK_SEAT - HIP_Y;
      want.hipL = want.hipR = FWD - 0.08;
      want.kneeL = want.kneeR = -FWD + 0.12;
      if (pose === "working") {
        want.shL = want.shR = 0.68;
        want.elL = want.elR = 0.6 + Math.sin(t * 15) * 0.09;
        want.headX = 0.14;
        want.lean = 0.06;
      } else {
        // done: tangan ngangkat
        want.shL = want.shR = 2.5;
        want.elL = want.elR = 0.4;
        want.y += Math.max(0, Math.sin(t * 6)) * 0.07;
      }
    } else if (posture === "sofa") {
      // nyender, kaki agak nyelonjor, dua tangan megang stik
      want.y = SOFA_SEAT - HIP_Y;
      want.recline = -0.14;
      want.hipL = want.hipR = FWD - 0.22;
      want.kneeL = -FWD + 0.46;
      want.kneeR = -FWD + 0.38;
      want.shL = want.shR = 0.5;
      want.elL = 1.24 + Math.sin(t * 11) * 0.05;
      want.elR = 1.24 + Math.sin(t * 11 + 1.4) * 0.05;
      want.headX = 0.07;
    } else if (posture === "bed") {
      // Badan diputar 90 derajat di sumbu x: kepala ke arah +z (sisi bantal).
      want.recline = FWD;
      want.y = BED.matTop + 0.15 + Math.sin(t * 1.1) * 0.012;
      want.shL = want.shR = 0.06;
      want.elL = want.elR = 0.12;
      want.headZ = 0.12;
    } else {
      switch (pose) {
        case "thinking":
          // tangan kanan nunjuk whiteboard
          want.shR = 1.6;
          want.elR = 0.1;
          want.shL = 0.15;
          want.elL = 1.3;
          want.headZ = Math.sin(t * 1.5) * 0.16;
          break;
        case "blocked":
          want.shL = want.shR = 2.35;
          want.elL = want.elR = 0.9;
          shake = Math.sin(t * 15) * 0.03;
          break;
        case "error":
          want.shL = want.shR = 2.8;
          want.elL = want.elR = 1.1;
          shake = Math.sin(t * 25) * 0.06;
          break;
        default:
          // idle di pantry: napas, tangan kanan megang cangkir
          want.y = Math.sin(t * 2.2) * 0.03;
          want.shL = want.shR = 0.18;
          want.elL = want.elR = 1.5;
          want.headZ = Math.sin(t * 0.8) * 0.06;
      }
    }

    // Lerp ke pose tujuan — bangun dari kasur jadi mulus, bukan patah.
    const k = 1 - Math.exp(-9 * dt);
    const c = cur.current;
    for (const key of Object.keys(want) as (keyof Joints)[]) {
      c[key] = THREE.MathUtils.lerp(c[key], want[key], k);
    }

    g.position.set(pos.current.x + shake, c.y, pos.current.z);
    body.current.rotation.x = c.recline;
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

  const pose = displayPose(agent, Date.now());
  const badge = STATE_LABEL[pose];

  const Arm = ({
    side,
    shoulderRef,
    elbowRef,
  }: {
    side: number;
    shoulderRef: React.RefObject<THREE.Group | null>;
    elbowRef: React.RefObject<THREE.Group | null>;
  }) => (
    <group ref={shoulderRef} position={[0.375 * side, 1.5, 0]}>
      <mesh position={[0, -0.19, 0]} castShadow>
        <boxGeometry args={[0.24, 0.38, 0.24]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <group ref={elbowRef} position={[0, -0.38, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <boxGeometry args={[0.22, 0.36, 0.22]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.41, 0]} castShadow>
          <boxGeometry args={[0.2, 0.15, 0.22]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
        {side > 0 && (
          <group ref={heldMug} position={[0, -0.47, -0.13]}>
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
    <group ref={hipRef} position={[0.135 * side, HIP_Y, 0]}>
      <mesh position={[0, -0.2, 0]} castShadow>
        <boxGeometry args={[0.25, 0.4, 0.26]} />
        <meshStandardMaterial color={TROUSERS} roughness={0.9} />
      </mesh>
      <group ref={kneeRef} position={[0, -0.4, 0]}>
        <mesh position={[0, -0.185, 0]} castShadow>
          <boxGeometry args={[0.23, 0.37, 0.24]} />
          <meshStandardMaterial color={TROUSERS} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.4, -0.05]} castShadow>
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
            <div style={{ fontWeight: 700 }}>{agent.agent}</div>
            <div style={{ color: badge.color }}>
              {badge.text}
              {agent.tool && pose === "working" ? ` · ${agent.tool}` : ""}
            </div>
          </div>
        </Html>
      </group>

      <group ref={body}>
        <group ref={torso}>
          {/* badan */}
          <mesh position={[0, 1.12, 0]} castShadow>
            <boxGeometry args={[0.52, 0.78, 0.29]} />
            <meshStandardMaterial color={shirt} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.47, 0]}>
            <boxGeometry args={[0.46, 0.07, 0.3]} />
            <meshStandardMaterial color="#f0efe9" roughness={0.8} />
          </mesh>
          {/* lanyard + kartu akses */}
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

          {/* kepala */}
          <group ref={head} position={[0, 1.75, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
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
              <group key={ex} position={[ex, 0.035, -0.251]}>
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
              <mesh key={`b${ex}`} position={[ex, 0.115, -0.251]}>
                <boxGeometry args={[0.1, 0.022, 0.006]} />
                <meshStandardMaterial color={HAIR} roughness={0.9} />
              </mesh>
            ))}
            <mesh position={[0, -0.13, -0.251]}>
              <boxGeometry args={[0.11, 0.025, 0.006]} />
              <meshStandardMaterial color="#9c6b58" roughness={0.8} />
            </mesh>
          </group>

          <Arm side={-1} shoulderRef={shoulderL} elbowRef={elbowL} />
          <Arm side={1} shoulderRef={shoulderR} elbowRef={elbowR} />
        </group>

        <Leg side={-1} hipRef={hipL} kneeRef={kneeL} />
        <Leg side={1} hipRef={hipR} kneeRef={kneeR} />
      </group>
    </group>
  );
}
