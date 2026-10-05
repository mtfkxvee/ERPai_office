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

/** Layar TV waktu ada yang main: bidang warna abstrak + bar HUD, jadi dari
 * jauh kebaca "ada game jalan" tanpa perlu gambar game beneran. */
export const gameTexture = () =>
  cached("game", () => {
    const w = 192;
    const h = 108;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // langit -> tanah
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#1b3b6f");
    sky.addColorStop(0.55, "#4a7ab8");
    sky.addColorStop(0.56, "#2f6b3a");
    sky.addColorStop(1, "#1d4426");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // siluet gunung
    ctx.fillStyle = "#15304f";
    for (let i = 0; i < 5; i++) {
      const bx = i * 44 - 10;
      ctx.beginPath();
      ctx.moveTo(bx, 61);
      ctx.lineTo(bx + 22, 61 - (18 + Math.random() * 14));
      ctx.lineTo(bx + 46, 61);
      ctx.closePath();
      ctx.fill();
    }

    // HUD: bar nyawa + minimap
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(6, 6, 58, 7);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(7, 7, 42, 5);
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(6, 16, 40, 5);
    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(7, 17, 29, 3);
    ctx.strokeStyle = "rgba(255,255,255,.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(w - 40, 6, 33, 26);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(w - 26, 18, 3, 3);

    // karakter kecil di tengah
    ctx.fillStyle = "#e8e4dc";
    ctx.fillRect(w / 2 - 4, 54, 8, 16);
    ctx.fillStyle = "#c0523d";
    ctx.fillRect(w / 2 - 4, 58, 8, 7);

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
