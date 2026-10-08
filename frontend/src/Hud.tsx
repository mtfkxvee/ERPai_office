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
  onExit,
}: {
  agents: Agent[];
  placements: Map<string, Placement>;
  demo: boolean;
  pilot?: { agent: string } | null;
  onExit?: () => void;
}) {
  const now = Date.now();
  const namaDikemudikan = pilot
    ? nameOf(agents.find((a) => a.agent === pilot.agent) ?? ({ agent: pilot.agent } as Agent))
    : null;
  if (pilot) {
    return (
      <>
        <div
          style={{
            ...panel,
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            maxWidth: 460,
            pointerEvents: "auto",
            border: "1px solid rgba(255,214,102,.45)",
          }}
        >
          <div style={{ fontWeight: 700, color: "#ffd166", letterSpacing: 0.3 }}>
            MODE JALAN — {namaDikemudikan}
          </div>
          {/* Penegasan yang disengaja: office ini dibangun dengan aturan
              "cuma tampilkan sinyal nyata". Karakter yang dikemudikan tidak
              mewakili apa pun yang sedang dikerjakan agent-nya. */}
          <div style={{ color: "#c3c8d0", marginTop: 2 }}>
            Kamu yang menggerakkan, bukan agent-nya. Tidak ada yang dicatat.
          </div>
          <button
            onClick={onExit}
            style={{
              marginTop: 8,
              padding: "4px 14px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,.25)",
              background: "rgba(255,255,255,.08)",
              color: "#e8eaed",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Keluar (Esc)
          </button>
        </div>
      </>
    );
  }

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

      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          color: "rgba(255,255,255,.72)",
          font: "11px/1.45 ui-monospace, monospace",
          textShadow: "0 1px 2px rgba(0,0,0,.6)",
          pointerEvents: "none",
          textAlign: "right",
        }}
      >
        drag = muter · scroll = zoom
        <br />
        meja = kerja · whiteboard = mikir · matras merah = ketahan
        <br />
        nganggur &gt;4 menit disebar ke tempat santai — lamanya ada di label
        <br />
        <span style={{ color: "#ffd166" }}>klik karakter buat masuk sudut pandangnya</span>
      </div>
    </>
  );
}
