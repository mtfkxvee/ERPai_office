import { useMemo } from "react";
import {
  BAR,
  BEANBAGS,
  BEANBAG_SPOTS,
  BED,
  BED_X,
  BOOTH,
  HANGING,
  LIBRARY,
  LOUNGE,
  PARTITION,
  PENDANTS,
  PINGPONG,
  ROOM,
} from "./layout";
import { C, Mug } from "./props";
import { footballTexture, woodTexture } from "./textures";

/** Perabot RUANG SANTAI. Lebih ramai dan lebih berwarna dari ruang kerja —
 * itu yang bikin pindah ruangan langsung kerasa, bukan cuma sekat doang. */

const FABRIC = ["#c0523d", "#3f7d8f", "#b8863b", "#5f7a4a", "#8a5a7d"];

/* ================================================================== */
/* Micro-kitchen — tujuan agent yang baru nganggur                     */
/* ================================================================== */

export function MicroKitchen({ x, counterZ }: { x: number; counterZ: number }) {
  const wood = useMemo(() => woodTexture("#8d6239"), []);
  const jars = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        dx: -1.35 + i * 0.45,
        h: 0.2 + Math.random() * 0.12,
        c: ["#d9a441", "#b8584a", "#5f8a4f", "#c9803f"][i % 4],
      })),
    [],
  );

  return (
    <group position={[x, 0, counterZ]}>
      {/* kabinet bawah + meja dapur */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.2, 0.88, 0.85]} />
        <meshStandardMaterial color="#e3e0d8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.91, 0]} castShadow>
        <boxGeometry args={[6.4, 0.08, 0.95]} />
        <meshStandardMaterial color="#4e5660" roughness={0.35} metalness={0.25} />
      </mesh>
      {[-2.2, -1.1, 1.1, 2.2].map((dx) => (
        <mesh key={dx} position={[dx, 0.6, 0.43]}>
          <boxGeometry args={[0.7, 0.035, 0.03]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}

      {/* bak cuci + keran */}
      <mesh position={[0, 0.93, 0]}>
        <boxGeometry args={[0.72, 0.05, 0.56]} />
        <meshStandardMaterial color="#9aa3ad" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.08, -0.3]} castShadow>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial color={C.metal} roughness={0.25} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.22, -0.2]} castShadow>
        <boxGeometry args={[0.04, 0.04, 0.24]} />
        <meshStandardMaterial color={C.metal} roughness={0.25} metalness={0.8} />
      </mesh>

      {/* mesin kopi */}
      <group position={[-2.1, 1.23, -0.04]}>
        <mesh castShadow>
          <boxGeometry args={[0.56, 0.56, 0.44]} />
          <meshStandardMaterial color={C.plastic} roughness={0.45} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.31, 0]}>
          <boxGeometry args={[0.58, 0.06, 0.46]} />
          <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.12, 0.23]}>
          <boxGeometry args={[0.17, 0.15, 0.04]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0.18, 0.13, 0.225]}>
          <boxGeometry args={[0.06, 0.06, 0.01]} />
          <meshBasicMaterial color="#7de06b" toneMapped={false} />
        </mesh>
      </group>

      {/* cangkir siap pakai */}
      {[-1.4, -1.18, -0.96].map((dx) => (
        <mesh key={dx} position={[dx, 1.03, 0.14]} castShadow>
          <boxGeometry args={[0.13, 0.15, 0.13]} />
          <meshStandardMaterial color={C.white} roughness={0.5} />
        </mesh>
      ))}

      {/* kulkas kaca di ujung kanan */}
      <group position={[3.85, 0, 0.05]}>
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 2.1, 0.78]} />
          <meshStandardMaterial color="#39404a" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.15, 0.4]}>
          <boxGeometry args={[0.92, 1.6, 0.03]} />
          <meshStandardMaterial color="#aed6e8" roughness={0.1} transparent opacity={0.4} />
        </mesh>
        {[0.45, 0.95, 1.45, 1.9].map((y) => (
          <group key={y}>
            <mesh position={[0, y, 0.2]}>
              <boxGeometry args={[0.9, 0.03, 0.5]} />
              <meshStandardMaterial color="#5a626c" roughness={0.6} />
            </mesh>
            {[-0.3, -0.1, 0.1, 0.3].map((dx) => (
              <mesh key={dx} position={[dx, y + 0.11, 0.2]}>
                <boxGeometry args={[0.13, 0.19, 0.13]} />
                <meshStandardMaterial color={FABRIC[(dx * 10 + 4) % 5]} roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* rak snack gantung + jar */}
      <group position={[0.4, 1.95, -0.26]}>
        <mesh castShadow>
          <boxGeometry args={[3.2, 0.06, 0.34]} />
          <meshStandardMaterial map={wood} roughness={0.7} />
        </mesh>
        {jars.map((j) => (
          <mesh key={j.dx} position={[j.dx, 0.03 + j.h / 2, 0]} castShadow>
            <boxGeometry args={[0.24, j.h, 0.24]} />
            <meshStandardMaterial color={j.c} roughness={0.35} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Meja tinggi + bangku, biar ada tempat nongkrong sebentar. */
export function BarTable({ x, z }: { x: number; z: number }) {
  const wood = useMemo(() => woodTexture("#9c6b3f"), []);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 0.9]} />
        <meshStandardMaterial map={wood} roughness={0.6} />
      </mesh>
      {[-0.9, 0.9].map((dx) => (
        <group key={dx}>
          <mesh position={[dx, 0.5, 0]} castShadow>
            <boxGeometry args={[0.09, 1.0, 0.09]} />
            <meshStandardMaterial color={C.darkMetal} roughness={0.45} metalness={0.5} />
          </mesh>
          <mesh position={[dx, 0.03, 0]}>
            <boxGeometry args={[0.5, 0.06, 0.5]} />
            <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
      {[-0.65, 0, 0.65].map((dx, i) => (
        <group key={dx} position={[dx, 0, 0.78]}>
          <mesh position={[0, 0.66, 0]} castShadow>
            <boxGeometry args={[0.42, 0.09, 0.42]} />
            <meshStandardMaterial color={FABRIC[i % FABRIC.length]} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.33, 0]} castShadow>
            <boxGeometry args={[0.07, 0.62, 0.07]} />
            <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.36, 0.04, 0.36]} />
            <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
      <group position={[0.6, 1.14, -0.2]}>
        <Mug color="#3f7d8f" />
      </group>
    </group>
  );
}

/* ================================================================== */
/* Lounge PS — TV nempel dinding kanan, sofa menghadapnya              */
/* ================================================================== */

function TvScreen({ on }: { on: boolean }) {
  const tex = useMemo(() => footballTexture(), []);
  if (!on) {
    return <meshStandardMaterial color="#14181d" roughness={0.25} metalness={0.2} />;
  }
  return <meshBasicMaterial map={tex} toneMapped={false} />;
}

/** Dibangun di ruang lokal (TV di z=0 hadap +z, sofa di z=2.65 hadap -z) lalu
 * grup-nya diputar -90 derajat, jadi local +z jatuh ke world -x. Dengan begitu
 * TV-nya nempel dinding kanan dan sofanya ngadep ke sana. */
export function PsLounge({ tvOn }: { tvOn: boolean }) {
  const wood = useMemo(() => woodTexture("#7d5a38"), []);

  return (
    <group position={[LOUNGE.tvX, 0, LOUNGE.z]} rotation={[0, -Math.PI / 2, 0]}>
      {/* karpet */}
      <mesh position={[0, 0.008, 1.5]} receiveShadow>
        <boxGeometry args={[4.4, 0.016, 3.4]} />
        <meshStandardMaterial color="#6b5a7a" roughness={0.95} />
      </mesh>

      {/* rak media + konsol */}
      <mesh position={[0, 0.23, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.46, 0.5]} />
        <meshStandardMaterial map={wood} roughness={0.7} />
      </mesh>
      <group position={[-0.85, 0.51, -0.03]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.1, 0.3]} />
          <meshStandardMaterial color="#1b1f26" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.056, 0]}>
          <boxGeometry args={[0.46, 0.012, 0.26]} />
          <meshStandardMaterial color="#2c323c" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.152]}>
          <boxGeometry args={[0.2, 0.014, 0.004]} />
          <meshBasicMaterial color={tvOn ? "#6ab7ff" : "#2b3a4a"} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0.9, 0.5, 0.06]} rotation={[0, -0.3, 0]} castShadow>
        <boxGeometry args={[0.26, 0.07, 0.17]} />
        <meshStandardMaterial color="#20242b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.52, -0.2]} castShadow>
        <boxGeometry args={[1.9, 0.1, 0.12]} />
        <meshStandardMaterial color="#23272e" roughness={0.7} />
      </mesh>

      {/* TV gede, layar hadap +z (ke arah sofa) */}
      <group position={[0, 1.55, -0.1]}>
        <mesh castShadow>
          <boxGeometry args={[2.9, 1.66, 0.08]} />
          <meshStandardMaterial color="#15181d" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.02, 0.047]}>
          <planeGeometry args={[2.76, 1.53]} />
          <TvScreen on={tvOn} />
        </mesh>
      </group>

      {/* meja kopi */}
      <group position={[0, 0, 1.55]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.07, 0.78]} />
          <meshStandardMaterial map={wood} roughness={0.6} />
        </mesh>
        {[
          [-0.7, -0.3],
          [0.7, -0.3],
          [-0.7, 0.3],
          [0.7, 0.3],
        ].map(([lx, lz]) => (
          <mesh key={`${lx}-${lz}`} position={[lx, 0.19, lz]} castShadow>
            <boxGeometry args={[0.07, 0.38, 0.07]} />
            <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
        <mesh position={[-0.52, 0.46, 0.04]} rotation={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.26, 0.07, 0.17]} />
          <meshStandardMaterial color="#20242b" roughness={0.6} />
        </mesh>
        <mesh position={[0.45, 0.5, 0]} castShadow>
          <boxGeometry args={[0.3, 0.14, 0.22]} />
          <meshStandardMaterial color="#c9803f" roughness={0.7} />
        </mesh>
      </group>

      {/* sofa 3 orang, hadap -z (ke arah TV) */}
      <group position={[0, 0, 2.65]}>
        <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.1, 0.46, 1.02]} />
          <meshStandardMaterial color="#3b4553" roughness={0.95} />
        </mesh>
        {[-0.88, 0, 0.88].map((dx) => (
          <mesh key={dx} position={[dx, 0.54, -0.04]} castShadow>
            <boxGeometry args={[0.94, 0.17, 0.88]} />
            <meshStandardMaterial color="#4a5668" roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0, 0.74, 0.38]} castShadow>
          <boxGeometry args={[3.1, 0.76, 0.26]} />
          <meshStandardMaterial color="#3b4553" roughness={0.95} />
        </mesh>
        {[-0.88, 0, 0.88].map((dx) => (
          <mesh key={`b${dx}`} position={[dx, 0.8, 0.2]} castShadow>
            <boxGeometry args={[0.9, 0.52, 0.15]} />
            <meshStandardMaterial color="#4a5668" roughness={0.95} />
          </mesh>
        ))}
        {[-1.68, 1.68].map((ax) => (
          <mesh key={ax} position={[ax, 0.6, 0.06]} castShadow>
            <boxGeometry args={[0.26, 0.56, 1.02]} />
            <meshStandardMaterial color="#3b4553" roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[-1.26, 0.68, 0.14]} rotation={[0, 0, 0.25]} castShadow>
          <boxGeometry args={[0.38, 0.36, 0.12]} />
          <meshStandardMaterial color="#c0523d" roughness={0.95} />
        </mesh>
        <mesh position={[1.26, 0.68, 0.14]} rotation={[0, 0, -0.2]} castShadow>
          <boxGeometry args={[0.36, 0.34, 0.12]} />
          <meshStandardMaterial color="#b8863b" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

/* ================================================================== */
/* Nap pods                                                            */
/* ================================================================== */

function NapPod({ x }: { x: number }) {
  const wood = useMemo(() => woodTexture("#86603a"), []);
  const half = BED.len / 2;
  return (
    <group position={[x, 0, BED.z]}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[BED.w, 0.44, BED.len]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[BED.w - 0.09, 0.22, BED.len - 0.12]} />
        <meshStandardMaterial color="#e9e5db" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.69, half - 0.42]} castShadow>
        <boxGeometry args={[0.78, 0.15, 0.44]} />
        <meshStandardMaterial color="#f5f2ea" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.68, -0.3]} castShadow>
        <boxGeometry args={[BED.w - 0.05, 0.11, 1.2]} />
        <meshStandardMaterial color="#44607f" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.72, 0.31]}>
        <boxGeometry args={[BED.w - 0.05, 0.05, 0.14]} />
        <meshStandardMaterial color="#5a7897" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.58, half + 0.05]} castShadow>
        <boxGeometry args={[BED.w, 0.78, 0.1]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.36, -half - 0.05]} castShadow>
        <boxGeometry args={[BED.w, 0.34, 0.1]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      {/* sekat privasi di satu sisi — ini yang bikin kebaca "pod", bukan kamar */}
      <mesh position={[BED.w / 2 + 0.07, 0.95, 0.1]} castShadow>
        <boxGeometry args={[0.08, 1.5, BED.len * 0.86]} />
        <meshStandardMaterial color="#6f7a86" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Nightstand({ x }: { x: number }) {
  const wood = useMemo(() => woodTexture("#86603a"), []);
  return (
    <group position={[x, 0, BED.z + BED.len / 2 - 0.35]}>
      <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.54, 0.44]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.3, 0.225]}>
        <boxGeometry args={[0.32, 0.03, 0.02]} />
        <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
      </mesh>
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

