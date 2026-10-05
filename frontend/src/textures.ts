import * as THREE from "three";

/** Tekstur digenerate runtime pakai canvas — nol file asset, nol request keluar.
 *
 * Beda dari versi pertama: resolusinya naik (64-128px) dan filternya Linear,
 * bukan Nearest. Yang bikin sesuatu kebaca "Minecraft" itu pixel gede + grid
 * kubus 1x1. Di sini grain-nya halus dan dipasang di permukaan utuh, jadi
 * bentuknya tetep boxy tapi nggak kebaca sebagai tumpukan block.
 */

type Draw = (ctx: CanvasRenderingContext2D, size: number) => void;

function make(size: number, base: string, draw?: Draw, repeat?: [number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  draw?.(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  return tex;
}

function grain(ctx: CanvasRenderingContext2D, size: number, amount: number) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = 1 + (Math.random() - 0.5) * 2 * amount;
    d[i] = Math.min(255, d[i] * n);
    d[i + 1] = Math.min(255, d[i + 1] * n);
    d[i + 2] = Math.min(255, d[i + 2] * n);
  }
  ctx.putImageData(img, 0, 0);
}

const cache = new Map<string, THREE.Texture>();
function cached(key: string, build: () => THREE.Texture) {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = build();
  cache.set(key, tex);
  return tex;
}

/** Karpet kantor: grain halus, nggak ada pola yang keliatan berulang. */
export const carpetTexture = () =>
  cached("carpet", () =>
    make(
      128,
      "#45515f",
      (ctx, size) => {
        grain(ctx, size, 0.16);
        // serat samar biar nggak flat
        ctx.globalAlpha = 0.06;
        for (let i = 0; i < 260; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillRect(x, y, 2, 1);
        }
        ctx.globalAlpha = 1;
      },
      [9, 6],
    ),
  );

/** Karpet lorong, warna beda biar jalur tengah kebaca. */
export const runnerTexture = () =>
  cached("runner", () =>
    make(
      128,
      "#2f4a63",
      (ctx, size) => grain(ctx, size, 0.14),
      [6, 2],
    ),
  );

