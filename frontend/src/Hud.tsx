import { effectiveState } from "./store";
import type { Agent, AgentState } from "./types";

const DOT: Record<AgentState, string> = {
  idle: "#9aa0a6",
  thinking: "#f9ca24",
  working: "#6ab04c",
  blocked: "#f0932b",
  error: "#eb4d4b",
  done: "#22a6b3",
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
  maxWidth: 260,
};

export function Hud({ agents, demo }: { agents: Agent[]; demo: boolean }) {
  const now = Date.now();
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
          const s = effectiveState(a, now);
          return (
            <div key={a.agent} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ color: DOT[s] }}>●</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.agent}
              </span>
              <span style={{ color: DOT[s] }}>{s}</span>
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
          font: "11px/1.4 ui-monospace, monospace",
          textShadow: "0 1px 2px rgba(0,0,0,.6)",
          pointerEvents: "none",
          textAlign: "right",
        }}
      >
        drag = muter · scroll = zoom
        <br />
        duduk di meja = kerja · whiteboard = mikir · pantry = idle · matras merah = ketahan
        <br />
        layar monitor ikut warna state agent-nya
      </div>
    </>
  );
}
