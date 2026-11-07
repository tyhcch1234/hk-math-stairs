#!/usr/bin/env node
/* 驗證課程 JSON 結構是否符合 DATA_SPEC.md */
const fs = require("fs");
const path = require("path");

const file = process.argv[2];
if (!file) {
  console.error("用法: node tools/validate.js data/level-xx.json");
  process.exit(2);
}

const errors = [];
const warns = [];
let d;
try {
  d = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error("JSON 解析失敗: " + e.message);
  process.exit(1);
}

const need = ["id", "name", "stage", "stageId", "age", "intro", "strands", "units", "quiz"];
for (const k of need) if (d[k] === undefined) errors.push("缺少欄位 " + k);

const base = path.basename(file, ".json").replace("level-", "");
if (d.id !== base) errors.push(`id (${d.id}) 與檔名 (${base}) 不一致`);
if (!["kg", "ks1", "ks2", "ks3", "ks4"].includes(d.stageId)) errors.push("stageId 不正確: " + d.stageId);
if (typeof d.intro !== "string" || d.intro.length < 30) errors.push("intro 太短（至少 30 字）");

const allowedTags = new Set(["b", "i", "sup", "sub", "br", "span", "ul", "li", "table", "tr", "td", "th"]);
const ids = new Set();

if (!Array.isArray(d.units) || d.units.length < 5) errors.push("units 少於 5 個");
(d.units || []).forEach((u, i) => {
  const p = `units[${i}]`;
  ["id", "title", "en", "strand", "objectives", "teaching", "keywords"].forEach((k) => {
    if (u[k] === undefined) errors.push(`${p} 缺少 ${k}`);
  });
  if (ids.has(u.id)) errors.push(`${p} id 重複: ${u.id}`);
  ids.add(u.id);
  if (!Array.isArray(u.objectives) || u.objectives.length < 3) errors.push(`${p} objectives 少於 3 條`);
  if (!Array.isArray(u.teaching) || u.teaching.length < 4) errors.push(`${p} teaching 少於 4 個區塊`);
  const types = new Set((u.teaching || []).map((t) => t.type));
  ["text", "formula", "example", "tip"].forEach((t) => {
    if (!types.has(t)) errors.push(`${p} 缺少 type="${t}" 的教學區塊`);
  });
  (u.teaching || []).forEach((t, j) => {
    if (!t.html || typeof t.html !== "string") errors.push(`${p}.teaching[${j}] 缺少 html`);
    if (t.type === "example" && !t.title) errors.push(`${p}.teaching[${j}] example 缺少 title`);
    const tags = [...String(t.html).matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1].toLowerCase());
    tags.forEach((tag) => {
      if (!allowedTags.has(tag)) errors.push(`${p}.teaching[${j}] 用了不允許的標籤 <${tag}>`);
    });
    if (/[\n\r]/.test(String(t.html))) errors.push(`${p}.teaching[${j}] html 內有換行，請用 <br>`);
  });
});

let qTotal = 0;
const tiers = { basic: 6, advanced: 5, challenge: 4 };
for (const tier of ["basic", "advanced", "challenge"]) {
  const arr = d.quiz && d.quiz[tier];
  if (!Array.isArray(arr)) {
    errors.push(`quiz.${tier} 不存在`);
    continue;
  }
  if (arr.length < tiers[tier]) warns.push(`quiz.${tier} 只有 ${arr.length} 題（建議 ${tiers[tier]} 題以上）`);
  arr.forEach((q, i) => {
    const p = `quiz.${tier}[${i}]`;
    qTotal++;
    if (!q.q || typeof q.q !== "string") errors.push(`${p} 缺少題目`);
    if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${p} 必須有 4 個選項`);
    if (typeof q.answer !== "number" || q.answer < 0 || q.answer > 3) errors.push(`${p} answer 必須是 0–3`);
    if (!q.explain || String(q.explain).length < 8) errors.push(`${p} explain 太短`);
    if (!ids.has(q.unit)) errors.push(`${p} unit 不存在: ${q.unit}`);
    if (Array.isArray(q.options) && new Set(q.options).size !== q.options.length) errors.push(`${p} 選項有重複`);
    if (/以上皆|全部皆/.test(String((q.options || []).join("")))) warns.push(`${p} 選項含「以上皆」`); 
  });
}
if (qTotal < 15) errors.push("全級題目少於 15 題");

if (warns.length) {
  console.log("WARN:\n  " + warns.join("\n  "));
}
if (errors.length) {
  console.error("FAIL (" + errors.length + "):\n  " + errors.join("\n  "));
  process.exit(1);
}
console.log(`OK ${d.id} — ${d.units.length} units, ${qTotal} questions`);