/** Parket kayu buat permukaan meja. Garis papan tiap 32px. */
export const woodTexture = (base = "#9c6b3f") =>
  cached(`wood-${base}`, () =>
    make(
      128,
      base,
      (ctx, size) => {
        // variasi warna per papan
        for (let y = 0; y < size; y += 32) {
          ctx.globalAlpha = 0.09;
          ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
          ctx.fillRect(0, y, size, 32);
        }
        ctx.globalAlpha = 1;
        // serat kayu
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        for (let i = 0; i < 70; i++) {
          const y = Math.random() * size;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(size * 0.3, y + 2, size * 0.6, y - 2, size, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // nat antar papan
        ctx.fillStyle = "rgba(0,0,0,.3)";
        for (let y = 0; y < size; y += 32) ctx.fillRect(0, y, size, 1);
        grain(ctx, size, 0.05);
      },
      [2, 2],
    ),
  );

/** Dinding cat: nyaris rata, cuma dikasih grain tipis biar nggak mati. */
export const wallTexture = () =>
  cached("wall", () => make(64, "#e4e0d8", (ctx, size) => grain(ctx, size, 0.035), [6, 2]));

/** Layar monitor: baris-baris "teks" palsu. Warnanya di-tint lewat material,
 * jadi satu tekstur dipakai buat semua state. */
export const screenTexture = () =>
  cached("screen", () => {
    const w = 160;
    const h = 100;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0b1016";
    ctx.fillRect(0, 0, w, h);

    // bar judul
    ctx.fillStyle = "#2a3440";
    ctx.fillRect(0, 0, w, 9);
    ctx.fillStyle = "#4a5866";
    for (let i = 0; i < 3; i++) ctx.fillRect(4 + i * 6, 3, 3, 3);

    // baris teks dengan indentasi acak
    let y = 15;
    while (y < h - 6) {
      const indent = 6 + Math.floor(Math.random() * 3) * 7;
      const len = 18 + Math.random() * (w - indent - 30);
      ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.5})`;
      ctx.fillRect(indent, y, len, 3);
      y += 7;
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  });

/** Lantai parket ruang santai — beda bahan dari karpet ruang kerja, biar
 * pindah ruangan langsung kerasa dari lantainya. */
export const parquetTexture = () =>
  cached("parquet", () =>
    make(
      128,
      "#c49a68",
      (ctx, size) => {
        const cell = 32;
        for (let gy = 0; gy < size; gy += cell) {
          for (let gx = 0; gx < size; gx += cell) {
            const vertical = ((gx / cell + gy / cell) % 2) === 0;
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
            ctx.fillRect(gx, gy, cell, cell);
            ctx.globalAlpha = 0.14;
            ctx.fillStyle = "#000000";
            for (let k = 0; k <= cell; k += 8) {
              if (vertical) ctx.fillRect(gx + k, gy, 1, cell);
              else ctx.fillRect(gx, gy + k, cell, 1);
            }
            ctx.globalAlpha = 0.3;
            ctx.fillRect(gx, gy, cell, 1);
            ctx.fillRect(gx, gy, 1, cell);
          }
        }
        ctx.globalAlpha = 1;
        grain(ctx, size, 0.05);
      },
      [10, 5],
    ),
  );

/** Siaran bola di layar PS. Tampilan kamera samping ala FIFA: lapangan
 * bergaris dengan perspektif, dua tim, skor di kiri atas, timer. */
export const footballTexture = () =>
  cached("football", () => {
    const w = 256;
    const h = 144;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    const HORIZON = 34;

    // tribun
    const stand = ctx.createLinearGradient(0, 0, 0, HORIZON);
    stand.addColorStop(0, "#15181f");
    stand.addColorStop(1, "#2b3340");
    ctx.fillStyle = stand;
    ctx.fillRect(0, 0, w, HORIZON);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${150 + Math.random() * 90},${150 + Math.random() * 90},${160 + Math.random() * 90},${0.1 + Math.random() * 0.3})`;
      ctx.fillRect(Math.random() * w, Math.random() * (HORIZON - 4), 1.6, 1.6);
    }
    // papan iklan pinggir lapangan
    ctx.fillStyle = "#101418";
    ctx.fillRect(0, HORIZON - 7, w, 7);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = ["#1d4ed8", "#0f766e", "#b91c1c", "#1f2937"][i % 4];
      ctx.fillRect(i * 29, HORIZON - 6, 27, 5);
    }

    // rumput, makin ke bawah makin lebar (perspektif)
    const turf = ctx.createLinearGradient(0, HORIZON, 0, h);
    turf.addColorStop(0, "#2f7a3e");
    turf.addColorStop(1, "#3f9a4d");
    ctx.fillStyle = turf;
    ctx.fillRect(0, HORIZON, w, h - HORIZON);

    // garis potong rumput
    for (let i = 0; i < 9; i++) {
      if (i % 2) continue;
      ctx.fillStyle = "rgba(255,255,255,.045)";
      const topW = (w / 9) * 0.55;
      const x0 = w / 2 + (i - 4.5) * topW;
      const x1 = w / 2 + (i - 4.5) * (w / 9);
      ctx.beginPath();
      ctx.moveTo(x0, HORIZON);
      ctx.lineTo(x0 + topW, HORIZON);
      ctx.lineTo(x1 + w / 9, h);
      ctx.lineTo(x1, h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = 1.4;

    // garis tengah (vertikal, melebar ke bawah)
    ctx.beginPath();
    ctx.moveTo(w / 2, HORIZON);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // lingkaran tengah, dibikin elips karena perspektif
    ctx.beginPath();
    ctx.ellipse(w / 2, HORIZON + 62, 46, 17, 0, 0, Math.PI * 2);
    ctx.stroke();

    // garis samping atas & bawah
    ctx.beginPath();
    ctx.moveTo(10, HORIZON + 4);
    ctx.lineTo(w - 10, HORIZON + 4);
    ctx.stroke();

    // kotak penalti kiri & kanan
    for (const side of [-1, 1]) {
      const bx = side < 0 ? 4 : w - 4;
      const inner = side < 0 ? 46 : w - 46;
      ctx.beginPath();
      ctx.moveTo(bx, HORIZON + 26);
      ctx.lineTo(inner, HORIZON + 30);
      ctx.lineTo(inner, HORIZON + 86);
      ctx.lineTo(bx, HORIZON + 100);
      ctx.stroke();
    }

    // gawang
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      const gx = side < 0 ? 6 : w - 6;
      ctx.strokeRect(side < 0 ? 2 : w - 12, HORIZON + 50, 10, 22);
      void gx;
    }

    // pemain: tim merah vs biru, ada bayangan dikit
    const players: [number, number, string][] = [
      [70, 96, "#d12d2d"],
      [96, 74, "#d12d2d"],
      [118, 108, "#d12d2d"],
      [142, 80, "#d12d2d"],
      [60, 62, "#d12d2d"],
      [172, 100, "#d12d2d"],
      [128, 60, "#2a5fd4"],
      [150, 112, "#2a5fd4"],
      [182, 76, "#2a5fd4"],
      [206, 98, "#2a5fd4"],
      [104, 120, "#2a5fd4"],
      [228, 66, "#2a5fd4"],
      [34, 84, "#f5d400"],
    ];
    for (const [px, py, col] of players) {
      const scale = 0.7 + (py - HORIZON) / (h - HORIZON) * 0.7;
      ctx.fillStyle = "rgba(0,0,0,.28)";
      ctx.beginPath();
      ctx.ellipse(px, py + 1, 4 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(px - 2.2 * scale, py - 11 * scale, 4.4 * scale, 7.5 * scale);
      ctx.fillStyle = "#e8c9a0";
      ctx.fillRect(px - 1.6 * scale, py - 14.5 * scale, 3.2 * scale, 3.4 * scale);
      ctx.fillStyle = "#f2f2f0";
      ctx.fillRect(px - 2 * scale, py - 4 * scale, 4 * scale, 4 * scale);
    }

    // bola
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(133, 94, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // papan skor
    ctx.fillStyle = "rgba(8,11,16,.88)";
    ctx.fillRect(8, 8, 96, 17);
    ctx.fillStyle = "#d12d2d";
    ctx.fillRect(8, 8, 4, 17);
    ctx.font = "bold 10px ui-monospace, monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText("XSH", 17, 17);
    ctx.fillText("2 - 1", 44, 17);
    ctx.fillText("MGT", 76, 17);
    ctx.fillStyle = "rgba(8,11,16,.88)";
    ctx.fillRect(8, 27, 40, 13);
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.fillStyle = "#4ade80";
    ctx.fillText("67:24", 14, 34);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  });

/** Papan tulis: putih dengan bekas hapusan samar. */
export const boardTexture = () =>
  cached("board", () =>
    make(128, "#f7f7f4", (ctx, size) => {
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = "#2b3a4a";
      ctx.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, Math.random() * size);
        ctx.lineTo(Math.random() * size, Math.random() * size);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }),
  );