export function NapPods() {
  return (
    <group>
      {BED_X.map((x) => (
        <NapPod key={x} x={x} />
      ))}
      {[(BED_X[0] + BED_X[1]) / 2, (BED_X[1] + BED_X[2]) / 2].map((x) => (
        <Nightstand key={x} x={x} />
      ))}
    </group>
  );
}

/* ================================================================== */
/* Bean bag corner                                                     */
/* ================================================================== */

export function BeanBags({ x, z }: { x: number; z: number }) {
  // Posisi & putarannya dari layout.ts, sumber yang sama dengan yang dipakai
  // buat menaruh karakter. Jangan ditulis ulang di sini.
  const bags = useMemo(
    () => BEANBAG_SPOTS.map((b) => ({ ...b, c: FABRIC[b.c % FABRIC.length] })),
    [],
  );
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.008, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.016, 3.4]} />
        <meshStandardMaterial color="#8a7f6a" roughness={0.95} />
      </mesh>
      {bags.map((b) => (
        <group key={b.dx + b.dz} position={[b.dx, 0, b.dz]} rotation={[0, b.r, 0]}>
          <mesh position={[0, 0.17, 0]} castShadow>
            <boxGeometry args={[0.92, 0.34, 0.92]} />
            <meshStandardMaterial color={b.c} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.42, 0.14]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.72, 0.3, 0.6]} />
            <meshStandardMaterial color={b.c} roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* meja bundar rendah, didekatin pakai dua box diputar */}
      <group position={[0, 0, 0.1]}>
        {[0, Math.PI / 4].map((r) => (
          <mesh key={r} position={[0, 0.38, 0]} rotation={[0, r, 0]} castShadow>
            <boxGeometry args={[0.78, 0.07, 0.78]} />
            <meshStandardMaterial color="#d8d4cc" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.12, 0.38, 0.12]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.45} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.44, 0.04, 0.44]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0.1, 0.46, 0.08]} castShadow>
          <boxGeometry args={[0.26, 0.09, 0.19]} />
          <meshStandardMaterial color="#3f7d8f" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

