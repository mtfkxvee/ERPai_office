import { useMemo } from "react";
import {
  DESK_COUNT,
  PARTITION,
  PLANTS,
  RELAX_X0,
  ROOM,
  RUNNER,
  WINDOW_BAND,
} from "./layout";
import {
  BugZone,
  CeilingLights,
  Plant,
  Shelf,
  Whiteboard,
  Workstation,
} from "./props";
import { RelaxRoom } from "./relax";
import { carpetTexture, parquetTexture, runnerTexture, wallTexture } from "./textures";
import type { Agent, AgentState } from "./types";
import { displayPose, effectiveState } from "./store";

const SKIRTING = "#c3bdb2";
const WALL_TOP = 3.1;

/** Dinding depan/belakang: dibikin berjalur (bawah - jendela - atas) supaya
 * ada kaca beneran, bukan tekstur jendela yang ditempel. */
function GlazedWall({ z, flip }: { z: number; flip: boolean }) {
  const wall = useMemo(() => wallTexture(), []);
  const { inset, mullionEvery } = WINDOW_BAND;
  const glassW = ROOM.w - inset * 2;
  const mullions = useMemo(() => {
    const out: number[] = [];
    for (let x = inset + mullionEvery; x < ROOM.w - inset - 0.3; x += mullionEvery) out.push(x);
    return out;
  }, [inset, mullionEvery]);

  return (
    <group>
      <mesh position={[ROOM.w / 2, WINDOW_BAND.y / 2, z]} receiveShadow>
        <boxGeometry args={[ROOM.w, WINDOW_BAND.y, ROOM.wall]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      <mesh position={[ROOM.w / 2, (WALL_TOP + ROOM.h) / 2, z]} receiveShadow>
        <boxGeometry args={[ROOM.w, ROOM.h - WALL_TOP, ROOM.wall]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      {[inset / 2, ROOM.w - inset / 2].map((x) => (
        <mesh key={x} position={[x, WINDOW_BAND.y + WINDOW_BAND.h / 2, z]} receiveShadow>
          <boxGeometry args={[inset, WINDOW_BAND.h, ROOM.wall]} />
          <meshStandardMaterial map={wall} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[ROOM.w / 2, WINDOW_BAND.y + WINDOW_BAND.h / 2, z]}>
        <boxGeometry args={[glassW, WINDOW_BAND.h, 0.045]} />
        <meshStandardMaterial
          color="#bfe0ef"
          transparent
          opacity={0.3}
          roughness={0.08}
          metalness={0.1}
        />
      </mesh>
      {[WINDOW_BAND.y + 0.04, WINDOW_BAND.y + WINDOW_BAND.h - 0.04].map((y) => (
        <mesh key={y} position={[ROOM.w / 2, y, z]}>
          <boxGeometry args={[glassW, 0.08, ROOM.wall * 0.95]} />
          <meshStandardMaterial color="#8e959d" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {mullions.map((x) => (
        <mesh key={x} position={[x, WINDOW_BAND.y + WINDOW_BAND.h / 2, z]}>
          <boxGeometry args={[0.1, WINDOW_BAND.h, ROOM.wall * 0.95]} />
          <meshStandardMaterial color="#8e959d" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      <mesh
        position={[ROOM.w / 2, 0.07, flip ? z - ROOM.wall / 2 - 0.02 : z + ROOM.wall / 2 + 0.02]}
      >
        <boxGeometry args={[ROOM.w, 0.14, 0.05]} />
        <meshStandardMaterial color={SKIRTING} roughness={0.8} />
      </mesh>
    </group>
  );
}

function SideWall({ x, flip }: { x: number; flip: boolean }) {
  const wall = useMemo(() => wallTexture(), []);
  return (
    <group>
      <mesh position={[x, ROOM.h / 2, ROOM.d / 2]} receiveShadow>
        <boxGeometry args={[ROOM.wall, ROOM.h, ROOM.d]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      <mesh
        position={[flip ? x - ROOM.wall / 2 - 0.02 : x + ROOM.wall / 2 + 0.02, 0.07, ROOM.d / 2]}
      >
        <boxGeometry args={[0.05, 0.14, ROOM.d]} />
        <meshStandardMaterial color={SKIRTING} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Sekat pemisah dua ruangan, dengan satu bukaan pintu lebar di tengah.
 * Karakter nggak boleh nembus ini — rutenya diurus `routeTo` di layout.ts. */
function Partition() {
  const wall = useMemo(() => wallTexture(), []);
  const cx = PARTITION.x + PARTITION.t / 2;
  const segA = PARTITION.doorZ0;
  const segB = ROOM.d - PARTITION.doorZ1;
  const doorW = PARTITION.doorZ1 - PARTITION.doorZ0;

  return (
    <group>
      <mesh position={[cx, ROOM.h / 2, segA / 2]} castShadow receiveShadow>
        <boxGeometry args={[PARTITION.t, ROOM.h, segA]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      <mesh
        position={[cx, ROOM.h / 2, PARTITION.doorZ1 + segB / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[PARTITION.t, ROOM.h, segB]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      {/* ambang atas pintu */}
      <mesh
        position={[cx, (PARTITION.doorH + ROOM.h) / 2, PARTITION.doorZ0 + doorW / 2]}
        castShadow
      >
        <boxGeometry args={[PARTITION.t, ROOM.h - PARTITION.doorH, doorW]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      {/* kusen pintu */}
      {[PARTITION.doorZ0, PARTITION.doorZ1].map((z) => (
        <mesh key={z} position={[cx, PARTITION.doorH / 2, z]} castShadow>
          <boxGeometry args={[PARTITION.t + 0.06, PARTITION.doorH, 0.1]} />
          <meshStandardMaterial color="#7d8590" roughness={0.6} metalness={0.25} />
        </mesh>
      ))}
      <mesh position={[cx, PARTITION.doorH, PARTITION.doorZ0 + doorW / 2]}>
        <boxGeometry args={[PARTITION.t + 0.06, 0.1, doorW]} />
        <meshStandardMaterial color="#7d8590" roughness={0.6} metalness={0.25} />
      </mesh>
    </group>
  );
}

function Shell() {
  const carpet = useMemo(() => carpetTexture(), []);
  const parquet = useMemo(() => parquetTexture(), []);
  const runner = useMemo(() => runnerTexture(), []);
  const relaxW = ROOM.w - RELAX_X0;

  return (
    <group>
      {/* Lantai dibedain per ruangan: ruang kerja karpet, ruang santai parket.
          Ini yang bikin pindah ruangan langsung kerasa dari bawah kaki. */}
      <mesh position={[PARTITION.x / 2, -0.1, ROOM.d / 2]} receiveShadow>
        <boxGeometry args={[PARTITION.x, 0.2, ROOM.d]} />
        <meshStandardMaterial map={carpet} roughness={0.95} />
      </mesh>
      <mesh position={[RELAX_X0 + relaxW / 2, -0.1, ROOM.d / 2]} receiveShadow>
        <boxGeometry args={[relaxW, 0.2, ROOM.d]} />
        <meshStandardMaterial map={parquet} roughness={0.75} />
      </mesh>

      {/* karpet lorong ruang kerja */}
      <mesh position={[RUNNER.x + RUNNER.w / 2, 0.006, RUNNER.z + RUNNER.d / 2]} receiveShadow>
        <boxGeometry args={[RUNNER.w, 0.012, RUNNER.d]} />
        <meshStandardMaterial map={runner} roughness={0.95} />
      </mesh>

      <GlazedWall z={-ROOM.wall / 2} flip={false} />
      <GlazedWall z={ROOM.d + ROOM.wall / 2} flip />
      <SideWall x={-ROOM.wall / 2} flip={false} />
      <SideWall x={ROOM.w + ROOM.wall / 2} flip />
      <Partition />

      <CeilingLights height={ROOM.h} />
    </group>
  );
}

export function Office({ agents }: { agents: Agent[] }) {
  // Layar monitor nyala sesuai state agent yang duduk di meja itu, dan TV di
  // lounge nyala cuma kalau ada yang beneran main.
  const { stateByDesk, tvOn } = useMemo(() => {
    const now = Date.now();
    const map = new Map<number, AgentState>();
    let gaming = false;
    for (const a of agents) {
      const idx = ((a.desk_index % DESK_COUNT) + DESK_COUNT) % DESK_COUNT;
      map.set(idx, effectiveState(a, now));
      if (displayPose(a, now) === "gaming") gaming = true;
    }
    return { stateByDesk: map, tvOn: gaming };
  }, [agents]);

  return (
    <group>
      <Shell />

      {/* ruang kerja */}
      {Array.from({ length: DESK_COUNT }, (_, i) => (
        <Workstation key={i} deskIndex={i} state={stateByDesk.get(i) ?? "idle"} />
      ))}
      <Whiteboard />
      <BugZone />
      <Shelf />

      {/* ruang santai */}
      <RelaxRoom tvOn={tvOn} />

      {PLANTS.map((p, i) => (
        <Plant key={i} {...p} />
      ))}
    </group>
  );
}
