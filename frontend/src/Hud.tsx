import { idleText, nameOf, type Placement } from "./store";
import type { Agent, Pose } from "./types";

const DOT: Record<Pose, { c: string; label: string }> = {
  idle: { c: "#c3c8d0", label: "idle" },
  gaming: { c: "#b388ff", label: "main PS" },
  sleeping: { c: "#7a8699", label: "tidur" },
  lounging: { c: "#9aa7bd", label: "leyeh-leyeh" },
  reading: { c: "#a3b58c", label: "baca" },
  pingpong: { c: "#8fc4d6", label: "ping pong" },
  thinking: { c: "#ffd166", label: "mikir" },
  working: { c: "#8ee07a", label: "kerja" },
  blocked: { c: "#f0932b", label: "ketahan" },
  error: { c: "#ff6b5e", label: "error" },
  done: { c: "#5ad7e0", label: "kelar" },
};

const panel: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  padding: "10px 12px",
  borderRadius: 8,
  background: "rgba(16,20,28,.78)",
  color: "#e8eaed",
  font: "12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace",
  backdropFilter: "blur(6px)",
  pointerEvents: "none",
  maxWidth: 280,
};

export function Hud({
  agents,
  placements,
  demo,
  pilot,
}: {
  agents: Agent[];
  placements: Map<string, Placement>;
  demo: boolean;
  pilot?: { agent: string } | null;
}) {
  const now = Date.now();
  // Mode jalan: HUD disembunyikan seluruhnya. Pandangan orang pertama nggak
  // butuh daftar agent, dan peringatan "ini kamu yang menggerakkan" ternyata
  // tidak ada gunanya: mode ini sepenuhnya di sisi browser dan tidak mengirim
  // apa pun, jadi satu-satunya orang yang bisa salah paham adalah yang sedang
  // memegang papan ketik. Keluar lewat Esc atau lepas kunci tetikus.
  if (pilot) return null;

  return (
    <>
      <div style={panel}>
        <div style={{ fontWeight: 700, marginBottom: 6, letterSpacing: 0.3 }}>
          AI OFFICE
          {demo && <span style={{ color: "#f9ca24", marginLeft: 6 }}>· DEMO</span>}
        </div>

        {agents.length === 0 && (
          <div style={{ color: "#9aa0a6" }}>
            Belum ada agent yang lapor.
            <br />
            Office-nya kosong — dan itu jujur.
          </div>
        )}

        {agents.map((a) => {
          const p = placements.get(a.agent)?.pose ?? "idle";
          const d = DOT[p];
          const idle = idleText(a, now);
          return (
            <div key={a.agent} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ color: d.c }}>●</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {nameOf(a)}
              </span>
              {/* Angka ini yang jadi ukuran keaktifan, bukan posisi karakternya
                  — tempat santainya sengaja disebar biar nggak suram. */}
              {idle && <span style={{ color: "#6f7885" }}>{idle}</span>}
              <span style={{ color: d.c }}>{d.label}</span>
            </div>
          );
        })}
      </div>

    </>
  );
}