/* ================================================================== */
/* Ping pong                                                           */
/* ================================================================== */

export function PingPong({ x, z }: { x: number; z: number }) {
  const w = 1.7;
  const l = 3.05;
  const top = 0.84;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, top, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.06, l]} />
        <meshStandardMaterial color="#1e5f8a" roughness={0.6} />
      </mesh>
      {/* garis tepi + garis tengah */}
      <mesh position={[0, top + 0.032, 0]}>
        <boxGeometry args={[0.03, 0.005, l - 0.04]} />
        <meshStandardMaterial color="#f2f1ed" roughness={0.7} />
      </mesh>
      {[-w / 2 + 0.05, w / 2 - 0.05].map((dx) => (
        <mesh key={dx} position={[dx, top + 0.032, 0]}>
          <boxGeometry args={[0.03, 0.005, l - 0.04]} />
          <meshStandardMaterial color="#f2f1ed" roughness={0.7} />
        </mesh>
      ))}
      {/* net */}
      <mesh position={[0, top + 0.12, 0]} castShadow>
        <boxGeometry args={[w + 0.14, 0.18, 0.02]} />
        <meshStandardMaterial color="#2b313a" roughness={0.9} transparent opacity={0.88} />
      </mesh>
      {/* kaki */}
      {[
        [-w / 2 + 0.16, -l / 2 + 0.22],
        [w / 2 - 0.16, -l / 2 + 0.22],
        [-w / 2 + 0.16, l / 2 - 0.22],
        [w / 2 - 0.16, l / 2 - 0.22],
      ].map(([lx, lz]) => (
        <mesh key={`${lx}-${lz}`} position={[lx, top / 2, lz]} castShadow>
          <boxGeometry args={[0.08, top, 0.08]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {/* bet + bola nganggur di atas meja */}
      {[
        { dx: -0.45, dz: -0.95, r: 0.5 },
        { dx: 0.4, dz: 1.0, r: -0.9 },
      ].map((p) => (
        <group key={p.dx} position={[p.dx, top + 0.04, p.dz]} rotation={[0, p.r, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.025, 0.24]} />
            <meshStandardMaterial color="#b8584a" roughness={0.7} />
          </mesh>
          <mesh position={[0.24, 0, 0]} castShadow>
            <boxGeometry args={[0.2, 0.03, 0.08]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.2, top + 0.06, -0.3]}>
        <boxGeometry args={[0.07, 0.07, 0.07]} />
        <meshStandardMaterial color="#f5d400" roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ================================================================== */
/* Phone booth & library nook — nempel sekat                           */
/* ================================================================== */

export function PhoneBooth({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* rangka */}
      {[
        [-0.7, -0.75],
        [0.7, -0.75],
        [-0.7, 0.75],
        [0.7, 0.75],
      ].map(([lx, lz]) => (
        <mesh key={`${lx}-${lz}`} position={[lx, 1.2, lz]} castShadow>
          <boxGeometry args={[0.1, 2.4, 0.1]} />
          <meshStandardMaterial color="#39404a" roughness={0.5} metalness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 2.42, 0]} castShadow>
        <boxGeometry args={[1.5, 0.12, 1.6]} />
        <meshStandardMaterial color="#39404a" roughness={0.6} />
      </mesh>
      {/* kaca: 3 sisi, sisi menghadap +x dibiarin kebuka sebagai pintu */}
      {[
        { p: [0, 1.2, -0.75] as [number, number, number], d: [1.4, 2.3, 0.03] as [number, number, number] },
        { p: [0, 1.2, 0.75] as [number, number, number], d: [1.4, 2.3, 0.03] as [number, number, number] },
        { p: [-0.7, 1.2, 0] as [number, number, number], d: [0.03, 2.3, 1.5] as [number, number, number] },
      ].map((g, i) => (
        <mesh key={i} position={g.p}>
          <boxGeometry args={g.d} />
          <meshStandardMaterial color="#bfe0ef" transparent opacity={0.26} roughness={0.08} />
        </mesh>
      ))}
      {/* meja kecil + bangku */}
      <mesh position={[-0.3, 0.78, 0]} castShadow>
        <boxGeometry args={[0.72, 0.06, 1.2]} />
        <meshStandardMaterial color="#c49a68" roughness={0.65} />
      </mesh>
      <mesh position={[0.28, 0.46, 0]} castShadow>
        <boxGeometry args={[0.44, 0.09, 0.44]} />
        <meshStandardMaterial color={FABRIC[1]} roughness={0.9} />
      </mesh>
      <mesh position={[0.28, 0.22, 0]} castShadow>
        <boxGeometry args={[0.1, 0.42, 0.1]} />
        <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* lampu kecil di plafon booth */}
      <mesh position={[0, 2.33, 0]}>
        <boxGeometry args={[0.6, 0.03, 0.3]} />
        <meshBasicMaterial color="#fff2d8" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function LibraryNook({ x, z }: { x: number; z: number }) {
  const wood = useMemo(() => woodTexture("#7d5a38"), []);
  const books = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        dz: -1.3 + (i % 15) * 0.175,
        row: Math.floor(i / 15),
        h: 0.26 + Math.random() * 0.08,
        c: ["#8a5a7d", "#3f7d8f", "#b8584a", "#5f8a4f", "#c9803f", "#4a4f57"][i % 6],
      })),
    [],
  );
  return (
    <group position={[x, 0, z]}>
      {/* rak buku nempel sekat, hadap +x */}
      <mesh position={[-0.9, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 2.2, 3.0]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      {[0.55, 1.15, 1.75].map((y, r) => (
        <group key={y}>
          <mesh position={[-0.9, y, 0]}>
            <boxGeometry args={[0.4, 0.03, 2.9]} />
            <meshStandardMaterial color="#5f452e" roughness={0.8} />
          </mesh>
          {books
            .filter((b) => b.row === r % 2)
            .map((b, i) => (
              <mesh key={i} position={[-0.82, y + b.h / 2 + 0.02, b.dz]} castShadow>
                <boxGeometry args={[0.24, b.h, 0.14]} />
                <meshStandardMaterial color={b.c} roughness={0.85} />
              </mesh>
            ))}
        </group>
      ))}

      {/* kursi baca */}
      <group position={[0.75, 0, -0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.5, 0.95]} />
          <meshStandardMaterial color={FABRIC[4]} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.56, 0]} castShadow>
          <boxGeometry args={[0.86, 0.16, 0.82]} />
          <meshStandardMaterial color="#9d6b8f" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.78, 0.38]} rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[1.0, 0.72, 0.2]} />
          <meshStandardMaterial color={FABRIC[4]} roughness={0.95} />
        </mesh>
        {[-0.44, 0.44].map((ax) => (
          <mesh key={ax} position={[ax, 0.62, 0]} castShadow>
            <boxGeometry args={[0.14, 0.26, 0.9]} />
            <meshStandardMaterial color={FABRIC[4]} roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* lampu berdiri */}
      <group position={[0.85, 0, 0.85]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.36, 0.06, 0.36]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.05, 1.56, 0.05]} />
          <meshStandardMaterial color={C.darkMetal} roughness={0.45} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.68, 0]} castShadow>
          <boxGeometry args={[0.42, 0.3, 0.42]} />
          <meshStandardMaterial color="#efe0c0" roughness={0.7} emissive="#51411f" />
        </mesh>
      </group>
    </group>
  );
}

