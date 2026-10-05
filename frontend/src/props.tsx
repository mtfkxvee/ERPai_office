import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import {
  BED,
  BED_X,
  CEILING_LIGHTS,
  chairPos,
  DESK,
  DESKS,
  LOUNGE,
  PLANTS,
  SOFA_SEATS,
  ZONES,
} from "./layout";
import { boardTexture, gameTexture, runnerTexture, screenTexture, woodTexture } from "./textures";
import type { AgentState } from "./types";

/** Semua perabot dibangun dari box kecil-kecil. Bentuknya tetep tegas/boxy
 * (nggak ada kurva), tapi proporsinya ngikut benda nyata — makanya monitor
 * kebaca sebagai monitor, bukan kubus yang ditempel gambar. */

const C = {
  panel: "#d8d4cc",
  metal: "#97a0aa",
  darkMetal: "#5b646e",
  plastic: "#2b313a",
  plasticMid: "#3d4652",
  chairFrame: "#2a2f37",
  chairFabric: "#3f4a5a",
  white: "#f2f1ed",
  mug: "#c0523d",
  paper: "#f7f6f2",
  pot: "#8a6a52",
  soil: "#3a2d24",
  leaf: "#53925a",
  leafDark: "#3c7344",
  tower: "#23282f",
  warn: "#c23b30",
};

const SCREEN_COLOR: Record<AgentState, string> = {
  working: "#8ee07a",
  thinking: "#ffd166",
  blocked: "#f0932b",
  error: "#ff6b5e",
  done: "#5ad7e0",
  idle: "#44536b",
};

/* ------------------------------------------------------------------ */

function Screen({ state, scroll }: { state: AgentState; scroll: boolean }) {
  // Tiap layar punya clone sendiri supaya offset-nya bisa dianimasi terpisah.
  const tex = useMemo(() => {
    const t = screenTexture().clone();
    t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);

  useFrame((_, dt) => {
    if (scroll) tex.offset.y = (tex.offset.y + dt * 0.08) % 1;
  });

  const dim = state === "idle";
  return (
    <meshBasicMaterial
      map={tex}
      color={SCREEN_COLOR[state]}
      toneMapped={false}
      opacity={dim ? 0.35 : 1}
      transparent={dim}
    />
  );
}

function Monitor({
  state,
  width,
  height,
  primary,
}: {
  state: AgentState;
  width: number;
  height: number;
  primary: boolean;
}) {
  const bezel = 0.045;
  return (
    <group>
      {/* dudukan */}
      <mesh position={[0, 0.02, -0.02]} castShadow>
        <boxGeometry args={[width * 0.45, 0.035, 0.24]} />
        <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.17, -0.03]} castShadow>
        <boxGeometry args={[0.08, 0.3, 0.06]} />
        <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
      </mesh>

      {/* panel, agak nunduk ke arah orang yang duduk */}
      <group position={[0, 0.34 + height / 2, 0]} rotation={[-0.08, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[width, height, 0.045]} />
          <meshStandardMaterial color={C.plastic} roughness={0.65} />
        </mesh>
        {/* layar, nempel di depan bezel */}
        <mesh position={[0, 0.012, 0.027]}>
          <planeGeometry args={[width - bezel * 2, height - bezel * 2 - 0.025]} />
          <Screen state={state} scroll={primary && state === "working"} />
        </mesh>
        {/* lampu indikator */}
        <mesh position={[width / 2 - 0.06, -height / 2 + 0.025, 0.026]}>
          <boxGeometry args={[0.025, 0.012, 0.004]} />
          <meshBasicMaterial color={state === "idle" ? "#6b4a1a" : "#7de06b"} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Keyboard() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.028, 0.27]} />
        <meshStandardMaterial color={C.plasticMid} roughness={0.75} />
      </mesh>
      {/* blok keycap, dibikin rata supaya kebaca sebagai tuts */}
      <mesh position={[0, 0.021, 0.01]}>
        <boxGeometry args={[0.74, 0.014, 0.21]} />
        <meshStandardMaterial color="#1f242b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.03, 0.085]}>
        <boxGeometry args={[0.26, 0.012, 0.035]} />
        <meshStandardMaterial color={C.plasticMid} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Mug() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.17, 0.15]} />
        <meshStandardMaterial color={C.mug} roughness={0.5} />
      </mesh>
      <mesh position={[0.095, 0.015, 0]}>
        <boxGeometry args={[0.045, 0.075, 0.035]} />
        <meshStandardMaterial color={C.mug} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.079, 0]}>
        <boxGeometry args={[0.125, 0.012, 0.125]} />
        <meshStandardMaterial color="#45291d" roughness={0.3} />
      </mesh>
    </group>
  );
}

