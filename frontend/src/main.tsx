import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import { AgentChar } from "./AgentChar";
import { hasFrappe, loadInitial, startDemo, subscribe } from "./erp";
import { Hud } from "./Hud";
import { ROOM } from "./layout";
import { Office } from "./Office";
import { resolvePoses, useAgents } from "./store";

const TARGET: [number, number, number] = [ROOM.w / 2, 1.1, ROOM.d / 2];

function Lighting() {
  return (
    <>
      {/* Satu matahari yang bikin bayangan, plus dua fill lemah. Tanpa fill,
          MeshStandardMaterial tanpa environment map kelihatan mati. */}
      <directionalLight
        position={[26, 30, 10]}
        intensity={1.45}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[-14, 12, 20]} intensity={0.35} />
      <directionalLight position={[14, 8, -18]} intensity={0.25} />
      <hemisphereLight args={["#e6eef5", "#6d6458", 0.55]} />
      <ambientLight intensity={0.22} />
    </>
  );
}

function App() {
  const agents = useAgents();
  // Dihitung sekali untuk semua agent: pose DAN tempat duduknya, supaya nggak
  // ada dua karakter di titik yang sama.
  const placements = useMemo(() => resolvePoses(agents, Date.now()), [agents]);
  const [demo] = useState(() => !hasFrappe());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demo) return startDemo();
    loadInitial().catch((e) => setError(String(e?.message || e)));
    return subscribe();
  }, [demo]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Canvas
        shadows
        camera={{ position: [ROOM.w / 2 + 19, 18, ROOM.d / 2 + 27], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={["#ccdce6"]} />
        <fog attach="fog" args={["#ccdce6", 60, 130]} />
        <Lighting />

        <Office agents={agents} placements={placements} />
        {agents.map((a) => {
          const pl = placements.get(a.agent);
          return pl ? <AgentChar key={a.agent} agent={a} placement={pl} /> : null;
        })}

        <OrbitControls
          target={TARGET}
          enablePan={false}
          minDistance={8}
          maxDistance={90}
          // Dijaga di atas garis lantai supaya kamera nggak nyelip ke bawah.
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={0.12}
        />
      </Canvas>

      <Hud agents={agents} placements={placements} demo={demo} />

      {error && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            padding: "8px 10px",
            borderRadius: 6,
            background: "rgba(176,42,42,.92)",
            color: "#fff",
            font: "12px/1.4 ui-monospace, monospace",
          }}
        >
          Gagal ambil data agent: {error}
        </div>
      )}
    </div>
  );
}

let root: Root | null = null;

function mount(el: HTMLElement) {
  if (root) unmount();
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  root = createRoot(el);
  root.render(<App />);
}

function unmount() {
  root?.unmount();
  root = null;
}

export { mount, unmount };
