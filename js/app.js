/* 香港數學階梯 — 前端應用 */
(function () {
  "use strict";

  var DATA = window.CURRICULUM;
  var LEVELS = DATA.levels;
  var STAGES = DATA.meta.stages;
  var EN_NAME = {
    k1: "Kindergarten 1", k2: "Kindergarten 2", k3: "Kindergarten 3",
    p1: "Primary 1", p2: "Primary 2", p3: "Primary 3", p4: "Primary 4", p5: "Primary 5", p6: "Primary 6",
    s1: "Secondary 1", s2: "Secondary 2", s3: "Secondary 3", s4: "Secondary 4", s5: "Secondary 5", s6: "Secondary 6"
  };

  var TIERS = [
    { id: "basic", name: "基礎", en: "Foundation", desc: "緊扣課本基本概念與直接運算，檢查是否真正掌握定義。" },
    { id: "advanced", name: "進階", en: "Advanced", desc: "兩步以上的應用題與策略選擇，訓練把概念轉成解題步驟。" },
    { id: "challenge", name: "挑戰", en: "Challenge", desc: "非典型題目與常見陷阱，適合準備考試或拔尖。" }
  ];

  var view = document.getElementById("view");
  var strip = document.getElementById("gradeStrip");
  var toastEl = document.getElementById("toast");

  /* ---------------- 進度與設定 ---------------- */
  var PKEY = "hkmath.progress.v1";
  var SKEY = "hkmath.settings.v1";

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var progress = readJSON(PKEY, {});
  var settings = readJSON(SKEY, { theme: null, instant: false });

  function bestOf(levelId, tier) {
    return progress[levelId] && progress[levelId][tier] ? progress[levelId][tier] : null;
  }
  function completedCount() {
    var n = 0;
    LEVELS.forEach(function (l) {
      TIERS.forEach(function (t) { if (bestOf(l.id, t.id)) n++; });
    });
    return n;
  }
  function levelProgress(l) {
    var sum = 0, n = 0;
    TIERS.forEach(function (t) {
      var b = bestOf(l.id, t.id);
      sum += b ? b.pct : 0;
      n++;
    });
    return Math.round(sum / n);
  }

  /* ---------------- 小工具 ---------------- */
  function esc(s) {
    // 保留 &gt; &lt; 等實體，否則數學式內的 &gt; 會變成字面文字
    return String(s)
      .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{0,7}|#\d{1,6}|#x[0-9a-fA-F]{1,5});)/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function stageOf(l) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === l.stageId) return STAGES[i];
    return STAGES[0];
  }
  function levelById(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return null;
  }
  function tierMeta(id) {
    for (var i = 0; i < TIERS.length; i++) if (TIERS[i].id === id) return TIERS[i];
    return TIERS[0];
  }
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function unitsByStrand(level) {
    var map = {};
    level.units.forEach(function (u) { map[u.strand] = (map[u.strand] || 0) + 1; });
    return map;
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ---------------- 數學渲染 ---------------- */
  var katexReady = false;
  function renderMath(root) {
    if (!root) return;
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(root, {
          delimiters: [
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false }
          ],
          throwOnError: false,
          strict: false,
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"]
        });
        katexReady = true;
        return;
      } catch (e) { /* fallthrough */ }
    }
    // 後備：沒有 KaTeX 時移除分隔符，至少保持可讀
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      if (node.nodeValue.indexOf("\\(") > -1 || node.nodeValue.indexOf("\\[") > -1) {
        node.nodeValue = node.nodeValue.replace(/\\\(|\\\)|\\\[|\\\]/g, "");
      }
    });
  }

  /* ---------------- 頁首年級列 ---------------- */
  function buildStrip() {
    var html = "";
    STAGES.forEach(function (st) {
      html += '<div class="gs-group"><span class="gs-label">' + esc(st.name) + "</span>";
      LEVELS.filter(function (l) { return l.stageId === st.id; }).forEach(function (l) {
        var done = TIERS.some(function (t) { return bestOf(l.id, t.id); });
        html += '<a class="gs-link' + (done ? " done" : "") + '" data-level="' + l.id + '" href="#/grade/' + l.id + '">' + esc(l.name.replace(/^幼稚園\s*/, "")) + "</a>";
      });
      html += "</div>";
    });
    strip.innerHTML = html;
  }
  function markStrip(levelId) {
    Array.prototype.forEach.call(strip.querySelectorAll(".gs-link"), function (a) {
      a.classList.toggle("active", a.getAttribute("data-level") === levelId);
      var b = a.getAttribute("data-level");
      var done = TIERS.some(function (t) { return bestOf(b, t.id); });
      a.classList.toggle("done", done);
    });
  }

  /* ---------------- 頁面：首頁 ---------------- */
  function homeView() {
    var totals = DATA.meta.totals;
    var done = completedCount();
    var stageCards = STAGES.map(function (st) {
      var items = LEVELS.filter(function (l) { return l.stageId === st.id; });
      var chips = items.map(function (l) {
        var p = levelProgress(l);
        return '<a class="grade-chip" href="#/grade/' + l.id + '">' +
          '<span class="gc-name">' + esc(l.name) + "</span>" +
          '<span class="gc-meta">' + l.stats.units + " 單元 · " + l.stats.questions + " 題</span>" +
          '<span class="gc-bar"><i style="width:' + p + '%"></i></span>' +
          "</a>";
      }).join("");
      return '<article class="stage-card" style="--stage:' + st.color + '">' +
        '<div class="stage-top"><span class="stage-name">' + esc(st.name) + '</span><span class="stage-sub">' + esc(st.sub) + "</span></div>" +
        '<p class="stage-blurb">' + esc(st.blurb) + "</p>" +
        '<div class="grade-grid">' + chips + "</div>" +
        "</article>";
    }).join("");

    return '<section class="hero view-enter">' +
        '<div class="hero-copy">' +
          '<span class="eyebrow">香港課程 · 幼稚園至中六</span>' +
          "<h1>由數數到函數，<br>一條走得完的<em>數學階梯</em></h1>" +
          '<p class="lede">按香港課程編排的 15 個年級、' + totals.units + " 個學習單位。每級都有教學要點、例題、常犯錯誤，以及基礎、進階、挑戰三份附詳解的測驗。</p>" +
          '<div class="hero-actions">' +
            '<a class="btn primary" href="#/grade/p1">由小一銜接開始</a>' +
            '<a class="btn ghost" href="#/map">查看課程地圖</a>' +
          "</div>" +
        "</div>" +
        '<div class="hero-panel">' +
          '<div class="stats">' +
            "<div class=\"stat\"><b>" + totals.levels + "</b><span>年級</span></div>" +
            "<div class=\"stat\"><b>" + totals.units + "</b><span>學習單位</span></div>" +
            "<div class=\"stat\"><b>" + totals.questions + "</b><span>測驗題目</span></div>" +
          "</div>" +
          '<div class="panel-note">' +
            '<div class="dot-row"><i></i><i style="opacity:.6"></i><i style="opacity:.3"></i></div>' +
            "<b>你的進度：</b>已完成 " + done + " / " + (LEVELS.length * 3) + " 份測驗。<br>進度只儲存在這部裝置的瀏覽器，不會上傳。" +
          "</div>" +
        "</div>" +
      "</section>" +
      '<section class="section">' +
        '<div class="section-head"><div><h2 class="section-title">按階段選擇年級</h2><p class="section-sub">五個學習階段，每個年級按範疇編排單元，可跳讀、可重溫。</p></div><a class="section-link" href="#/map">完整課程地圖</a></div>' +
        '<div class="stage-grid">' + stageCards + "</div>" +
      "</section>" +
      '<section class="section">' +
        '<div class="section-head"><div><h2 class="section-title">怎樣用這個網站</h2></div></div>' +
        '<div class="steps">' +
          '<div class="step"><div class="step-num">01</div><h3>先讀單元，再做题</h3><p>每個單元有學習目標、核心公式、完整例題與常犯錯誤。讀完才進入測驗，效果最好。</p></div>' +
          '<div class="step"><div class="step-num">02</div><h3>由基礎做起</h3><p>基礎卷低於 80% 就先重讀該單元；進階與挑戰卷用來檢查能否遷移到新情境。</p></div>' +
          '<div class="step"><div class="step-num">03</div><h3>看詳解，不只對答案</h3><p>每題都有解釋與步驟。答錯的題目請回去找對應單元，補回那個概念。</p></div>' +
        "</div>" +
      "</section>";
  }

  /* ---------------- 頁面：課程地圖 ---------------- */
  function mapView() {
    var strands = ["數與代數", "度量", "圖形與空間", "數據處理"];
    var rows = LEVELS.map(function (l) {
      var st = stageOf(l);
      var names = l.units.map(function (u) { return u.title; }).join("、");
      return "<tr>" +
        '<td class="lv"><span class="stage-dot" style="--stage:' + st.color + '"></span><a href="#/grade/' + l.id + '">' + esc(l.name.replace(/^幼稚園\s*/, "")) + "</a></td>" +
        "<td>" + esc(st.name) + "</td>" +
        '<td class="num">' + l.stats.units + "</td>" +
        '<td class="units-cell" style="--stage:' + st.color + '">' + esc(names) + "</td>" +
        '<td class="num">' + l.stats.questions + "</td>" +
        "</tr>";
    }).join("");

    var matrix = LEVELS.map(function (l) {
      var map = unitsByStrand(l);
      var cells = strands.map(function (s) {
        return "<td>" + (map[s] ? '<span class="on" style="--stage:' + stageOf(l).color + '">●</span>' : '<span class="off">·</span>') + "</td>";
      }).join("");
      return '<tr><td><a href="#/grade/' + l.id + '">' + esc(l.name) + "</a></td>" + cells + "</tr>";
    }).join("");

    return '<div class="view-enter">' +
      '<span class="eyebrow">課程地圖</span>' +
      '<h1 class="section-title" style="margin:12px 0 6px;font-size:clamp(26px,3.4vw,34px)">十五個年級，四個範疇</h1>' +
      '<p class="section-sub" style="max-width:70ch">香港數學課程以「數與代數、度量、圖形與空間、數據處理」四個範疇貫穿幼稚園至中六。下表列出每個年級的單元與題量，可點擊年級進入。</p>' +
      '<section class="section" style="margin-top:26px"><div class="table-wrap"><table class="map"><thead><tr><th>年級</th><th>階段</th><th class="num">單元</th><th>學習單位</th><th class="num">題目</th></tr></thead><tbody>' + rows + "</tbody></table></div></section>" +
      '<section class="section"><div class="section-head"><div><h2 class="section-title">範疇分佈</h2><p class="section-sub">● 表示該年級涵蓋此範疇。</p></div></div>' +
        '<div class="table-wrap"><table class="map matrix"><thead><tr><th>年級</th>' + strands.map(function (s) { return "<th>" + s + "</th>"; }).join("") + "</tr></thead><tbody>" + matrix + "</tbody></table></div>" +
      "</section>" +
      "</div>";
  }

  /* ---------------- 頁面：年級 ---------------- */
  function gradeView(levelId, unitId) {
    var l = levelById(levelId);
    if (!l) return notFound();
    var st = stageOf(l);
    var stVars = 'style="--stage:' + st.color + '"';

    var unitNav = l.units.map(function (u, i) {
      return '<li><a href="#/grade/' + l.id + "/u/" + u.id + '" data-unit="' + u.id + '"><i>' + pad(i + 1) + "</i><span>" + esc(u.title) + "</span></a></li>";
    }).join("");

    var tierRows = TIERS.map(function (t) {
      var b = bestOf(l.id, t.id);
      return '<div class="tier-mini"><span>' + t.name + " · " + (l.quiz[t.id] || []).length + ' 題</span><span class="score">' + (b ? b.pct + "%" : "—") + "</span></div>";
    }).join("");

    var tierCards = TIERS.map(function (t) {
      var b = bestOf(l.id, t.id);
      var n = (l.quiz[t.id] || []).length;
      return '<div class="tier-card ' + t.id + '">' +
        '<span class="tier-badge">' + t.en + "</span>" +
        "<h3>" + t.name + "卷</h3>" +
        "<p>" + t.desc + "</p>" +
        '<div class="tier-meta"><span>' + n + ' 題 · 4 選 1</span><span>最佳 <b>' + (b ? b.pct + "%" : "—") + "</b></span></div>" +
        '<a class="btn' + (t.id === "basic" ? " primary" : "") + '" href="#/grade/' + l.id + "/quiz/" + t.id + '">開始' + t.name + "卷</a>" +
        "</div>";
    }).join("");

    var units = l.units.map(function (u, i) {
      var blocks = u.teaching.map(function (b) {
        if (b.type === "formula") {
          return '<div class="block block-formula"><span class="block-label">公式 / 定義</span><div>' + b.html + "</div></div>";
        }
        if (b.type === "example") {
          return '<div class="block block-example"><span class="block-label">例題</span><h4>' + b.title.replace(/^例題[:：]\s*/, "") + '</h4><div class="body">' + b.html + "</div></div>";
        }
        if (b.type === "tip") {
          return '<div class="block block-tip"><span class="block-label">留意</span><div>' + b.html + "</div></div>";
        }
        return '<div class="block block-text">' + b.html + "</div>";
      }).join("");

      return '<article class="unit" id="' + u.id + '"' + stVars + ">" +
        '<div class="unit-head">' +
          '<div class="unit-num">' + pad(i + 1) + "</div>" +
          '<div class="unit-titles"><h2 class="unit-title">' + esc(u.title) + '</h2><p class="unit-en">' + esc(u.en) + "</p></div>" +
          '<span class="strand-pill">' + esc(u.strand) + "</span>" +
        "</div>" +
        '<div class="objectives"><h4>學習目標</h4><ul>' + u.objectives.map(function (o) { return "<li>" + o + "</li>"; }).join("") + "</ul></div>" +
        '<div class="blocks">' + blocks + "</div>" +
        '<div class="keywords">' + u.keywords.map(function (k) { return '<span class="kw">' + esc(k) + "</span>"; }).join("") + "</div>" +
        "</article>";
    }).join("");

    return '<div class="view-enter">' +
      '<div class="crumb"><a href="#/">首頁</a><span class="sep">/</span><a href="#/map">' + esc(st.name) + '</a><span class="sep">/</span><span>' + esc(l.name) + "</span></div>" +
      '<header class="grade-head"' + stVars + ">" +
        '<div class="grade-title"><h1>' + esc(l.name) + '</h1><span class="en">' + esc(EN_NAME[l.id] || st.name) + "</span></div>" +
        '<div class="grade-meta"><span>' + esc(l.age) + "</span>" + (l.weeklyLessons ? "<span>每週 " + l.weeklyLessons + " 節</span>" : "<span>遊戲與生活情境</span>") + "<span>" + l.stats.units + " 個學習單位</span><span>" + l.stats.questions + " 道測驗題</span></div>" +
        '<p class="grade-intro">' + esc(l.intro) + "</p>" +
        '<div class="strand-chips"><span class="chip stage">' + esc(l.stage) + "</span>" + l.strands.map(function (s) { return '<span class="chip">' + esc(s) + "</span>"; }).join("") + "</div>" +
      "</header>" +
      '<div class="grade-layout">' +
        '<div class="units">' + units +
          '<section class="section" id="quiz-panel" style="margin-top:32px">' +
            '<div class="section-head"><div><h2 class="section-title">' + esc(l.name) + '的三程度測驗</h2><p class="section-sub">基礎 → 進階 → 挑戰，逐級檢查能否把概念遷移到新題型。</p></div></div>' +
            '<div class="tier-grid">' + tierCards + "</div>" +
          "</section>" +
        "</div>" +
        '<aside class="aside">' +
          '<div class="side-card unit-list-card"><p class="side-title">本級單元</p><ul class="unit-nav-list">' + unitNav + "</ul></div>" +
          '<div class="side-card side-quiz"><p class="side-title">快速開始</p>' + tierRows +
            '<a class="btn primary" href="#/grade/' + l.id + '/quiz/basic">開始基礎卷</a>' +
            '<button class="btn ghost small" type="button" data-action="print" style="width:100%;margin-top:8px">列印教學內容</button>' +
          "</div>" +
        "</aside>" +
      "</div>" +
      "</div>";
  }

  /* ---------------- 頁面：測驗中心 ---------------- */
  function quizCenterView() {
    var blocks = STAGES.map(function (st) {
      var rows = LEVELS.filter(function (l) { return l.stageId === st.id; }).map(function (l) {
        var btns = TIERS.map(function (t) {
          var b = bestOf(l.id, t.id);
          return '<a class="btn small' + (b ? "" : " ghost") + '" href="#/grade/' + l.id + "/quiz/" + t.id + '">' +
            t.name + (b ? " " + b.pct + "%" : "") + "</a>";
        }).join("");
        return '<div class="qc-row"><span class="qc-name">' + esc(l.name.replace(/^幼稚園\s*/, "")) + "</span>" + btns + "</div>";
      }).join("");
      return '<div class="side-card" style="margin-bottom:14px;--stage:' + st.color + '"><p class="side-title" style="color:' + st.color + '">' + esc(st.name) + " · " + esc(st.sub) + "</p>" + rows + "</div>";
    }).join("");

    return '<div class="view-enter">' +
      '<span class="eyebrow">測驗中心</span>' +
      '<h1 class="section-title" style="margin:12px 0 6px;font-size:clamp(26px,3.4vw,34px)">選一個年級，選一個程度</h1>' +
      '<p class="section-sub" style="max-width:70ch">每份測驗完卷後即時評分，逐題顯示正確答案與詳解，最佳成績會自動記錄。</p>' +
      '<div style="margin-top:24px;max-width:860px">' + blocks + "</div>" +
      "</div>";
  }

  /* ---------------- 頁面：測驗 ---------------- */
  var Q = null;

  function startQuiz(levelId, tier) {
    var l = levelById(levelId);
    if (!l || !l.quiz[tier]) return null;
    Q = {
      levelId: levelId,
      tier: tier,
      i: 0,
      answers: l.quiz[tier].map(function () { return null; }),
      checked: l.quiz[tier].map(function () { return false; }),
      submitted: false
    };
    return Q;
  }

  function quizView(levelId, tier) {
    var l = levelById(levelId);
    if (!l || !l.quiz[tier]) return notFound();
    if (!Q || Q.levelId !== levelId || Q.tier !== tier) startQuiz(levelId, tier);
    var meta = tierMeta(tier);
    var st = stageOf(l);
    var qs = l.quiz[tier];

    if (Q.submitted) return resultView(l, meta, qs);

    var q = qs[Q.i];
    var unit = l.units.filter(function (u) { return u.id === q.unit; })[0];
    var pct = Math.round((Q.i / qs.length) * 100);
    var answered = Q.answers[Q.i] !== null;
    var revealed = settings.instant && Q.checked[Q.i];

    var options = q.options.map(function (opt, idx) {
      var cls = "option";
      if (revealed) {
        if (idx === q.answer) cls += " correct";
        else if (Q.answers[Q.i] === idx) cls += " wrong";
      } else if (Q.answers[Q.i] === idx) cls += " picked";
      return '<button type="button" class="' + cls + '" data-action="pick" data-idx="' + idx + '"' + (revealed ? " disabled" : "") + ">" +
        '<span class="opt-letter">' + "ABCD"[idx] + "</span><span>" + opt + "</span></button>";
    }).join("");

    var feedback = "";
    if (revealed) {
      var ok = Q.answers[Q.i] === q.answer;
      feedback = '<div class="feedback ' + (ok ? "good" : "bad") + '"><b>' + (ok ? "答對了" : "答案不是這個") + "</b>" + q.explain + "</div>";
    }

    return '<div class="quiz-shell view-enter">' +
      '<div class="quiz-top"><div class="crumb"><a href="#/grade/' + l.id + '">' + esc(l.name) + '</a><span class="sep">/</span><span>' + meta.name + "測驗</span></div>" +
        '<a class="btn small ghost" href="#/grade/' + l.id + '">返回教學</a></div>' +
      '<div class="qbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="q-card">' +
        '<p class="q-index">第 <b>' + (Q.i + 1) + "</b> / " + qs.length + " 題" + (unit ? " · " + esc(unit.title) : "") + "</p>" +
        '<p class="q-text">' + q.q + "</p>" +
        '<div class="options" role="group" aria-label="選項">' + options + "</div>" +
        feedback +
        '<div class="quiz-foot">' +
          '<button class="btn ghost small" type="button" data-action="prev"' + (Q.i === 0 ? " disabled" : "") + ">上一題</button>" +
          '<label class="instant-toggle"><input type="checkbox" data-action="instant"' + (settings.instant ? " checked" : "") + ">作答後即時看答案</label>" +
          '<span class="spacer"></span>' +
          (Q.i === qs.length - 1
            ? '<button class="btn primary" type="button" data-action="submit"' + (Q.answers.some(function (a) { return a === null; }) ? " disabled" : "") + ">提交測驗</button>"
            : '<button class="btn primary" type="button" data-action="next"' + (answered ? "" : " disabled") + ">下一題</button>") +
        "</div>" +
      "</div>" +
      "</div>";
  }

  function resultView(l, meta, qs) {
    var correct = 0;
    qs.forEach(function (q, i) { if (Q.answers[i] === q.answer) correct++; });
    var pct = Math.round((correct / qs.length) * 100);
    var msg = pct >= 90 ? "掌握得很好，可以挑戰下一個年級。" : pct >= 75 ? "基礎穩固，仍有小部分要補。" : pct >= 50 ? "概念未完全穩定，建議重讀標記的單元。" : "先回到教學內容，逐個單元重讀再做。";
    var prev = bestOf(l.id, meta.id);
    var isBest = !prev || pct > prev.pct;
    if (isBest) {
      progress[l.id] = progress[l.id] || {};
      progress[l.id][meta.id] = { pct: pct, correct: correct, total: qs.length, at: new Date().toISOString().slice(0, 10) };
      writeJSON(PKEY, progress);
      buildStrip();
    }

    var review = qs.map(function (q, i) {
      var ok = Q.answers[i] === q.answer;
      var chosen = Q.answers[i] === null ? "未作答" : q.options[Q.answers[i]];
      return '<div class="review-item">' +
        '<div class="review-head"><span class="review-mark ' + (ok ? "ok" : "no") + '">' + (ok ? "✓" : "✕") + "</span><span>" + (i + 1) + ". " + q.q + "</span></div>" +
        '<div class="review-body">' +
          (ok ? "" : '<div class="ans-line">你的答案：<b>' + chosen + "</b></div>") +
          '<div class="ans-line">正確答案：<b>' + q.options[q.answer] + "</b></div>" +
          '<div class="exp">' + q.explain + "</div>" +
        "</div></div>";
    }).join("");

    var nextTier = meta.id === "basic" ? "advanced" : meta.id === "advanced" ? "challenge" : null;

    return '<div class="quiz-shell view-enter">' +
      '<div class="result">' +
        '<p class="q-index">' + esc(l.name) + " · " + meta.name + "測驗</p>" +
        '<p class="score-big">' + pct + "<span>%</span></p>" +
        "<h2>" + correct + " / " + qs.length + " 題正確</h2>" +
        '<p class="result-sub">' + msg + (isBest ? "　已更新最佳成績。" : "") + "</p>" +
        '<span class="tier-stamp">' + meta.en + " · " + meta.desc + "</span>" +
        '<div class="result-actions">' +
          '<button class="btn primary" type="button" data-action="retry">再做一次</button>' +
          (nextTier ? '<a class="btn" href="#/grade/' + l.id + "/quiz/" + nextTier + '">試' + tierMeta(nextTier).name + "卷</a>" : "") +
          '<a class="btn ghost" href="#/grade/' + l.id + '">返回教學</a>' +
        "</div>" +
      "</div>" +
      '<div class="review">' + review + "</div>" +
      "</div>";
  }

  /* ---------------- 頁面：搜尋 ---------------- */
  function searchView(query) {
    var q = (query || "").trim();
    if (!q) return homeView();
    var lower = q.toLowerCase();
    var groups = [];
    LEVELS.forEach(function (l) {
      var hits = [];
      l.units.forEach(function (u) {
        var hay = [u.title, u.en, u.strand, u.keywords.join(" "), u.objectives.join(" "), u.teaching.map(function (t) { return t.html.replace(/<[^>]+>/g, ""); }).join(" ")].join(" ").toLowerCase();
        if (hay.indexOf(lower) > -1) hits.push(u);
      });
      if (hits.length) groups.push({ level: l, hits: hits });
    });

    var total = groups.reduce(function (n, g) { return n + g.hits.length; }, 0);
    var body = groups.map(function (g) {
      var st = stageOf(g.level);
      var items = g.hits.map(function (u) {
        var i = u.title.toLowerCase().indexOf(lower);
        var title = i > -1 ? esc(u.title.slice(0, i)) + "<mark>" + esc(u.title.slice(i, i + q.length)) + "</mark>" + esc(u.title.slice(i + q.length)) : esc(u.title);
        return '<a class="hit" href="#/grade/' + g.level.id + "/u/" + u.id + '"><b>' + title + "</b>" +
          '<div class="hit-meta">' + esc(g.level.name) + " · " + esc(u.strand) + " · " + esc(u.en) + "</div></a>";
      }).join("");
      return '<div class="result-group"><h2><span class="stage-dot" style="--stage:' + st.color + '"></span>' + esc(g.level.name) + "（" + g.hits.length + "）</h2>" + items + "</div>";
    }).join("");

    return '<div class="view-enter">' +
      '<span class="eyebrow">搜尋</span>' +
      '<h1 class="section-title" style="margin:12px 0 4px">「' + esc(q) + "」</h1>" +
      '<p class="search-summary">在 ' + LEVELS.length + " 個年級中找到 " + total + " 個相關單元。</p>" +
      (total ? body : '<div class="empty"><b>沒有找到相關單元</b>試試「分數」、「方程」、「三角比」或「面積」。</div>') +
      "</div>";
  }

  /* ---------------- 頁面：關於 ---------------- */
  function aboutView() {
    var totals = DATA.meta.totals;
    return '<div class="view-enter"><div class="about-grid">' +
      '<div class="prose">' +
        "<h1>關於這個網站</h1>" +
        "<p>「香港數學階梯」把香港幼稚園至中六的數學課程，按五個學習階段與十五個年級重新編排，讓學生、家長與老師可以在同一個地方看到：每個年級要學甚麼、怎樣學、以及怎樣知道自己學會了。</p>" +
        "<h2>課程依據</h2>" +
        '<p>內容框架參照教育局<a href="https://www.edb.gov.hk/tc/curriculum-development/kla/ma/index.html" target="_blank" rel="noopener">數學教育學習領域課程指引（小一至中六）</a>(2017 修訂) 的四個範疇：數與代數、度量、圖形與空間、數據處理；幼稚園部分參照<a href="https://www.edb.gov.hk/tc/curriculum-development/major-level-of-edu/preprimary/curr-doc.html" target="_blank" rel="noopener">《幼稚園教育課程指引》(2017)</a> 中幼兒數學的學習重點。高中部分為數學必修部分，不包括 M1／M2。</p>' +
        "<h2>參考資料</h2>" +
        "<ul>" +
          '<li><a href="https://www.edb.gov.hk/tc/curriculum-development/kla/ma/index.html" target="_blank" rel="noopener">教育局：數學教育學習領域</a>（課程指引、課程內容與教學資源）</li>' +
          '<li><a href="https://www.edb.gov.hk/tc/curriculum-development/kla/ma/res/pri/ks1.html" target="_blank" rel="noopener">小學數學課程（2017）學與教示例：第一學習階段</a></li>' +
          '<li><a href="https://www.edb.gov.hk/tc/curriculum-development/major-level-of-edu/preprimary/curr-doc.html" target="_blank" rel="noopener">幼稚園教育課程指引（2017）</a></li>' +
        "</ul>" +
        "<h2>每個年級包含甚麼</h2>" +
        "<ul>" +
          "<li>學習單位：按範疇排列，每個單位有 3–4 條可觀察的學習目標。</li>" +
          "<li>教學內容：概念講解、核心公式、完整例題（連步驟與答案）、常犯錯誤。</li>" +
          "<li>三程度測驗：基礎、進階、挑戰各一份，每題四個選項，全部附詳解。</li>" +
          "<li>進度記錄：最佳成績儲存在瀏覽器的 localStorage，不上傳、不追蹤。</li>" +
        "</ul>" +
        "<h2>使用建議</h2>" +
        "<p>先讀該級教學內容，再做基礎卷；基礎卷達 80% 才做進階卷。答錯的題目，看詳解後回到對應單元重讀，隔一兩天再做一次，比一次做很多題有效。</p>" +
        "<h2>免責聲明</h2>" +
        "<p>本網站是學習輔助材料，單元次序與深度為便於自學而編排，未必與任何一所學校的教學進度完全一致，也不取代教科書與課堂教學。題目為練習用途，不構成任何考試預測。</p>" +
      "</div>" +
      '<aside><div class="stat-card"><h3>內容統計</h3>' +
        '<div class="stat-line"><span>年級</span><b>' + totals.levels + "</b></div>" +
        '<div class="stat-line"><span>學習單位</span><b>' + totals.units + "</b></div>" +
        '<div class="stat-line"><span>測驗題目</span><b>' + totals.questions + "</b></div>" +
        '<div class="stat-line"><span>每級程度</span><b>3</b></div>' +
        '<div class="stat-line"><span>資料更新</span><b>' + esc(DATA.meta.built) + "</b></div>" +
      "</div>" +
      '<div class="stat-card" style="margin-top:14px"><h3>你的資料</h3>' +
        '<p style="font-size:13px;color:var(--muted);margin-bottom:10px">清除後，所有測驗成績會從這部裝置移除。</p>' +
        '<button class="btn small ghost" type="button" data-action="reset" style="width:100%">清除本機進度</button>' +
      "</div></aside>" +
      "</div></div>";
  }

  function notFound() {
    return '<div class="empty"><b>找不到這一頁</b><p>連結可能已失效，請由<a href="#/" style="color:var(--brand)">首頁</a>重新開始。</p></div>';
  }

  /* ---------------- 路由 ---------------- */
  var observer = null;

  function route() {
    var raw = location.hash.replace(/^#\/?/, "");
    var parts = raw.split("/").filter(Boolean);
    var html = "";
    var levelId = null;
    var scrollUnit = null;

    if (parts.length === 0) html = homeView();
    else if (parts[0] === "map") html = mapView();
    else if (parts[0] === "quiz") html = quizCenterView();
    else if (parts[0] === "about") html = aboutView();
    else if (parts[0] === "search") html = searchView(decodeURIComponent(parts.slice(1).join("/")));
    else if (parts[0] === "grade" && parts[1]) {
      levelId = parts[1];
      if (parts[2] === "u" && parts[3]) scrollUnit = parts[3];
      if (parts[2] === "quiz" && parts[3]) {
        startQuiz(parts[1], parts[3]);
        html = quizView(parts[1], parts[3]);
      }
      else html = gradeView(parts[1], scrollUnit);
    } else html = notFound();

    view.innerHTML = html;
    renderMath(view);
    if (levelId) markStrip(levelId);
    setNav(parts[0] || "home");

    if (scrollUnit) {
      var el = document.getElementById(scrollUnit);
      if (el) {
        window.requestAnimationFrame(function () {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.style.transition = "box-shadow .4s";
          el.style.boxShadow = "0 0 0 3px var(--brand-soft)";
          setTimeout(function () { el.style.boxShadow = ""; }, 1200);
        });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    if (parts[0] === "grade" && parts[2] !== "quiz") observeUnits();
    else if (observer) { observer.disconnect(); observer = null; }
  }

  function setNav(key) {
    Array.prototype.forEach.call(document.querySelectorAll(".top-nav a"), function (a) {
      a.removeAttribute("aria-current");
      if (a.getAttribute("data-nav") === key) a.setAttribute("aria-current", "page");
    });
  }

  function observeUnits() {
    if (observer) observer.disconnect();
    if (!("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          Array.prototype.forEach.call(document.querySelectorAll(".unit-nav-list a"), function (a) {
            a.classList.toggle("active", a.getAttribute("data-unit") === e.target.id);
          });
        }
      });
    }, { rootMargin: "-150px 0px -70% 0px", threshold: 0 });
    Array.prototype.forEach.call(document.querySelectorAll(".unit"), function (u) { observer.observe(u); });
  }

  /* ---------------- 事件 ---------------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-action]");
    if (!t) return;
    var action = t.getAttribute("data-action");

    if (action === "print") {
      e.preventDefault();
      window.print();
      return;
    }
    if (action === "reset") {
      if (confirm("確定清除這部裝置上的所有測驗進度？")) {
        progress = {};
        writeJSON(PKEY, progress);
        buildStrip();
        toast("已清除本機進度");
        route();
      }
      return;
    }
    if (action === "pick" && Q) {
      var idx = parseInt(t.getAttribute("data-idx"), 10);
      if (settings.instant && Q.checked[Q.i]) return;
      Q.answers[Q.i] = idx;
      if (settings.instant) Q.checked[Q.i] = true;
      softRefresh();
      return;
    }
    if (action === "next" && Q) {
      if (Q.answers[Q.i] === null) return;
      if (Q.i < Q.answers.length - 1) { Q.i++; softRefresh(); }
      return;
    }
    if (action === "prev" && Q) {
      if (Q.i > 0) { Q.i--; softRefresh(); }
      return;
    }
    if (action === "submit" && Q) {
      if (Q.answers.some(function (a) { return a === null; })) { toast("還有題目未作答"); return; }
      Q.submitted = true;
      softRefresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (action === "retry" && Q) {
      var lid = Q.levelId, tr = Q.tier;
      startQuiz(lid, tr);
      softRefresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target.matches('[data-action="instant"]')) {
      settings.instant = e.target.checked;
      writeJSON(SKEY, settings);
      if (settings.instant && Q && Q.answers[Q.i] !== null) Q.checked[Q.i] = true;
      if (Q) softRefresh();
    }
  });

  function softRefresh() {
    var raw = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    view.innerHTML = quizView(raw[1], raw[3]);
    renderMath(view);
    if (Q && Q.submitted) markStrip(Q.levelId);
  }

  document.addEventListener("keydown", function (e) {
    if (!Q || Q.submitted) return;
    if (document.activeElement && /input|textarea/i.test(document.activeElement.tagName)) return;
    var k = e.key.toUpperCase();
    var map = { A: 0, B: 1, C: 2, D: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
    if (map[k] !== undefined) {
      e.preventDefault();
      Q.answers[Q.i] = map[k];
      if (settings.instant) Q.checked[Q.i] = true;
      softRefresh();
    } else if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      if (Q.i < Q.answers.length - 1) { Q.i++; softRefresh(); }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (Q.i > 0) { Q.i--; softRefresh(); }
    }
  });

  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("searchInput");
    var q = input.value.trim();
    if (q) location.hash = "#/search/" + encodeURIComponent(q);
  });

  var themeBtn = document.getElementById("themeToggle");
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    themeBtn.setAttribute("aria-label", theme === "dark" ? "切換淺色模式" : "切換深色模式");
  }
  var initialTheme = settings.theme || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initialTheme);
  themeBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    settings.theme = next;
    writeJSON(SKEY, settings);
    applyTheme(next);
  });

  window.addEventListener("hashchange", route);

  buildStrip();
  route();
})();