function DeskLamp() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.035, 0.18]} />
        <meshStandardMaterial color={C.darkMetal} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0.02, 0.23, 0]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[0.032, 0.44, 0.032]} />
        <meshStandardMaterial color={C.darkMetal} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0.14, 0.45, 0]} rotation={[0, 0, -0.6]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.16]} />
        <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Chair({ x, z }: { x: number; z: number }) {
  // Kaki bintang 5, dibikin dari box yang diputar.
  const legs = useMemo(
    () => [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2),
    [],
  );
  return (
    <group position={[x, 0, z]}>
      {legs.map((a, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[0, 0.06, 0.17]} castShadow>
            <boxGeometry args={[0.07, 0.045, 0.34]} />
            <meshStandardMaterial color={C.chairFrame} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.03, 0.33]}>
            <boxGeometry args={[0.05, 0.06, 0.05]} />
            <meshStandardMaterial color="#15181d" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.26, 0]} castShadow>
        <boxGeometry args={[0.09, 0.38, 0.09]} />
        <meshStandardMaterial color={C.chairFrame} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.49, 0]} castShadow>
        <boxGeometry args={[0.58, 0.11, 0.56]} />
        <meshStandardMaterial color={C.chairFabric} roughness={0.9} />
      </mesh>
      {/* sandaran ada di belakang orang yang duduk (sisi +z) */}
      <mesh position={[0, 0.85, 0.27]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.56, 0.64, 0.09]} />
        <meshStandardMaterial color={C.chairFabric} roughness={0.9} />
      </mesh>
      {[-0.33, 0.33].map((ax) => (
        <mesh key={ax} position={[ax, 0.67, 0.02]} castShadow>
          <boxGeometry args={[0.07, 0.055, 0.42]} />
          <meshStandardMaterial color={C.chairFrame} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Satu set kerja lengkap: meja, 2 monitor, keyboard, mouse, PC, lampu, mug. */
export function Workstation({
  deskIndex,
  state,
}: {
  deskIndex: number;
  state: AgentState;
}) {
  const d = DESKS[deskIndex];
  const wood = useMemo(() => woodTexture("#a97f4d"), []);
  const top = DESK.topY;

  return (
    <group position={[d.x, 0, d.z]}>
      {/* permukaan meja */}
      <mesh position={[0, top - DESK.topT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[DESK.w, DESK.topT, DESK.d]} />
        <meshStandardMaterial map={wood} roughness={0.7} />
      </mesh>
      {/* panel samping kiri */}
      <mesh position={[-DESK.w / 2 + 0.06, 0.36, 0]} castShadow>
        <boxGeometry args={[0.07, 0.72, DESK.d * 0.85]} />
        <meshStandardMaterial color={C.panel} roughness={0.8} />
      </mesh>
      {/* panel penutup belakang */}
      <mesh position={[0, 0.45, -DESK.d / 2 + 0.04]} castShadow>
        <boxGeometry args={[DESK.w * 0.92, 0.46, 0.05]} />
        <meshStandardMaterial color={C.panel} roughness={0.85} />
      </mesh>
      {/* unit laci */}
      <group position={[DESK.w / 2 - 0.47, 0.34, 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.78, 0.68, 0.95]} />
          <meshStandardMaterial color={C.panel} roughness={0.8} />
        </mesh>
        {[0.17, -0.06, -0.28].map((dy) => (
          <mesh key={dy} position={[0, dy, 0.49]}>
            <boxGeometry args={[0.62, 0.035, 0.03]} />
            <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
      </group>

      {/* PC tower di bawah meja */}
      <group position={[-DESK.w / 2 + 0.45, 0.32, -0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.64, 0.58]} />
          <meshStandardMaterial color={C.tower} roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.135, 0.18, 0.1]}>
          <boxGeometry args={[0.012, 0.02, 0.02]} />
          <meshBasicMaterial
            color={state === "idle" ? "#2b3a4a" : "#6ab7ff"}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.135, 0.02, 0.1]}>
          <boxGeometry args={[0.012, 0.055, 0.14]} />
          <meshStandardMaterial color="#12161b" roughness={0.9} />
        </mesh>
      </group>

      {/* monitor utama + monitor kedua */}
      <group position={[-0.34, top, -0.26]}>
        <Monitor state={state} width={0.98} height={0.58} primary />
      </group>
      <group position={[0.74, top, -0.22]} rotation={[0, -0.42, 0]}>
        <Monitor state={state} width={0.66} height={0.42} primary={false} />
      </group>

      <group position={[-0.26, top + 0.015, 0.26]}>
        <Keyboard />
      </group>
      <mesh position={[0.34, top + 0.025, 0.28]} castShadow>
        <boxGeometry args={[0.105, 0.045, 0.17]} />
        <meshStandardMaterial color={C.plasticMid} roughness={0.6} />
      </mesh>

      <group position={[0.68, top + 0.085, 0.3]}>
        <Mug />
      </group>
      <mesh position={[-1.0, top + 0.008, 0.22]} rotation={[0, 0.28, 0]}>
        <boxGeometry args={[0.34, 0.016, 0.25]} />
        <meshStandardMaterial color={C.paper} roughness={0.95} />
      </mesh>
      <group position={[-1.0, top, -0.3]}>
        <DeskLamp />
      </group>

      <Chair {...chairPos(deskIndex)} />
    </group>
  );
}

/* ------------------------------------------------------------------ */

export function CoffeeBar() {
  const wood = useMemo(() => woodTexture("#8d6239"), []);
  const { x, z } = ZONES.coffee;
  return (
    <group position={[x + 0.2, 0, z - 1.9]}>
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 0.88, 0.95]} />
        <meshStandardMaterial color={C.panel} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[3.5, 0.08, 1.05]} />
        <meshStandardMaterial map={wood} roughness={0.6} />
      </mesh>

      {/* mesin kopi */}
      <group position={[-1.05, 1.22, -0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.52, 0.42]} />
          <meshStandardMaterial color={C.plastic} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.29, 0]}>
          <boxGeometry args={[0.54, 0.06, 0.44]} />
          <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.1, 0.22]}>
          <boxGeometry args={[0.16, 0.14, 0.04]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0.17, 0.12, 0.215]}>
          <boxGeometry args={[0.05, 0.05, 0.01]} />
          <meshBasicMaterial color="#7de06b" toneMapped={false} />
        </mesh>
      </group>

      {/* galon air */}
      <group position={[1.15, 1.22, -0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.52, 0.34]} />
          <meshStandardMaterial color="#9fc8d8" roughness={0.25} transparent opacity={0.75} />
        </mesh>
      </group>

      {/* cangkir kebalik */}
      {[-0.2, 0.02, 0.24].map((dx) => (
        <mesh key={dx} position={[dx, 1.04, 0.12]} castShadow>
          <boxGeometry args={[0.13, 0.15, 0.13]} />
          <meshStandardMaterial color={C.white} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function Whiteboard() {
  const board = useMemo(() => boardTexture(), []);
  const { z } = ZONES.whiteboard;
  return (
    <group position={[0.14, 0, z]}>
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[0.08, 1.74, 3.7]} />
        <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0.05, 2.15, 0]}>
        <boxGeometry args={[0.02, 1.58, 3.54]} />
        <meshStandardMaterial map={board} roughness={0.25} />
      </mesh>
      <mesh position={[0.1, 1.22, 0]} castShadow>
        <boxGeometry args={[0.14, 0.05, 3.5]} />
        <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.5} />
      </mesh>
      {[
        { dz: -0.5, c: "#c23b30" },
        { dz: -0.28, c: "#2f6fc0" },
        { dz: -0.06, c: "#3a3a3a" },
      ].map((m) => (
        <mesh key={m.dz} position={[0.12, 1.27, m.dz]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.035, 0.16, 0.035]} />
          <meshStandardMaterial color={m.c} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Zona "ketahan/error": matras lantai + papan peringatan. */
export function BugZone() {
  const { x, z } = ZONES.bug;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.024, 2.8]} />
        <meshStandardMaterial color="#7a2b24" roughness={0.95} />
      </mesh>
      <group position={[1.1, 0, -0.9]}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <boxGeometry args={[0.5, 0.06, 0.5]} />
          <meshStandardMaterial color={C.plastic} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.07, 0.95, 0.07]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.12, 0.02]} castShadow>
          <boxGeometry args={[0.62, 0.46, 0.04]} />
          <meshStandardMaterial color={C.warn} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.12, 0.045]}>
          <boxGeometry args={[0.07, 0.2, 0.01]} />
          <meshBasicMaterial color={C.white} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.96, 0.045]}>
          <boxGeometry args={[0.07, 0.07, 0.01]} />
          <meshBasicMaterial color={C.white} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Lounge: sofa, TV, konsol. Tempat agent yang nggak ada kerjaan.       */
