import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { EYE_HEIGHT, getPilot, keyDown, keyUp, look, step } from "./pilot.ts";

/** Kamera orang-pertama + tangkapan papan ketik/tetikus buat mode jalan.
 *
 * Dipasang HANYA saat ada karakter yang dikemudikan, jadi waktu mode biasa
 * tidak ada satu pun pendengar event yang menempel. */
export function Pilot({ onExit }: { onExit: () => void }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        onExit();
        return;
      }
      // Cegah halaman ikut menggulir waktu menekan W/A/S/D atau panah.
      if (
        ["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
      keyDown(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => keyUp(e.code);

    const onMove = (e: MouseEvent) => {
      // Hanya menoleh kalau tetikus memang terkunci, atau tombol kiri ditahan.
      // Tanpa syarat ini, menggerakkan tetikus biasa ikut memutar pandangan.
      const terkunci = document.pointerLockElement === canvas;
      if (!terkunci && e.buttons !== 1) return;
      look(e.movementX * 0.0022, e.movementY * 0.0022);
    };

    const onClick = () => {
      if (document.pointerLockElement !== canvas) {
        // Boleh gagal (izin, atau peramban yang tidak mendukung) — mode seret
        // tetap jalan sebagai cadangan.
        canvas.requestPointerLock?.();
      }
    };

    // Kalau pengguna melepas kunci tetikus dengan Esc, peramban tidak mengirim
    // keydown Escape ke halaman. Jadi lepasnya kunci ikut dianggap keluar.
    const onLockChange = () => {
      if (document.pointerLockElement !== canvas) onExit();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onLockChange);
    canvas.requestPointerLock?.();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onLockChange);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    };
  }, [gl, onExit]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    step(dt);
    const p = getPilot();
    if (!p) return;

    camera.position.set(p.x, EYE_HEIGHT, p.z);
    camera.rotation.order = "YXZ";
    camera.rotation.set(p.pitch, p.yaw, 0);
  });

  return null;
}

/** Bidik di tengah layar. Dipasang di DOM, bukan di dalam kanvas. */
export function Crosshair() {
  const s: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 6,
    height: 6,
    marginLeft: -3,
    marginTop: -3,
    borderRadius: "50%",
    background: "rgba(255,255,255,.75)",
    boxShadow: "0 0 0 1px rgba(0,0,0,.45)",
    pointerEvents: "none",
  };
  return <div style={s} />;
}