/* ================================================================== */
/* Lampu gantung, pot gantung, papan nama                              */
/* ================================================================== */

export function Pendants() {
  return (
    <>
      {PENDANTS.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, ROOM.h - 0.5, 0]}>
            <boxGeometry args={[0.025, 1.0, 0.025]} />
            <meshStandardMaterial color="#2b313a" roughness={0.9} />
          </mesh>
          <mesh position={[0, ROOM.h - 1.08, 0]} castShadow>
            <boxGeometry args={[0.46, 0.26, 0.46]} />
            <meshStandardMaterial
              color={FABRIC[i % FABRIC.length]}
              roughness={0.7}
              emissive="#3a2e16"
            />
          </mesh>
          <mesh position={[0, ROOM.h - 1.21, 0]}>
            <boxGeometry args={[0.34, 0.02, 0.34]} />
            <meshBasicMaterial color="#fff1d4" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function HangingPlants() {
  return (
    <>
      {HANGING.map((h, i) => (
        <group key={i} position={[h.x, 0, h.z]}>
          <mesh position={[0, ROOM.h - h.drop / 2, 0]}>
            <boxGeometry args={[0.018, h.drop, 0.018]} />
            <meshStandardMaterial color="#4a4036" roughness={0.9} />
          </mesh>
          <mesh position={[0, ROOM.h - h.drop - 0.12, 0]} castShadow>
            <boxGeometry args={[0.38, 0.26, 0.38]} />
            <meshStandardMaterial color="#b0836a" roughness={0.85} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh
              key={k}
              position={[
                (k - 1) * 0.11,
                ROOM.h - h.drop - 0.45 - k * 0.1,
                k === 1 ? 0.08 : -0.06,
              ]}
              castShadow
            >
              <boxGeometry args={[0.16, 0.42 + k * 0.1, 0.14]} />
              <meshStandardMaterial color={k % 2 ? C.leafDark : C.leaf} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

/** Papan nama nyala di sekat, sisi ruang santai. */
export function RelaxSign() {
  const bars = useMemo(
    () => [
      { dz: -1.5, h: 0.44 },
      { dz: -1.1, h: 0.6 },
      { dz: -0.7, h: 0.3 },
      { dz: -0.3, h: 0.52 },
      { dz: 0.1, h: 0.38 },
      { dz: 0.5, h: 0.58 },
      { dz: 0.9, h: 0.46 },
    ],
    [],
  );
  return (
    <group position={[PARTITION.x + PARTITION.t + 0.1, 3.2, 4.6]}>
      <mesh castShadow>
        <boxGeometry args={[0.1, 1.0, 3.6]} />
        <meshStandardMaterial color="#1b1f26" roughness={0.8} />
      </mesh>
      {bars.map((b) => (
        <mesh key={b.dz} position={[0.07, -0.5 + b.h / 2 + 0.08, b.dz]}>
          <boxGeometry args={[0.03, b.h, 0.12]} />
          <meshBasicMaterial color="#ff7ad9" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0.07, 0.36, 0]}>
        <boxGeometry args={[0.03, 0.08, 3.1]} />
        <meshBasicMaterial color="#7af0ff" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ================================================================== */

export function RelaxRoom({ tvOn }: { tvOn: boolean }) {
  return (
    <group>
      <MicroKitchen x={28.5} counterZ={1.1} />
      <BarTable x={BAR.x} z={BAR.z} />
      <PsLounge tvOn={tvOn} />
      <NapPods />
      <BeanBags x={BEANBAGS.x} z={BEANBAGS.z} />
      <PingPong x={PINGPONG.x} z={PINGPONG.z} />
      <PhoneBooth x={BOOTH.x} z={BOOTH.z} />
      <LibraryNook x={LIBRARY.x} z={LIBRARY.z} />
      <Pendants />
      <HangingPlants />
      <RelaxSign />
    </group>
  );
}
