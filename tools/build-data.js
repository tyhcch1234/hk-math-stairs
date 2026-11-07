#!/usr/bin/env node
/* 將 data/level-*.json 合併成 js/curriculum.js（可直接以 file:// 開啟，無需伺服器） */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ORDER = ["k1", "k2", "k3", "p1", "p2", "p3", "p4", "p5", "p6", "s1", "s2", "s3", "s4", "s5", "s6"];

const STAGES = [
  { id: "kg", name: "幼稚園", sub: "K1 – K3", color: "#b45309", blurb: "從生活與遊戲建立數感、圖形與比較概念。" },
  { id: "ks1", name: "初小", sub: "小一 – 小三", color: "#15803d", blurb: "位值、四則運算、分數初步與基本量度。" },
  { id: "ks2", name: "高小", sub: "小四 – 小六", color: "#1d4ed8", blurb: "分數小數四則、面積體積、百分數、速率與比例。" },
  { id: "ks3", name: "初中", sub: "中一 – 中三", color: "#6d28d9", blurb: "代數、方程、幾何證明、三角比與概率統計。" },
  { id: "ks4", name: "高中", sub: "中四 – 中六（DSE 必修）", color: "#be123c", blurb: "函數、數列、圓方程、排列組合與應試策略。" }
];

const CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

function isMathSpan(a) {
  if (!a || a.length > 240) return false;
  if (/\\/.test(a)) return true; // 含 TeX 指令，即使 \text{盈利} 也算
  if (CJK.test(a)) return false; // 金額或普通文字
  if (/[=<>^_±°√πΔθ≤≥≠×÷]/.test(a) || /&(gt|lt);/.test(a)) return true;
  if (/^[+\-−]$/.test(a)) return true;
  if (/^[−\-]\d{1,4}$/.test(a)) return true;
  if (/^\(/.test(a)) return true; // 坐標、負數開頭的算式
  if (/^[+\-−]\d{1,4}$/.test(a)) return true;
  if (/^\d+[+\-−*/]\d+(\.\d+)?$/.test(a)) return true;
  if (/^\d+[+\-−*/]\(/.test(a)) return true;
  if (/^\d+\(/.test(a)) return true;
  if (/^[A-Za-z]:[A-Za-z]$/.test(a)) return true;
  if (/^\d+\.\d+$/.test(a)) return true;
  if (/^\d+(,\d+)+$/.test(a)) return true;
  if (/^[−\-]?\d+(,[−\-]?\d+)+$/.test(a)) return true;
  if (/^\d+(\.\d+)?:\d+(\.\d+)?$/.test(a)) return true;
  if (/^\d{1,6}$/.test(a)) return true; // $0$、$32000$ 這類純數字
  if (/^\(\s*[+\-−]\s*,\s*[+\-−]\s*\)$/.test(a)) return true; // $(+,+)$ 象限符號
  // 短代數式（必須含字母，避免把 "$400" 這類金額當數學）
  return /^[A-Za-z0-9+\-*/.,()|\s]{1,24}$/.test(a) && /[A-Za-z]/.test(a);
}

/** 把 $...$ TeX 轉成 \(...\)，逐個掃描，避免與金額 $ 衝突 */
function convertMath(s) {
  if (typeof s !== "string" || s.indexOf("$") === -1) return s;
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "$") {
      out += s[i++];
      continue;
    }
    if (s.startsWith("$$", i)) {
      const k = s.indexOf("$$", i + 2);
      if (k > i + 2) {
        out += "\\[" + s.slice(i + 2, k) + "\\]";
        i = k + 2;
        continue;
      }
    }
    const j = s.indexOf("$", i + 1);
    if (j > i + 1 && isMathSpan(s.slice(i + 1, j))) {
      out += "\\(" + s.slice(i + 1, j) + "\\)";
      i = j + 1;
    } else {
      out += "$";
      i++;
    }
  }
  return out;
}
function walk(v) {
  if (typeof v === "string") return convertMath(v);
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = walk(v[k]);
    return o;
  }
  return v;
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 打散選項位置，令正解不再集中在同一選項 */
function shuffleOptions(levelId, tier, q) {
  const rnd = mulberry32(hashStr(levelId + "|" + tier + "|" + q.q));
  const idx = q.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  const options = idx.map((i) => q.options[i]);
  const answer = idx.indexOf(q.answer);
  return Object.assign({}, q, { options, answer });
}

const levels = [];
for (const id of ORDER) {
  const f = path.join(ROOT, "data/level-" + id + ".json");
  if (!fs.existsSync(f)) {
    console.error("缺少 " + f);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(f, "utf8"));
  const lv = walk(raw);
  ["basic", "advanced", "challenge"].forEach((tier) => {
    if (lv.quiz[tier]) lv.quiz[tier] = lv.quiz[tier].map((q) => shuffleOptions(lv.id, tier, q));
  });
  const tiers = ["basic", "advanced", "challenge"];
  lv.stats = {
    units: lv.units.length,
    questions: tiers.reduce((n, t) => n + (lv.quiz[t] ? lv.quiz[t].length : 0), 0),
    perTier: tiers.map((t) => (lv.quiz[t] ? lv.quiz[t].length : 0))
  };
  lv.stage = (STAGES.find((s) => s.id === lv.stageId) || {}).name || lv.stage;
  levels.push(lv);
}

const meta = {
  title: "香港數學階梯",
  built: new Date().toISOString().slice(0, 10),
  stages: STAGES,
  totals: {
    levels: levels.length,
    units: levels.reduce((n, l) => n + l.stats.units, 0),
    questions: levels.reduce((n, l) => n + l.stats.questions, 0)
  }
};

const out = "/* 由 tools/build-data.js 自動產生，請勿手動編輯 */\nwindow.CURRICULUM = " + JSON.stringify({ meta, levels }, null, 1) + ";\n";
fs.writeFileSync(path.join(ROOT, "js/curriculum.js"), out);
console.log(`js/curriculum.js — ${meta.totals.levels} levels, ${meta.totals.units} units, ${meta.totals.questions} questions, ${(out.length / 1024).toFixed(0)} KB`);