/* ------------------------------------------------------------------ */

const SOFA = "#4a5668";
const SOFA_DARK = "#3b4553";

/** Layar TV. Nyala cuma kalau ada yang beneran main — kalau lounge kosong,
 * TV-nya mati, sama kayak layar monitor yang padam waktu agent idle. */
function TvScreen({ on }: { on: boolean }) {
  const tex = useMemo(() => gameTexture(), []);
  if (!on) {
    return <meshStandardMaterial color="#14181d" roughness={0.25} metalness={0.2} />;
  }
  return <meshBasicMaterial map={tex} toneMapped={false} />;
}

export function Lounge({ tvOn }: { tvOn: boolean }) {
  const wood = useMemo(() => woodTexture("#7d5a38"), []);
  const runner = useMemo(() => runnerTexture(), []);

  return (
    <group>
      {/* karpet lounge */}
      <mesh position={[LOUNGE.x, 0.007, (LOUNGE.tvZ + LOUNGE.sofaZ) / 2]} receiveShadow>
        <boxGeometry args={[4.6, 0.014, 2.6]} />
        <meshStandardMaterial map={runner} roughness={0.95} />
      </mesh>

      {/* --- sofa, menghadap -z ke arah TV --- */}
      <group position={[LOUNGE.x, 0, LOUNGE.sofaZ]}>
        <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.1, 0.46, 1.02]} />
          <meshStandardMaterial color={SOFA_DARK} roughness={0.95} />
        </mesh>
        {SOFA_SEATS.map((dx) => (
          <mesh key={dx} position={[dx, 0.54, -0.04]} castShadow>
            <boxGeometry args={[0.94, 0.17, 0.88]} />
            <meshStandardMaterial color={SOFA} roughness={0.95} />
          </mesh>
        ))}
        {/* sandaran di sisi +z (belakang orang yang duduk) */}
        <mesh position={[0, 0.74, 0.38]} castShadow>
          <boxGeometry args={[3.1, 0.76, 0.26]} />
          <meshStandardMaterial color={SOFA_DARK} roughness={0.95} />
        </mesh>
        {SOFA_SEATS.map((dx) => (
          <mesh key={`b${dx}`} position={[dx, 0.8, 0.2]} castShadow>
            <boxGeometry args={[0.9, 0.52, 0.15]} />
            <meshStandardMaterial color={SOFA} roughness={0.95} />
          </mesh>
        ))}
        {[-1.68, 1.68].map((ax) => (
          <mesh key={ax} position={[ax, 0.6, 0.06]} castShadow>
            <boxGeometry args={[0.26, 0.56, 1.02]} />
            <meshStandardMaterial color={SOFA_DARK} roughness={0.95} />
          </mesh>
        ))}
        {/* bantal kecil */}
        <mesh position={[-1.25, 0.68, 0.14]} rotation={[0, 0, 0.25]} castShadow>
          <boxGeometry args={[0.38, 0.36, 0.12]} />
          <meshStandardMaterial color="#c0523d" roughness={0.95} />
        </mesh>
      </group>

      {/* --- meja kopi --- */}
      <group position={[LOUNGE.x, 0, (LOUNGE.tvZ + LOUNGE.sofaZ) / 2 + 0.25]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.07, 0.72]} />
          <meshStandardMaterial map={wood} roughness={0.6} />
        </mesh>
        {[
          [-0.65, -0.28],
          [0.65, -0.28],
          [-0.65, 0.28],
          [0.65, 0.28],
        ].map(([lx, lz]) => (
          <mesh key={`${lx}-${lz}`} position={[lx, 0.19, lz]} castShadow>
            <boxGeometry args={[0.07, 0.38, 0.07]} />
            <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
        {/* cangkir + stik nganggur */}
        <mesh position={[-0.5, 0.52, 0.06]} castShadow>
          <boxGeometry args={[0.13, 0.15, 0.13]} />
          <meshStandardMaterial color={C.white} roughness={0.5} />
        </mesh>
        <mesh position={[0.42, 0.46, 0.02]} rotation={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.26, 0.07, 0.17]} />
          <meshStandardMaterial color="#20242b" roughness={0.6} />
        </mesh>
      </group>

      {/* --- rak TV + TV + konsol --- */}
      <group position={[LOUNGE.x, 0, LOUNGE.tvZ]}>
        <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.46, 0.52]} />
          <meshStandardMaterial map={wood} roughness={0.7} />
        </mesh>
        {[-0.6, 0.6].map((dx) => (
          <mesh key={dx} position={[dx, 0.23, 0.265]}>
            <boxGeometry args={[1.1, 0.03, 0.02]} />
            <meshStandardMaterial color="#5f452e" roughness={0.8} />
          </mesh>
        ))}

        {/* konsol PS: badan tipis + lampu status */}
        <group position={[-0.7, 0.51, 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.52, 0.1, 0.3]} />
            <meshStandardMaterial color="#1b1f26" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.056, 0]}>
            <boxGeometry args={[0.46, 0.012, 0.26]} />
            <meshStandardMaterial color="#2c323c" roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.0, 0.152]}>
            <boxGeometry args={[0.2, 0.014, 0.004]} />
            <meshBasicMaterial color={tvOn ? "#6ab7ff" : "#2b3a4a"} toneMapped={false} />
          </mesh>
        </group>

        {/* stik kedua nganggur di rak */}
        <mesh position={[0.72, 0.5, 0.05]} rotation={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.26, 0.07, 0.17]} />
          <meshStandardMaterial color="#20242b" roughness={0.6} />
        </mesh>

        {/* soundbar */}
        <mesh position={[0, 0.52, -0.16]} castShadow>
          <boxGeometry args={[1.5, 0.1, 0.12]} />
          <meshStandardMaterial color="#23272e" roughness={0.7} />
        </mesh>

        {/* TV, layarnya menghadap +z ke arah sofa */}
        <group position={[0, 1.24, -0.04]}>
          <mesh position={[0, -0.52, 0.04]} castShadow>
            <boxGeometry args={[0.5, 0.05, 0.22]} />
            <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, -0.36, 0.04]} castShadow>
            <boxGeometry args={[0.09, 0.3, 0.07]} />
            <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[2.1, 1.2, 0.07]} />
            <meshStandardMaterial color="#15181d" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.015, 0.042]}>
            <planeGeometry args={[1.98, 1.1]} />
            <TvScreen on={tvOn} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Area tidur: buat agent yang udah lama banget nggak ngasih kabar.     */
