#!/usr/bin/env node
/**
 * Penerus hook Claude Code -> AI Office.
 *
 * Tugasnya cuma satu: baca payload hook dari stdin, terusin apa adanya ke
 * endpoint `xsha_office.api.hook`. Pemetaan event -> state dikerjain di server,
 * jadi skrip ini nggak perlu diurus lagi walau nanti pemetaannya berubah.
 *
 * Aturan yang dipegang:
 *   - Nggak pernah nulis ke stdout. Stdout hook itu kanal kendali; JSON di sana
 *     bisa MEMBLOKIR tool call. Diem adalah satu-satunya pilihan aman.
 *   - Selalu exit 0. Office mati, server mati, internet mati — kerjaan Claude
 *     Code nggak boleh ikut berhenti cuma gara-gara hiasan.
 *   - Nol dependency. Cuma Node >= 18 (buat fetch bawaan).
 *
 * Konfigurasi, dicari berurutan:
 *   1. env  XSHA_OFFICE_URL, XSHA_OFFICE_TOKEN, XSHA_OFFICE_AGENT
 *   2. file ~/.xsha-office.json  -> { "url", "token", "agent" }
 *
 * token formatnya "api_key:api_secret".
 *
 * Cek koneksi:  node office-report.mjs --test
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const TIMEOUT_MS = 4000;
const DEBUG = !!process.env.XSHA_OFFICE_DEBUG;

function log(...a) {
  // stderr aman: isinya cuma masuk debug log, nggak dianggap kendali.
  if (DEBUG) console.error("[office]", ...a);
}

function loadConfig() {
  let file = {};
  try {
    file = JSON.parse(readFileSync(join(homedir(), ".xsha-office.json"), "utf8"));
  } catch {
    // nggak ada file konfigurasi itu wajar
  }
  return {
    url: (process.env.XSHA_OFFICE_URL || file.url || "").replace(/\/+$/, ""),
    token: process.env.XSHA_OFFICE_TOKEN || file.token || "",
    agent: process.env.XSHA_OFFICE_AGENT || file.agent || "",
  };
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

async function send(cfg, payload) {
  const url = new URL(`${cfg.url}/api/method/xsha_office.api.hook`);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${cfg.token}`,
        // Nama agent lewat HEADER, bukan query string. Query string hilang
        // kalau request bawa body JSON — Frappe mengganti form_dict dengan isi
        // body. Dulu di sini pakai ?agent= dan nama yang dikonfigurasi
        // diabaikan diam-diam, jatuh ke tebakan dari nama folder kerja.
        ...(cfg.agent ? { "X-Office-Agent": cfg.agent } : {}),
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    log(res.status, text.slice(0, 300));
    return res.ok;
  } catch (e) {
    log("gagal:", e?.message || e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const cfg = loadConfig();

if (process.argv[2] === "--test") {
  // Mode cek: di sini BOLEH ngomong, karena dijalanin manusia di terminal
  // dan bukan sebagai hook.
  if (!cfg.url || !cfg.token) {
    console.error("Belum dikonfigurasi. Isi XSHA_OFFICE_URL dan XSHA_OFFICE_TOKEN,");
    console.error("atau bikin ~/.xsha-office.json berisi { \"url\": ..., \"token\": ... }");
    process.exit(1);
  }
  console.log(`url   : ${cfg.url}`);
  console.log(`agent : ${cfg.agent || "(dari nama folder kerja)"}`);
  const ok = await send(cfg, {
    hook_event_name: "SessionStart",
    cwd: process.cwd(),
    session_id: "test",
  });
  console.log(ok ? "OK — cek /app/ai-office, harusnya ada agent baru" : "GAGAL — jalankan ulang dengan XSHA_OFFICE_DEBUG=1");
  process.exit(ok ? 0 : 1);
}

if (!cfg.url || !cfg.token) {
  log("belum dikonfigurasi, dilewati");
  process.exit(0);
}

const raw = readStdin();
if (!raw.trim()) {
  log("stdin kosong");
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch (e) {
  log("payload bukan JSON:", e?.message);
  process.exit(0);
}

await send(cfg, payload);
// Sengaja selalu 0. Exit code 2 pada PreToolUse akan MEMBLOKIR tool call-nya.
process.exit(0);
