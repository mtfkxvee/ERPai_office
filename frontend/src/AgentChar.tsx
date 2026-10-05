import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { sitsAt, targetFor } from "./layout";
import { colorOf, effectiveState } from "./store";
import type { Agent, AgentState } from "./types";

const SKIN = "#d9a06b";
const HAIR = "#2b2320";
const TROUSERS = "#39414f";
const SHOE = "#23262b";
const WALK_SPEED = 2.6;

/** Tinggi pinggul saat duduk, dipilih supaya telapak kaki nyaris nyentuh lantai
 * sementara badan tetep kelihatan nangkring di kursi. */
const SIT_DROP = -0.23;

const STATE_LABEL: Record<AgentState, { text: string; color: string }> = {
  idle: { text: "idle", color: "#c3c8d0" },
  thinking: { text: "mikir", color: "#ffd166" },
  working: { text: "kerja", color: "#8ee07a" },
  blocked: { text: "ketahan", color: "#f0932b" },
  error: { text: "error", color: "#ff6b5e" },
  done: { text: "kelar", color: "#5ad7e0" },
};

/** Karakter dengan sendi lutut & siku, jadi bisa duduk beneran dan ngetik —
 * bukan cuma figur kaku yang ditempel di depan meja. */
export function AgentChar({ agent }: { agent: Agent }) {
  const root = useRef<THREE.Group>(null);
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

  const shirt = colorOf(agent);
  const spawn = targetFor(agent.state, agent.desk_index);
  const pos = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));

  useFrame((_, dtRaw) => {
    const g = root.current;
    if (!g) return;
    // Clamp dt: kalau tab-nya sempet ke-background, jangan sampai karakter
    // teleport gara-gara delta raksasa.
    const dt = Math.min(dtRaw, 0.1);
    const t = performance.now() / 1000;

    const state = effectiveState(agent, Date.now());
    const target = targetFor(state, agent.desk_index);

    const dx = target.x - pos.current.x;
    const dz = target.z - pos.current.z;
    const dist = Math.hypot(dx, dz);
    const walking = dist > 0.08;

    if (walking) {
      const step = Math.min(WALK_SPEED * dt, dist);
      pos.current.x += (dx / dist) * step;
      pos.current.z += (dz / dist) * step;
      g.rotation.y = Math.atan2(dx, dz) + Math.PI;
    } else {
      g.rotation.y = target.rotY;
    }

    const sitting = !walking && sitsAt(state);

    // Default: berdiri tegak
    let y = 0;
    let hip = 0;
    let knee = 0;
    let hipPhase = 0;
    let shoulder = 0;
    let elbow = 0;
    let armPhase = 0;
    let headTiltZ = 0;
    let headTiltX = 0;
    let shake = 0;
    let lean = 0;

    if (walking) {
      hipPhase = Math.sin(t * 8.5) * 0.6;
      knee = 0.35 + Math.sin(t * 8.5 + Math.PI / 2) * 0.3;
      armPhase = Math.sin(t * 8.5) * 0.5;
      elbow = -0.3;
      y = Math.abs(Math.sin(t * 8.5)) * 0.04;
    } else if (sitting) {
      y = SIT_DROP;
      hip = -Math.PI / 2 + 0.08;
      knee = Math.PI / 2 - 0.12;
      if (state === "working") {
        // tangan maju ke keyboard, jari-jari diwakili getaran kecil di siku
        shoulder = -0.72;
        elbow = -0.62 + Math.sin(t * 15) * 0.09;
        headTiltX = 0.14;
        lean = 0.06;
      } else {
        // done: tangan ngangkat
        shoulder = -2.5;
        elbow = -0.4;
        y = SIT_DROP + Math.max(0, Math.sin(t * 6)) * 0.07;
      }
    } else {
      switch (state) {
        case "thinking":
          // satu tangan nunjuk whiteboard
          shoulder = -1.5;
          elbow = -0.25;
          armPhase = 0.5;
          headTiltZ = Math.sin(t * 1.5) * 0.18;
          break;
        case "blocked":
          shoulder = -2.35;
          elbow = -0.9;
          shake = Math.sin(t * 15) * 0.03;
          break;
        case "error":
          shoulder = -2.8;
          elbow = -1.1;
          shake = Math.sin(t * 25) * 0.06;
          break;
        default:
          // idle di zona kopi: napas, satu tangan megang cangkir
          y = Math.sin(t * 2.2) * 0.03;
          shoulder = -0.18;
          elbow = -1.5;
          headTiltZ = Math.sin(t * 0.8) * 0.06;
      }
    }

    g.position.set(pos.current.x + shake, y, pos.current.z);
    if (torso.current) torso.current.rotation.x = lean;
    if (hipL.current) hipL.current.rotation.x = hip + hipPhase;
    if (hipR.current) hipR.current.rotation.x = hip - hipPhase;
    if (kneeL.current) kneeL.current.rotation.x = knee;
    if (kneeR.current) kneeR.current.rotation.x = knee;
    if (shoulderL.current) shoulderL.current.rotation.x = shoulder + armPhase;
    if (shoulderR.current) shoulderR.current.rotation.x = shoulder - armPhase;
    if (elbowL.current) elbowL.current.rotation.x = elbow;
    if (elbowR.current) elbowR.current.rotation.x = elbow;
    if (head.current) {
      head.current.rotation.z = headTiltZ;
      head.current.rotation.x = headTiltX;
    }
    if (heldMug.current) heldMug.current.visible = !walking && state === "idle";
  });

  const state = effectiveState(agent, Date.now());
  const badge = STATE_LABEL[state];

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
          <group ref={heldMug} position={[0, -0.46, -0.12]}>
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
    <group ref={hipRef} position={[0.135 * side, 0.75, 0]}>
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
      {/* Label DOM, bukan teks 3D — nggak perlu load font dari mana pun. */}
      <Html position={[0, 2.5, 0]} center distanceFactor={15} zIndexRange={[10, 0]}>
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
            {agent.tool && state === "working" ? ` · ${agent.tool}` : ""}
          </div>
        </div>
      </Html>

      <group ref={torso}>
        {/* badan */}
        <mesh position={[0, 1.12, 0]} castShadow>
          <boxGeometry args={[0.52, 0.78, 0.29]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* kerah */}
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

        {/* kepala */}
        <group ref={head} position={[0, 1.75, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={SKIN} roughness={0.8} />
          </mesh>
          {/* rambut: atas + belakang */}
          <mesh position={[0, 0.23, 0.01]} castShadow>
            <boxGeometry args={[0.53, 0.12, 0.53]} />
            <meshStandardMaterial color={HAIR} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.02, 0.22]}>
            <boxGeometry args={[0.52, 0.42, 0.11]} />
            <meshStandardMaterial color={HAIR} roughness={0.95} />
          </mesh>
          {/* mata (karakter menghadap -z) */}
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
          {/* alis + mulut */}
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
  );
}