/* ------------------------------------------------------------------ */

function Bed({ x }: { x: number }) {
  const wood = useMemo(() => woodTexture("#86603a"), []);
  const half = BED.len / 2;
  return (
    <group position={[x, 0, BED.z]}>
      {/* rangka */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[BED.w, 0.44, BED.len]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      {/* kasur */}
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[BED.w - 0.09, 0.22, BED.len - 0.12]} />
        <meshStandardMaterial color="#e9e5db" roughness={0.95} />
      </mesh>
      {/* bantal di sisi kepala (+z) */}
      <mesh position={[0, 0.69, half - 0.42]} castShadow>
        <boxGeometry args={[0.78, 0.15, 0.44]} />
        <meshStandardMaterial color="#f5f2ea" roughness={0.95} />
      </mesh>
      {/* selimut nutupin separuh bawah */}
      <mesh position={[0, 0.68, -0.3]} castShadow>
        <boxGeometry args={[BED.w - 0.05, 0.11, 1.2]} />
        <meshStandardMaterial color="#44607f" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.72, 0.31]}>
        <boxGeometry args={[BED.w - 0.05, 0.05, 0.14]} />
        <meshStandardMaterial color="#5a7897" roughness={0.95} />
      </mesh>
      {/* kepala & kaki ranjang */}
      <mesh position={[0, 0.58, half + 0.05]} castShadow>
        <boxGeometry args={[BED.w, 0.78, 0.1]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.36, -half - 0.05]} castShadow>
        <boxGeometry args={[BED.w, 0.34, 0.1]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
    </group>
  );
}

function Nightstand({ x }: { x: number }) {
  const wood = useMemo(() => woodTexture("#86603a"), []);
  return (
    <group position={[x, 0, BED.z + BED.len / 2 - 0.35]}>
      <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.54, 0.46]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.3, 0.235]}>
        <boxGeometry args={[0.34, 0.03, 0.02]} />
        <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* lampu tidur, redup */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.1, 0.18, 0.1]} />
        <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[0.28, 0.2, 0.28]} />
        <meshStandardMaterial color="#e8cf9a" roughness={0.6} emissive="#4a3a1c" />
      </mesh>
    </group>
  );
}

export function NapArea() {
  return (
    <group>
      {BED_X.map((x) => (
        <Bed key={x} x={x} />
      ))}
      {[
        (BED_X[0] + BED_X[1]) / 2,
        (BED_X[1] + BED_X[2]) / 2,
      ].map((x) => (
        <Nightstand key={x} x={x} />
      ))}
    </group>
  );
}

function Plant({ x, z, big }: { x: number; z: number; big: boolean }) {
  const s = big ? 1 : 0.72;
  const blobs = useMemo(
    () => [
      { p: [0, 0.95, 0], d: [0.62, 0.5, 0.58], c: C.leaf },
      { p: [0.22, 1.28, 0.1], d: [0.46, 0.42, 0.44], c: C.leafDark },
      { p: [-0.2, 1.3, -0.08], d: [0.42, 0.4, 0.4], c: C.leaf },
      { p: [0.04, 1.62, 0.02], d: [0.34, 0.34, 0.32], c: C.leafDark },
    ],
    [],
  );
  return (
    <group position={[x, 0, z]} scale={[s, s, s]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.52, 0.6, 0.52]} />
        <meshStandardMaterial color={C.pot} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.605, 0]}>
        <boxGeometry args={[0.46, 0.04, 0.46]} />
        <meshStandardMaterial color={C.soil} roughness={1} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[0.09, 0.4, 0.09]} />
        <meshStandardMaterial color="#5c7042" roughness={0.9} />
      </mesh>
      {blobs.map((b, i) => (
        <mesh
          key={i}
          position={b.p as [number, number, number]}
          rotation={[0, i * 0.7, 0]}
          castShadow
        >
          <boxGeometry args={b.d as [number, number, number]} />
          <meshStandardMaterial color={b.c} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function Plants() {
  return (
    <>
      {PLANTS.map((p, i) => (
        <Plant key={i} {...p} />
      ))}
    </>
  );
}

export function CeilingLights({ height }: { height: number }) {
  return (
    <>
      {CEILING_LIGHTS.map((l, i) => (
        <group key={i} position={[l.x, height - 0.09, l.z]}>
          <mesh>
            <boxGeometry args={[1.7, 0.1, 0.56]} />
            <meshStandardMaterial color={C.panel} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.056, 0]}>
            <boxGeometry args={[1.58, 0.02, 0.46]} />
            <meshBasicMaterial color="#fff6e2" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Rak dokumen di dinding belakang — ngisi ruang kosong biar kantornya terasa dipakai. */
export function Shelf() {
  const wood = useMemo(() => woodTexture("#8d6239"), []);
  const files = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        dx: -1.55 + i * 0.145,
        h: 0.3 + Math.random() * 0.06,
        c: ["#2f6fc0", "#c23b30", "#3f7d3a", "#b8731f", "#4a4f57"][i % 5],
      })),
    [],
  );
  return (
    <group position={[13, 0, 0.55]}>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.9, 0.42]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      {[0.5, 1.05, 1.6].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.215]}>
            <boxGeometry args={[3.3, 0.03, 0.02]} />
            <meshStandardMaterial color="#6b513a" roughness={0.8} />
          </mesh>
          {files.map((f, i) => (
            <mesh key={i} position={[f.dx, y + f.h / 2 + 0.02, 0.06]} castShadow>
              <boxGeometry args={[0.12, f.h, 0.3]} />
              <meshStandardMaterial color={f.c} roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
