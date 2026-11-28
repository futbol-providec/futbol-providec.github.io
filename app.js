"use strict";

const S = { index: null, leagues: {}, acc: null, day: null, lg: "all" };
const app = document.getElementById("app");

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
const P100 = (x) => Math.floor(x * 100 + 0.5 + 1e-9);
const pct = (x, d = 0) => (x == null || isNaN(x) ? "—" : (d === 0 ? P100(x) : (x * 100).toFixed(d)) + "%");
const num = (x, d = 2) => (x == null || isNaN(x) ? "—" : Number(x).toFixed(d));
const sgn = (x, d = 3) => (x == null || isNaN(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(d));
const OUT = ["П1", "Х", "П2"];

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }

function dayKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function fmtTime(iso) { return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(iso) { return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }); }
function fmtDateTime(iso) {
  return new Date(iso).toLocaleString("ru-RU", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}
function dayLabel(key) {
  const today = dayKey(new Date());
  const t = new Date(); t.setDate(t.getDate() + 1);
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (key === today) return "Сегодня";
  if (key === dayKey(t)) return "Завтра";
  if (key === dayKey(y)) return "Вчера";
  const [Y, M, D] = key.split("-").map(Number);
  return new Date(Y, M - 1, D).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}
const argmax = (p) => p.indexOf(Math.max.apply(null, p));
const PICK_LABEL = { "1X": "1X", "X2": "X2", "1": "П1", "X": "Х", "2": "П2" };
const PICK_TITLE = { "1X": "хозяева не проиграют: победа хозяев или ничья", "X2": "гости не проиграют: ничья или победа гостей",
  "1": "победа хозяев", "X": "ничья", "2": "победа гостей" };
const pickTag = (pk, withP) => (pk && PICK_LABEL[pk.c] ? `<span class="pick${pk.c.length === 2 ? " ins" : ""}" title="${PICK_TITLE[pk.c]}">${PICK_LABEL[pk.c]}${withP ? ` · ${pct(pk.p)}` : ""}</span>` : "");
const outcome = (r) => (r[0] > r[1] ? 0 : r[0] === r[1] ? 1 : 2);

const lgMeta = (key) => ((S.index && S.index.leagues) || []).find((l) => l.key === key) || null;
const isCup = (key) => { const l = lgMeta(key); return !!(l && l.cup); };
const hasCups = () => ((S.index && S.index.leagues) || []).some((l) => l.cup);
const SCOPES = [["all", "Все турниры"], ["lg", "Лиги"], ["cup", "Еврокубки"]];
function scopeGet() {
  if (!S.scope) { const v = lsGet("fp-scope"); S.scope = ["all", "lg", "cup"].includes(v) ? v : "all"; }
  return hasCups() ? S.scope : "all";
}
function scopeSet(v) { S.scope = v; lsSet("fp-scope", v); }
const inScope = (key, sc) => sc === "all" || (sc === "cup") === isCup(key);
function scopeBar(counts) {
  if (!hasCups()) return "";
  const sc = scopeGet();
  return `<div class="scope" role="tablist" aria-label="Турниры">${SCOPES.map(([k, n]) =>
    `<button class="scope-b${sc === k ? " on" : ""}" role="tab" aria-selected="${sc === k}" data-scope="${k}">${k === "cup" ? '<span class="cup-ico" aria-hidden="true">★</span>' : ""}${n}${counts && counts[k] != null ? `<span class="n">${counts[k]}</span>` : ""}</button>`).join("")}</div>`;
}
function scopeWire(rerender) {
  app.querySelectorAll("[data-scope]").forEach((b) => b.addEventListener("click", () => { scopeSet(b.dataset.scope); rerender(); }));
}
const cupShort = (key) => { const l = lgMeta(key); return l && l.short ? l.short : ""; };
const cupTag = (key) => (isCup(key) ? `<span class="cup-tag cup-${esc(key)}" title="${esc((lgMeta(key) || {}).name || "")}">${esc(cupShort(key))}</span>` : "");
const PH_NAME = { qual: "квалификация", league: "общий этап", group: "групповой этап", ko: "плей-офф", final: "финал" };
function stageLabel(cx) {
  if (!cx || !cx.ph) return "";
  if (cx.neu) return "финал · нейтральное поле";
  let s = PH_NAME[cx.ph] || "";
  if (cx.leg === 1) s += " · первый матч";
  else if (cx.leg === 2) s += cx.agg0 ? ` · ответный, первый матч ${cx.agg0[1]}:${cx.agg0[0]}` : " · ответный";
  return s;
}
function advLine(cx, h, a) {
  if (!cx || !cx.adv || cx.adv.h == null) return "";
  return `<div class="adv-line"><span>${cx.neu ? "трофей" : "дальше"}:</span> <b class="h">${pct(cx.adv.h)}</b> · <b class="a">${pct(cx.adv.a)}</b></div>`;
}


async function loadJSON(path, fresh) {
  const v = fresh ? Date.now() : (S.index ? S.index.generated : Date.now());
  const r = await fetch(`${path}?v=${encodeURIComponent(v)}`, { cache: fresh ? "no-store" : "default" });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}
async function ensureIndex() {
  if (!S.index) S.index = await loadJSON("data/index.json", true);
  return S.index;
}
async function ensureLeague(key) {
  if (!S.leagues[key]) S.leagues[key] = await loadJSON(`data/league/${encodeURIComponent(key)}.json`);
  return S.leagues[key];
}

function pbar(p, big, names) {
  const w = p.map((x) => Math.max(0, x * 100));
  const lab = (x) => (x >= 0.09 ? P100(x) + "%" : "");
  const nm = names || ["П1", "ничья", "П2"];
  return `<div class="pbar${big ? " big" : ""}" role="img" aria-label="${nm[0]} ${pct(p[0])}, ${nm[1]} ${pct(p[1])}, ${nm[2]} ${pct(p[2])}">
    <span class="h" style="width:${w[0]}%">${lab(p[0])}</span><span class="d" style="width:${w[1]}%">${lab(p[1])}</span><span class="a" style="width:${w[2]}%">${lab(p[2])}</span></div>`;
}
const lgQuick = (key) => ((S.index && S.index.leagues) || []).some((l) => l.key === key && l.qk);
function matchRow(m) {
  const settled = m.st === "settled" && m.res;
  const started = !settled && new Date(m.ko) <= new Date();
  let right;
  if (settled) {
    const ok = m.pk && m.pk.h != null ? m.pk.h : argmax(m.p) === outcome(m.res);
    right = `<div class="score-box"><span class="res">${m.res[0]}:${m.res[1]}</span>
      <div class="${ok ? "hit" : "miss"} small">${ok ? "✓" : "✗"} ${m.pk ? "прогноз " + PICK_LABEL[m.pk.c] : ok ? "исход угадан" : "мимо"}</div></div>`;
  } else if (m.st === "void") {
    right = `<div class="score-box">не состоялся</div>`;
  } else {
    right = `<div class="score-box">${pickTag(m.pk, true)}<b>${num(m.lh, 1)} : ${num(m.la, 1)}</b><div>счёт ${esc(m.top || "—")}</div>${started ? `<div class="lv-row" data-lvr="${m.id}"></div>` : ""}</div>`;
  }
  const hoursSince = (Date.now() - new Date(m.ko).getTime()) / 36e5;
  const time = !started ? fmtTime(m.ko)
    : hoursSince < LIVE_SCHED_H ? `<span class="warn">идёт</span>`
    : `<span class="muted" title="${lgQuick(m.lg) ? "Итог появится при ближайшем обновлении сайта после финального свистка"
      : "Счёт появится обычно в течение суток после матча"}">итог позже</span>`;
  const pos = (i) => (m.pos && m.pos[i] ? `<span class="pos">${m.pos[i]}</span>` : "");
  const st = m.cx ? stageLabel(m.cx) : "";
  return `<a class="mrow" href="#/match/${encodeURIComponent(m.lg)}/${m.id}">
    <div class="mtime">${time}</div>
    <div class="teams"><div>${esc(m.h)}${pos(0)}</div><div>${esc(m.a)}${pos(1)}</div>${st ? `<div class="cx">${esc(st)}</div>` : ""}</div>
    <div class="pbar-wrap">${pbar(m.p)}${m.mkt ? `<div class="mkt-line">рынок ${pct(m.mkt[0])} · ${pct(m.mkt[1])} · ${pct(m.mkt[2])}</div>` : ""}${m.st === "pending" ? advLine(m.cx) : ""}</div>
    ${right}</a>`;
}
function notices() {
  const ix = S.index;
  const out = [];
  const ageH = (Date.now() - new Date(ix.generated).getTime()) / 36e5;
  if (ageH > 36) out.push(`Данные обновлялись ${Math.round(ageH / 24)} дн. назад — расписание и прогнозы могут быть устаревшими.`);
  if (ix.source_ok === false) out.push(`При последнем обновлении часть данных не загрузилась; показано то, что было собрано раньше.`);
  return out.map((t) => `<p class="notice">${esc(t)}</p>`).join("");
}
function setNav(name) {
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.nav === name));
}

const INS = ["1X", "X2"];
const isIns = (m) => m.pk && INS.includes(m.pk.c);
const PK_MINS = [0, 0.8, 0.85, 0.9];
const PK_DEFAULT = { day: "all", type: "all", min: 0, lg: "all", sort: "time", q: "" };

function pkState() {
  if (S.pk) return S.pk;
  let st = Object.assign({}, PK_DEFAULT);
  try {
    const saved = JSON.parse(lsGet("fp-picks") || "{}");
    if (["all", "1X", "X2"].includes(saved.type)) st.type = saved.type;
    if (PK_MINS.includes(saved.min)) st.min = saved.min;
    if (["time", "prob"].includes(saved.sort)) st.sort = saved.sort;
    if (typeof saved.lg === "string") st.lg = saved.lg;
  } catch (e) { }
  S.pk = st;
  return st;
}
function pkSave() {
  const { type, min, sort, lg } = S.pk;
  lsSet("fp-picks", JSON.stringify({ type, min, sort, lg }));
}
const pkMinLabel = (x) => (x ? `от ${Math.round(x * 100)}%` : "любая");
const mktDc = (m) => (m.mkt ? (m.pk.c === "1X" ? m.mkt[0] + m.mkt[1] : m.mkt[1] + m.mkt[2]) : null);
const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");

function pkFilter(list, st, except) {
  const q = norm(st.q).trim();
  return list.filter((m) =>
    (except === "day" || st.day === "all" || dayKey(new Date(m.ko)) === st.day) &&
    (except === "type" || st.type === "all" || m.pk.c === st.type) &&
    (except === "min" || m.pk.p >= st.min - 1e-9) &&
    (except === "lg" || st.lg === "all" || m.lg === st.lg) &&
    (!q || norm(m.h).includes(q) || norm(m.a).includes(q)));
}

function pickRow(m, L) {
  const dc = mktDc(m);
  const pos = (i) => (m.pos && m.pos[i] ? `<span class="pos">${m.pos[i]}</span>` : "");
  return `<a class="prow" href="#/match/${encodeURIComponent(m.lg)}/${m.id}">
    <div class="pk-when"><b>${fmtTime(m.ko)}</b><span>${esc(dayLabel(dayKey(new Date(m.ko))))}</span></div>
    <div class="pk-match"><div class="pk-lg">${L ? (L.cup ? cupTag(L.key) + " " + esc(L.name) + (m.cx ? " · " + esc(stageLabel(m.cx)) : "") : esc(L.name) + " · " + esc(L.country || "")) : ""}</div>
      <div class="teams"><div>${esc(m.h)}${pos(0)}</div><div>${esc(m.a)}${pos(1)}</div></div></div>
    <div class="pbar-wrap">${pbar(m.p)}<div class="mkt-line">${dc != null ? `рынок на ${PICK_LABEL[m.pk.c]}: ${pct(dc)}` : "цены рынка нет"}</div></div>
    <div class="pk-main">${pickTag(m.pk, false)}<b>${pct(m.pk.p)}</b><span class="pk-note">${m.pk.c === "1X" ? "хозяева не проиграют" : "гости не проиграют"}</span></div>
  </a>`;
}

function renderPicks() {
  setNav("picks");
  const st = pkState();
  const now = new Date();
  const lgBy = {};
  (S.index.leagues || []).forEach((l) => { lgBy[l.key] = l; });
  const sc = scopeGet();
  const allSc = (S.index.matches || []).filter(isIns);
  const upSc = allSc.filter((m) => m.st === "pending" && new Date(m.ko) > now);
  const all = allSc.filter((m) => inScope(m.lg, sc));
  const up = all.filter((m) => m.st === "pending" && new Date(m.ko) > now);
  const done = all.filter((m) => m.st === "settled" && m.res).sort((a, b) => (a.ko < b.ko ? 1 : -1));
  const waiting = all.filter((m) => m.st === "pending" && new Date(m.ko) <= now).sort((a, b) => (a.ko < b.ko ? 1 : -1));
  const days = [...new Set(up.map((m) => dayKey(new Date(m.ko))))].sort();
  if (st.day !== "all" && !days.includes(st.day)) st.day = "all";

  const bt = S.index.accuracy && S.index.accuracy.picks;
  let h = `<h1>Прогнозы 1X и X2</h1>${notices()}
    <p class="muted">Матчи, где у одной из команд вероятность победы 58 % и выше: <b>1X</b> — хозяева не проиграют,
    <b>X2</b> — гости не проиграют. Справа — вероятность прогноза по модели.</p>`;
  if (bt && bt["1X"] && bt["1X"].n) {
    h += `<p class="small">На проверке (${(bt["1X"].n + (bt.X2 ? bt.X2.n : 0)).toLocaleString("ru-RU")} таких прогнозов на отложенных матчах)
      <b>1X</b> сыграл в ${pct(bt["1X"].rate, 1)} случаев (модель обещала ${pct(bt["1X"].pred, 1)})${bt.X2 && bt.X2.n ? `,
      <b>X2</b> — в ${pct(bt.X2.rate, 1)} (обещала ${pct(bt.X2.pred, 1)})` : ""}. <a href="#/accuracy">Подробнее о точности</a>.</p>`;
  }
  h += scopeBar({ all: upSc.length, lg: upSc.filter((m) => !isCup(m.lg)).length, cup: upSc.filter((m) => isCup(m.lg)).length });
  h += `<div class="pk-search"><input id="pkQ" class="sel" type="search" placeholder="Поиск команды" value="${esc(st.q)}" aria-label="Поиск команды" autocomplete="off"></div>
    <div id="pkFilters"></div><div id="pkList"></div><div id="pkRecent"></div>`;
  app.innerHTML = h;
  scopeWire(renderPicks);

  const update = () => {
    const cnt = (except, pred) => pkFilter(up, st, except).filter(pred).length;
    let f = `<div class="days" role="tablist" aria-label="День">
      <button class="chip${st.day === "all" ? " on" : ""}" data-pkday="all">Все дни<span class="n">${cnt("day", () => true)}</span></button>
      ${days.map((d) => `<button class="chip${st.day === d ? " on" : ""}" data-pkday="${d}">${esc(dayLabel(d))}<span class="n">${cnt("day", (m) => dayKey(new Date(m.ko)) === d)}</span></button>`).join("")}</div>
      <div class="pk-row"><span class="muted small">Прогноз</span><div class="chips">
      ${["all", "1X", "X2"].map((t) => `<button class="chip${st.type === t ? " on" : ""}" data-pktype="${t}">${t === "all" ? "1X и X2" : t}<span class="n">${cnt("type", (m) => t === "all" || m.pk.c === t)}</span></button>`).join("")}</div></div>
      <div class="pk-row"><span class="muted small">Вероятность</span><div class="chips">
      ${PK_MINS.map((x) => `<button class="chip${st.min === x ? " on" : ""}" data-pkmin="${x}">${pkMinLabel(x)}<span class="n">${cnt("min", (m) => m.pk.p >= x - 1e-9)}</span></button>`).join("")}</div></div>`;
    const lgCount = {};
    pkFilter(up, st, "lg").forEach((m) => { lgCount[m.lg] = (lgCount[m.lg] || 0) + 1; });
    if (st.lg !== "all" && !lgCount[st.lg] && !up.some((m) => m.lg === st.lg)) st.lg = "all";
    const byCountry = {};
    (S.index.leagues || []).filter((l) => lgCount[l.key] || l.key === st.lg).forEach((l) => { (byCountry[l.country] = byCountry[l.country] || []).push(l); });
    const countries = Object.keys(byCountry).sort((a, b) => a.localeCompare(b, "ru"));
    f += `<div class="pk-row pk-sel"><label for="pkLg" class="muted small">Лига</label>
      <select id="pkLg" class="sel"><option value="all"${st.lg === "all" ? " selected" : ""}>Все лиги (${pkFilter(up, st, "lg").length})</option>
      ${countries.map((c) => `<optgroup label="${esc(c)}">${byCountry[c].map((l) => `<option value="${esc(l.key)}"${st.lg === l.key ? " selected" : ""}>${esc(l.name)} (${lgCount[l.key] || 0})</option>`).join("")}</optgroup>`).join("")}
      </select>
      <label for="pkSort" class="muted small">Сортировка</label>
      <select id="pkSort" class="sel pk-sort"><option value="time"${st.sort === "time" ? " selected" : ""}>по времени</option>
      <option value="prob"${st.sort === "prob" ? " selected" : ""}>по вероятности</option></select></div>`;
    document.getElementById("pkFilters").innerHTML = f;

    const shown = pkFilter(up, st, null);
    let l = "";
    const dirty = st.day !== "all" || st.type !== "all" || st.min !== 0 || st.lg !== "all" || st.q;
    l += `<div class="pk-count"><b>${shown.length}</b> ${plural(shown.length, ["прогноз", "прогноза", "прогнозов"])}
      ${dirty ? `<button class="linkbtn" id="pkReset">сбросить фильтры</button>` : ""}</div>`;
    if (!up.length) {
      l += `<p class="card pad">На ближайшие дни прогнозов 1X и X2 нет: ни у одной команды вероятность победы не достигает 58 %.</p>`;
    } else if (!shown.length) {
      l += `<p class="card pad">По выбранным фильтрам ничего не нашлось. Попробуйте снизить порог вероятности или выбрать «Все дни».</p>`;
    } else if (st.sort === "prob") {
      const sorted = shown.slice().sort((a, b) => b.pk.p - a.pk.p || (a.ko < b.ko ? -1 : 1));
      l += `<section class="card block">${sorted.map((m) => pickRow(m, lgBy[m.lg])).join("")}</section>`;
    } else {
      const sorted = shown.slice().sort((a, b) => (a.ko < b.ko ? -1 : a.ko > b.ko ? 1 : b.pk.p - a.pk.p));
      const groups = {};
      sorted.forEach((m) => { const d = dayKey(new Date(m.ko)); (groups[d] = groups[d] || []).push(m); });
      Object.keys(groups).sort().forEach((d) => {
        l += `<section class="card block"><div class="lg-head">${esc(dayLabel(d))}<span class="muted small">· ${groups[d].length}</span></div>
          ${groups[d].map((m) => pickRow(m, lgBy[m.lg])).join("")}</section>`;
      });
    }
    document.getElementById("pkList").innerHTML = l;

    app.querySelectorAll("[data-pkday]").forEach((b) => b.addEventListener("click", () => { st.day = b.dataset.pkday; update(); }));
    app.querySelectorAll("[data-pktype]").forEach((b) => b.addEventListener("click", () => { st.type = b.dataset.pktype; pkSave(); update(); }));
    app.querySelectorAll("[data-pkmin]").forEach((b) => b.addEventListener("click", () => { st.min = Number(b.dataset.pkmin); pkSave(); update(); }));
    document.getElementById("pkLg").addEventListener("change", (e) => { st.lg = e.target.value; pkSave(); update(); });
    document.getElementById("pkSort").addEventListener("change", (e) => { st.sort = e.target.value; pkSave(); update(); });
    const rb = document.getElementById("pkReset");
    if (rb) rb.addEventListener("click", () => {
      Object.assign(st, PK_DEFAULT); pkSave();
      document.getElementById("pkQ").value = "";
      update();
    });
  };

  let r = "";
  if (done.length || waiting.length) {
    const hits = done.filter((m) => m.pk.h).length;
    r += `<h2>Недавние результаты</h2>`;
    if (done.length) {
      r += `<p class="small">За последние дни на сайте: сыграло <b>${hits}</b> из ${done.length} ${plural(done.length, ["прогноза", "прогнозов", "прогнозов"])} 1X и X2.</p>`;
    }
    const rows = waiting.concat(done).slice(0, 60);
    r += `<section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Дата</th><th class="tl">Матч</th><th>Прогноз</th><th>Вероятность</th><th>Счёт</th><th></th></tr></thead><tbody>
      ${rows.map((m) => {
        const fin = m.st === "settled";
        return `<tr><td class="tl">${esc(fmtDate(m.ko))}</td><td class="tl"><a href="#/match/${encodeURIComponent(m.lg)}/${m.id}">${esc(m.h)} — ${esc(m.a)}</a></td>
          <td>${pickTag(m.pk, false)}</td><td>${pct(m.pk.p)}</td>
          <td>${fin ? `<b>${m.res[0]}:${m.res[1]}</b>` : `<span class="muted">итог позже</span>`}</td>
          <td class="${fin ? (m.pk.h ? "hit" : "miss") : ""}">${fin ? (m.pk.h ? "✓" : "✗") : ""}</td></tr>`;
      }).join("")}</tbody></table></section>
      <p class="muted small">Счёт появляется при ближайшем обновлении сайта после финального свистка (в некоторых лигах — в течение суток)
      и окончательно подтверждается примерно через сутки. Прогноз — последний, сделанный до стартового свистка.</p>`;
  }
  r += `<p class="muted small">Это оценка модели, а не совет делать ставки: прогноз с вероятностью 85 % не сыграет примерно в одном случае из семи.</p>`;
  document.getElementById("pkRecent").innerHTML = r;

  const q = document.getElementById("pkQ");
  q.addEventListener("input", () => { st.q = q.value; update(); });
  update();
}

async function ensureStats() {
  if (!S.stats) S.stats = await loadJSON("data/stats.json");
  return S.stats;
}

function stFilter(list, st, except) {
  const q = norm(st.q).trim();
  return list.filter((m) => m.sp[st.stat] &&
    (except === "day" || st.day === "all" || st.day === "live" || dayKey(new Date(m.ko)) === st.day) &&
    (except === "lg" || st.lg === "all" || m.lg === st.lg) &&
    (!q || norm(m.h).includes(q) || norm(m.a).includes(q)));
}

function stDefaultLine(list, st) {
  const xs = list.map((m) => spScopeMean(m.sp[st.stat], st.scope)).sort((a, b) => a - b);
  if (!xs.length) return 0.5;
  return Math.floor(xs[Math.floor(xs.length / 2)]) + 0.5;
}

function statRow(m, st, L, lgBy, lv) {
  const s = m.sp[st.stat], sc = st.scope, pk = s[sc];
  const pos = (i) => (m.pos && m.pos[i] ? `<span class="pos">${m.pos[i]}</span>` : "");
  const lg = lgBy[m.lg];
  let ex = sc === "t" ? `<b>${num(s.m[0] + s.m[1], 1)}</b><span>${num(s.m[0], 1)} : ${num(s.m[1], 1)}</span>`
    : `<b>${num(spScopeMean(s, sc), 1)}</b><span>${sc === "h" ? "хозяева" : "гости"}</span>`;
  let when = `<div class="pk-when"><b>${fmtTime(m.ko)}</b><span>${esc(dayLabel(dayKey(new Date(m.ko))))}</span></div>`;
  if (lv) {
    const e = lv.e;
    when = e ? `<div class="pk-when lv-when"><b><span class="lv-dot"></span>${e.s[0]}:${e.s[1]}</b><span>${liveTail(e)}</span></div>`
      : `<div class="pk-when lv-when"><b><span class="lv-dot off"></span>идёт</b><span>с ${fmtTime(m.ko)}</span></div>`;
    const x = e && e.x && Array.isArray(e.x[st.stat]) ? e.x[st.stat] : null;
    if (x) ex += `<span class="s-now" title="Текущее значение показателя">сейчас <b>${saScope(x, sc)}</b></span>`;
    else if (e) ex += `<span class="s-now muted" title="По этому матчу текущего значения показателя нет">сейчас —</span>`;
  }
  let right;
  if (st.mode === "line") {
    const [a, b] = spRange(pk);
    if (L < a || L > b) {
      right = `<div class="s-main"><span class="muted small">${L < a ? "почти наверняка больше" : "почти наверняка меньше"} ${fmtL(L)}</span></div>`;
    } else {
      const po = spOver(pk, L);
      right = `<div class="s-main"><div class="s-po"><span>больше ${fmtL(L)}</span><b class="${P100(po) >= st.conf ? "good" : ""}">${pct(po)}</b></div>
        <div class="dual"><i class="h" style="width:${(po * 100).toFixed(1)}%"></i><i class="a" style="width:${((1 - po) * 100).toFixed(1)}%;background:var(--draw)"></i></div>
        <div class="s-po"><span>меньше</span><b class="${P100(1 - po) >= st.conf ? "good" : ""}">${pct(1 - po)}</b></div></div>`;
    }
  } else {
    const cl = confLines(pk, st.conf);
    const ln = (x, o) => (x ? `<div class="s-cl"><span>${o ? "больше" : "меньше"} <b>${fmtL(x[0])}</b></span><b>${pct(x[1])}</b></div>` : "");
    right = `<div class="s-main">${st.show !== "under" ? ln(cl.over, true) : ""}${st.show !== "over" ? ln(cl.under, false) : ""}</div>`;
  }
  return `<a class="srow" href="#/match/${encodeURIComponent(m.lg)}/${m.id}">
    ${when}
    <div class="pk-match"><div class="pk-lg">${lg ? (lg.cup ? cupTag(lg.key) + " " + esc(lg.name) : esc(lg.name) + " · " + esc(lg.country || "")) : ""}</div>
      <div class="teams"><div${sc === "h" ? ' class="s-on"' : ""}>${esc(m.h)}${pos(0)}</div><div${sc === "a" ? ' class="s-on"' : ""}>${esc(m.a)}${pos(1)}</div></div></div>
    <div class="s-exp">${ex}</div>${right}</a>`;
}

async function renderStats() {
  setNav("stats");
  const D = await ensureStats();
  const st = stState();
  const avail = ST_ORDER.filter((k) => (D.stats || []).some((x) => x.key === k));
  const lgBy = {};
  (S.index.leagues || []).forEach((l) => { lgBy[l.key] = l; });
  const ixBy = {};
  (S.index.matches || []).forEach((m) => { ixBy[m.id] = m; });
  const ixOf = (m) => ixBy[m.id] || { id: m.id, ko: m.ko, st: "?" };
  const liveOf = (m) => liveNow(ixOf(m));
  if (S.stLiveInit == null) { S.stLiveInit = 1; if (ssGet("fp-stlive") === "1") st.day = "live"; }
  let h = `<h1>Статистика матчей</h1>${notices()}
    <p class="muted">Прогноз ударов, ударов в створ, угловых, фолов, карточек, офсайдов и аутов — на матч и на каждую команду.
    Модель учитывает стиль обеих команд, силу соперников, домашнее поле, свежесть матчей, а для карточек и фолов — строгость судьи.</p>`;
  if (!avail.length) {
    app.innerHTML = h + `<p class="card pad">Прогнозы статистики сейчас не публикуются: модели не прошли проверку или данных пока нет.</p>`;
    return;
  }
  if (!avail.includes(st.stat)) st.stat = avail.includes("corners") ? "corners" : avail[0];
  const bt = S.index.stats_bt;
  h += `<div id="stScope"></div><div id="stHead"></div><div class="pk-search"><input id="stQ" class="sel" type="search" placeholder="Поиск команды" value="${esc(st.q)}" aria-label="Поиск команды" autocomplete="off"></div>
    <div id="stFilters"></div><div id="stList"></div>
    <p class="muted small">Время — по вашему часовому поясу. Вероятности — оценка модели, а не совет делать ставки: линия с уверенностью 70 %
    не сыграет примерно в трёх случаях из десяти. Как проверялась точность — в разделе «<a href="#/accuracy">Точность</a>».</p>`;
  app.innerHTML = h;

  let liveSig = "";
  const update = () => {
    const nowT = Date.now();
    const sc = scopeGet();
    const upAll = (D.matches || []).filter((m) => new Date(m.ko).getTime() > nowT && m.sp[st.stat]);
    const scEl = document.getElementById("stScope");
    scEl.innerHTML = scopeBar({ all: upAll.length, lg: upAll.filter((m) => !isCup(m.lg)).length, cup: upAll.filter((m) => isCup(m.lg)).length });
    scEl.querySelectorAll("[data-scope]").forEach((b) => b.addEventListener("click", () => { scopeSet(b.dataset.scope); update(); }));
    const up = (D.matches || []).filter((m) => new Date(m.ko).getTime() > nowT && inScope(m.lg, sc));
    const live = (D.matches || []).filter((m) => liveOf(m) && inScope(m.lg, sc));
    const isLive = st.day === "live";
    const pool = isLive ? live : up;
    const days = [...new Set(up.filter((m) => m.sp[st.stat]).map((m) => dayKey(new Date(m.ko))))].sort();
    if (st.day !== "all" && !isLive && !days.includes(st.day)) st.day = "all";
    const b = bt && bt[st.stat] && bt[st.stat].conf && bt[st.stat].conf[String(st.conf)];
    const bx = b && (st.scope === "t" ? b.t : b.team);
    document.getElementById("stHead").innerHTML = bx && bx.n ? `<p class="small">Проверка на отложенных матчах: «уверенные линии» от ${st.conf}% по показателю «${ST_NAME[st.stat]}»
      (${st.scope === "t" ? "тотал матча" : "команды"}) сыграли в <b>${pct(bx.rate, 1)}</b> из ${bx.n.toLocaleString("ru-RU")} случаев — модель обещала ${pct(bx.pred, 1)}.</p>` : "";
    const cnt = (except, pred) => stFilter(up, st, except).filter(pred).length;
    let f = `<div class="chips st-pick">${avail.map((k) => chipBtn("sstat", k, st.stat === k, ST_NAME[k])).join("")}</div>
      <div class="pk-row"><span class="muted small">Для</span><div class="chips">
        ${[["t", "Тотал матча"], ["h", "Хозяева"], ["a", "Гости"]].map(([x, n]) => chipBtn("sscope", x, st.scope === x, n)).join("")}</div></div>
      <div class="pk-row"><span class="muted small">Режим</span><div class="chips">
        ${chipBtn("smode", "conf", st.mode === "conf", "Уверенные линии")}${chipBtn("smode", "line", st.mode === "line", "Своя линия")}</div></div>
      <div class="pk-row"><span class="muted small">Уверенность</span><div class="chips">${CONFS.map((c) => chipBtn("sconf", c, st.conf === c, `от ${c}%`)).join("")}</div></div>`;
    if (st.mode === "conf") {
      f += `<div class="pk-row"><span class="muted small">Показывать</span><div class="chips">
        ${[["both", "больше и меньше"], ["over", "только больше"], ["under", "только меньше"]].map(([x, n]) => chipBtn("sshow", x, st.show === x, n)).join("")}</div></div>`;
    } else {
      const lk = `${st.stat}:${st.scope}`;
      if (st.line[lk] == null) st.line[lk] = stDefaultLine(stFilter(pool, st, null), st);
      const L = st.line[lk];
      f += `<div class="pk-row"><span class="muted small">Линия</span><div class="st-step small-step">
        <button class="stepb" data-sline="-1" aria-label="Линия меньше"${L <= 0.5 ? " disabled" : ""}>−</button>
        <div class="st-stepv"><b>${fmtL(L)}</b></div><button class="stepb" data-sline="1" aria-label="Линия больше">+</button></div></div>`;
    }
    f += `<div class="days" role="tablist" aria-label="День">${chipBtn("sday", "live", isLive,
        `<span class="lv-dot${live.length ? "" : " off"}" aria-hidden="true"></span>Live`, stFilter(live, st, "day").length)}
      ${chipBtn("sday", "all", st.day === "all", "Все дни", cnt("day", () => true))}
      ${days.map((d) => chipBtn("sday", d, st.day === d, esc(dayLabel(d)), cnt("day", (m) => dayKey(new Date(m.ko)) === d))).join("")}</div>`;
    const lgCount = {};
    stFilter(pool, st, "lg").forEach((m) => { lgCount[m.lg] = (lgCount[m.lg] || 0) + 1; });
    if (!isLive && st.lg !== "all" && !up.some((m) => m.lg === st.lg)) st.lg = "all";
    const byCountry = {};
    (S.index.leagues || []).filter((l) => lgCount[l.key] || l.key === st.lg).forEach((l) => { (byCountry[l.country] = byCountry[l.country] || []).push(l); });
    const countries = Object.keys(byCountry).sort((a, b2) => a.localeCompare(b2, "ru"));
    f += `<div class="pk-row pk-sel"><label for="stLg" class="muted small">Лига</label>
      <select id="stLg" class="sel"><option value="all"${st.lg === "all" ? " selected" : ""}>Все лиги (${stFilter(pool, st, "lg").length})</option>
      ${countries.map((c) => `<optgroup label="${esc(c)}">${byCountry[c].map((l) => `<option value="${esc(l.key)}"${st.lg === l.key ? " selected" : ""}>${esc(l.name)} (${lgCount[l.key] || 0})</option>`).join("")}</optgroup>`).join("")}
      </select><label for="stSort" class="muted small">Сортировка</label>
      <select id="stSort" class="sel pk-sort"><option value="time"${st.sort === "time" ? " selected" : ""}>по времени</option>
      <option value="hi"${st.sort === "hi" ? " selected" : ""}>больше всего</option><option value="lo"${st.sort === "lo" ? " selected" : ""}>меньше всего</option></select></div>`;
    document.getElementById("stFilters").innerHTML = f;

    const shown = stFilter(pool, st, null);
    const L = st.line[`${st.stat}:${st.scope}`];
    const ex = (m) => spScopeMean(m.sp[st.stat], st.scope);
    const row = (m) => statRow(m, st, L, lgBy, isLive ? liveOf(m) : null);
    let l = `<div class="pk-count"><b>${shown.length}</b> ${plural(shown.length, ["матч", "матча", "матчей"])}
      <span class="muted small">· ${ST_NAME[st.stat].toLowerCase()}, ${st.scope === "t" ? "тотал матча" : st.scope === "h" ? "хозяева" : "гости"}${isLive ? ", идут сейчас" : ""}</span></div>`;
    if (isLive) {
      l += `<p class="muted small lv-note">${liveListNote(live.map(ixOf), "Прогноз — последний до стартового свистка, по ходу игры не пересчитывается; «сейчас» — текущее значение показателя.")}</p>`;
    }
    if (isLive && !live.length) l += `<p class="card pad">${liveEmptyText()} Нажмите «Все дни», чтобы увидеть прогнозы на ближайшие матчи.</p>`;
    else if (!pool.length) l += `<p class="card pad">На ближайшие дни матчей с прогнозом статистики нет.</p>`;
    else if (!shown.length) l += `<p class="card pad">${isLive ? "Среди идущих сейчас матчей по выбранным фильтрам ничего не нашлось." : "По выбранным фильтрам ничего не нашлось."}</p>`;
    else if (st.sort !== "time") {
      const sorted = shown.slice().sort((a, b2) => (st.sort === "hi" ? ex(b2) - ex(a) : ex(a) - ex(b2)) || (a.ko < b2.ko ? -1 : 1));
      l += `<section class="card block">${sorted.map(row).join("")}</section>`;
    } else if (isLive) {
      const sorted = shown.slice().sort((a, b2) => (a.ko < b2.ko ? -1 : a.ko > b2.ko ? 1 : a.id - b2.id));
      l += `<section class="card block"><div class="lg-head">Идут сейчас<span class="muted small">· ${sorted.length}</span></div>
        ${sorted.map(row).join("")}</section>`;
    } else {
      const groups = {};
      shown.slice().sort((a, b2) => (a.ko < b2.ko ? -1 : a.ko > b2.ko ? 1 : a.id - b2.id))
        .forEach((m) => { const d = dayKey(new Date(m.ko)); (groups[d] = groups[d] || []).push(m); });
      Object.keys(groups).sort().forEach((d) => {
        l += `<section class="card block"><div class="lg-head">${esc(dayLabel(d))}<span class="muted small">· ${groups[d].length}</span></div>
          ${groups[d].map(row).join("")}</section>`;
      });
    }
    document.getElementById("stList").innerHTML = l;
    liveSig = stLiveSig();

    const on = (sel, fn) => app.querySelectorAll(sel).forEach((x) => x.addEventListener("click", () => { fn(x); update(); }));
    on("[data-sstat]", (x) => { st.stat = x.dataset.sstat; stSave(); });
    on("[data-sscope]", (x) => { st.scope = x.dataset.sscope; stSave(); });
    on("[data-smode]", (x) => { st.mode = x.dataset.smode; stSave(); });
    on("[data-sconf]", (x) => { st.conf = Number(x.dataset.sconf); stSave(); });
    on("[data-sshow]", (x) => { st.show = x.dataset.sshow; stSave(); });
    on("[data-sday]", (x) => { st.day = x.dataset.sday; ssSet("fp-stlive", st.day === "live" ? "1" : "0"); });
    on("[data-sline]", (x) => { const lk = `${st.stat}:${st.scope}`; st.line[lk] = Math.max(0.5, st.line[lk] + Number(x.dataset.sline)); });
    document.getElementById("stLg").addEventListener("change", (e) => { st.lg = e.target.value; stSave(); update(); });
    document.getElementById("stSort").addEventListener("change", (e) => { st.sort = e.target.value; stSave(); update(); });
  };
  const stLiveSig = () => {
    const live = (D.matches || []).filter((m) => liveOf(m) && inScope(m.lg, scopeGet()));
    if (st.day !== "live") return liveListSig(live.map(ixOf));
    return liveFileState() + "|" + live.map((m) => m.id + ":" + JSON.stringify(liveOf(m).e)).join(",");
  };
  S.onLive = () => { if (stLiveSig() !== liveSig) update(); };
  const q = document.getElementById("stQ");
  q.addEventListener("input", () => { st.q = q.value; update(); });
  update();
}

function renderMatches() {
  setNav("matches");
  const ix = S.index;
  const msAll = ix.matches || [];
  const sc = scopeGet();
  const ms = msAll.filter((m) => inScope(m.lg, sc));
  const days = [...new Set(ms.map((m) => dayKey(new Date(m.ko))))].sort();
  const today = dayKey(new Date());
  if (!S.day || !days.includes(S.day)) {
    S.day = days.find((d) => d >= today && ms.some((m) => dayKey(new Date(m.ko)) === d && m.st === "pending")) ||
      days.find((d) => d >= today) || days[days.length - 1] || today;
  }
  if (S.insOnly == null) S.insOnly = lsGet("fp-insonly") === "1";
  if (S.liveOnly == null) S.liveOnly = ssGet("fp-live") === "1";
  const live = liveMatches().filter((m) => inScope(m.lg, sc));
  const base = S.liveOnly ? live : ms.filter((m) => dayKey(new Date(m.ko)) === S.day);
  const insN = base.filter(isIns).length;
  const inDay = S.insOnly ? base.filter(isIns) : base;
  const counts = {};
  inDay.forEach((m) => { counts[m.lg] = (counts[m.lg] || 0) + 1; });
  if (S.lg !== "all" && !counts[S.lg]) S.lg = "all";
  const shown = inDay.filter((m) => S.lg === "all" || m.lg === S.lg);

  let h = `<h1>Прогнозы матчей</h1>${notices()}`;
  const dayOf = (m) => (S.liveOnly ? !!liveNow(m) : dayKey(new Date(m.ko)) === S.day);
  const scN = { all: msAll.filter(dayOf).length, lg: msAll.filter((m) => dayOf(m) && !isCup(m.lg)).length,
    cup: msAll.filter((m) => dayOf(m) && isCup(m.lg)).length };
  h += scopeBar(scN);
  if (!ms.length) {
    S.onLive = null;
    app.innerHTML = h + `<p class="card pad">${sc === "cup" ? `В ближайшие дни матчей еврокубков нет. Таблицы, пары плей-офф и сила участников —
      в разделе «<a href="#/cups">Еврокубки</a>».` : sc === "lg" ? "В ближайшие дни матчей лиг нет." : "В ближайшие дни матчей наших турниров нет."}</p>`;
    scopeWire(renderMatches);
    return;
  }
  h += `<div class="days" role="tablist">${days.map((d) =>
    `<button class="chip${d === S.day && !S.liveOnly ? " on" : ""}" data-day="${d}" role="tab">${esc(dayLabel(d))}</button>`).join("")}</div>`;
  const byCountry = {};
  ix.leagues.filter((l) => counts[l.key]).forEach((l) => { (byCountry[l.country] = byCountry[l.country] || []).push(l); });
  const countries = Object.keys(byCountry).sort((a, b) => a.localeCompare(b, "ru"));
  const upIns = ms.filter((m) => isIns(m) && m.st === "pending" && new Date(m.ko) > new Date()).length;
  h += `<div class="filter filter-wrap"><span class="sw-group"><label class="switch" title="Показывать только матчи с прогнозом 1X или X2">
      <input type="checkbox" id="insOnly"${S.insOnly ? " checked" : ""}><span class="sw" aria-hidden="true"></span>
      Только 1X и X2 <span class="muted small">(${insN})</span></label>
      <label class="switch" title="Показывать только матчи, которые идут сейчас">
      <input type="checkbox" id="liveOnly"${S.liveOnly ? " checked" : ""}><span class="sw" aria-hidden="true"></span>
      <span class="lv-dot${live.length ? "" : " off"}" aria-hidden="true"></span>Live <span class="muted small">(${live.length})</span></label></span>
    <span class="links-r"><a class="small" href="#/picks">Все прогнозы 1X и X2${upIns ? ` на ближайшие дни — ${upIns}` : ""} →</a>
    ${ix.stats && ix.stats.length ? `<a class="small" href="#/stats">Удары, угловые, карточки →</a>` : ""}</span></div>
    <div class="filter"><label for="lgSel" class="muted small">Лига</label>
    <select id="lgSel" class="sel"><option value="all"${S.lg === "all" ? " selected" : ""}>Все лиги (${inDay.length})</option>
    ${countries.map((c) => `<optgroup label="${esc(c)}">${byCountry[c].map((l) =>
      `<option value="${esc(l.key)}"${S.lg === l.key ? " selected" : ""}>${esc(l.name)} (${counts[l.key]})</option>`).join("")}</optgroup>`).join("")}
    </select></div>`;
  if (S.liveOnly) {
    h += `<p class="muted small lv-note">${liveListNote(live, "Нажмите на матч — там прогноз статистики до матча рядом с текущими показателями.")}</p>`;
    if (!live.length) h += `<p class="card pad">${liveEmptyText()} Выключите переключатель «Live», чтобы увидеть все матчи дня.</p>`;
    else if (!shown.length) h += `<p class="card pad">Среди идущих сейчас матчей прогнозов 1X и X2 нет. Выключите переключатель «Только 1X и X2», чтобы увидеть все идущие матчи.</p>`;
  } else if (S.insOnly && !shown.length) {
    h += `<p class="card pad">В этот день прогнозов 1X и X2 нет — ни у одной команды вероятность победы не достигает 58 %.
      Выберите другой день или выключите переключатель.</p>`;
  }
  for (const l of ix.leagues) {
    const part = shown.filter((m) => m.lg === l.key);
    if (!part.length) continue;
    h += `<section class="card block${l.cup ? ` cup-block cup-b-${esc(l.key)}` : ""}"><div class="lg-head">${l.cup ? cupTag(l.key) : ""}<a href="#/league/${encodeURIComponent(l.key)}">${esc(l.name)}</a>
      <span class="muted small">· ${esc(l.cup ? (l.stage || "еврокубок") : (l.country || ""))}</span></div>${part.map(matchRow).join("")}</section>`;
  }
  h += `<p class="muted small">Полоса — вероятности П1 / ничья / П2 по модели. Справа — ожидаемые голы хозяев и гостей и самый вероятный счёт.
    «Рынок» — цена конторы без маржи, если она уже известна. Время — по вашему часовому поясу.
    У идущего матча — текущий счёт и минута (на странице матча — и статистика по ходу игры рядом с прогнозом до матча);
    переключатель «Live» оставляет только идущие сейчас матчи (счёт и минута ${LIVE_DELAY}).
    Итоговый счёт появляется при ближайшем обновлении сайта после финального свистка (в некоторых лигах — в течение суток),
    до этого матч помечен «итог позже».</p>`;
  app.innerHTML = h;
  liveFill();
  app.querySelectorAll("[data-day]").forEach((b) => b.addEventListener("click", () => {
    S.day = b.dataset.day;
    if (S.liveOnly) { S.liveOnly = false; ssSet("fp-live", "0"); }
    renderMatches();
  }));
  const sel = document.getElementById("lgSel");
  if (sel) sel.addEventListener("change", () => { S.lg = sel.value; renderMatches(); });
  const sw = document.getElementById("insOnly");
  if (sw) sw.addEventListener("change", () => { S.insOnly = sw.checked; lsSet("fp-insonly", sw.checked ? "1" : "0"); renderMatches(); });
  const lv = document.getElementById("liveOnly");
  if (lv) lv.addEventListener("change", () => { S.liveOnly = lv.checked; ssSet("fp-live", lv.checked ? "1" : "0"); renderMatches(); });
  scopeWire(renderMatches);
  const sig = liveListSig(live);
  S.onLive = () => { if (liveListSig(liveMatches().filter((m) => inScope(m.lg, scopeGet()))) !== sig) renderMatches(); };
}

function radar(axes, a, b) {
  const W = 420, H = 300, cx = 210, cy = 156, R = 104, n = axes.length;
  const pt = (i, v) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + Math.cos(ang) * R * v / 100, cy + Math.sin(ang) * R * v / 100];
  };
  let g = "";
  [25, 50, 75, 100].forEach((lv) => {
    g += `<polygon points="${axes.map((_, i) => pt(i, lv).join(",")).join(" ")}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  });
  axes.forEach((ax, i) => {
    const [x, y] = pt(i, 100);
    const [lx, ly] = pt(i, 122);
    g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`;
    const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
    g += `<text x="${lx}" y="${ly + 4}" text-anchor="${anchor}" font-size="12" fill="var(--muted)">${esc(ax)}</text>`;
  });
  const poly = (vals, col) =>
    `<polygon points="${vals.map((v, i) => pt(i, v == null ? 50 : Math.max(4, v)).join(",")).join(" ")}" fill="${col}" fill-opacity=".18" stroke="${col}" stroke-width="2"/>`;
  g += poly(a, "var(--home)") + poly(b, "var(--away)");
  return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Профиль команд">${g}</svg>`;
}
function cmpRow(title, x, y, fmt, lowerBetter) {
  if (x == null && y == null) return "";
  const xs = x == null ? 0 : Math.max(0.0001, lowerBetter ? 1 / Math.max(x, 0.05) : Math.max(x, 0));
  const ys = y == null ? 0 : Math.max(0.0001, lowerBetter ? 1 / Math.max(y, 0.05) : Math.max(y, 0));
  const tot = xs + ys || 1;
  return `<div class="cmp-row"><div class="l">${fmt(x)}</div><div><div class="t">${esc(title)}</div>
    <div class="dual"><i class="h" style="width:${(100 * xs / tot).toFixed(1)}%"></i><i class="a" style="width:${(100 * ys / tot).toFixed(1)}%"></i></div></div>
    <div class="r">${fmt(y)}</div></div>`;
}
function formStrip(list) {
  if (!list || !list.length) return `<span class="muted small">нет данных</span>`;
  return `<div class="form">${list.map((f) =>
    `<span class="f ${f.r}" title="${esc(f.d)} ${esc(f.c || "")}: ${esc(f.v === "Д" ? "дома" : "в гостях")} с ${esc(f.o)} ${esc(f.s)}">${{ W: "В", D: "Н", L: "П" }[f.r]}</span>`).join("")}</div>`;
}

const ST_ORDER = ["shots", "sot", "corners", "fouls", "cards", "offsides", "throwins"];
const ST_NAME = { shots: "Удары", sot: "Удары в створ", corners: "Угловые", fouls: "Фолы", cards: "Карточки",
  offsides: "Офсайды", throwins: "Ауты" };
const ST_SHORT = { shots: "удары", sot: "в створ", corners: "угловые", fouls: "фолы", cards: "карточки",
  offsides: "офсайды", throwins: "ауты" };
const ST_NOTE = {
  shots: "все удары по воротам: в створ, мимо и заблокированные", sot: "удары, которые пришлись в створ ворот (в том числе голы)",
  corners: "угловые удары", fouls: "фолы, зафиксированные судьёй", cards: "жёлтые и красные карточки вместе",
  offsides: "положения вне игры", throwins: "вбрасывания из аута" };
const CONFS = [60, 65, 70, 75, 80, 85];
const fmtL = (x) => String(x).replace(".", ",");
const Q_MARK = `<sup class="q-mark" title="Предварительные данные сразу после матча; окончательные — примерно через сутки">*</sup>`;

function spDist(pk) {
  const lo = pk[0], v = pk[1];
  const s = v.reduce((a, b) => a + b, 0) || 1;
  return { lo, p: v.map((x) => x / s) };
}
function spOver(pk, L) {
  const d = spDist(pk);
  let s = 0;
  for (let i = d.p.length - 1; i >= 0; i--) if (d.lo + i > L) s += d.p[i];
  return s;
}
function spRange(pk) { return [pk[0] + 0.5, pk[0] + pk[1].length - 1.5]; }
function spMedianLine(pk) {
  const [a, b] = spRange(pk);
  let best = a, gap = 9;
  for (let L = a; L <= b + 1e-9; L += 1) { const g = Math.abs(spOver(pk, L) - 0.5); if (g < gap - 1e-12) { gap = g; best = L; } }
  return best;
}
function confLines(pk, c) {
  const d = spDist(pk);
  const ov = [];
  let tail = 0;
  for (let i = d.p.length - 1; i >= 1; i--) { tail += d.p[i]; ov.push([d.lo + i - 0.5, tail]); }
  ov.sort((x, y) => x[0] - y[0]);
  let over = null, under = null;
  for (const [L, p] of ov) if (P100(p) >= c) over = [L, p];
  for (const [L, p] of ov) if (P100(1 - p) >= c) { under = [L, 1 - p]; break; }
  return { over, under };
}
const mkOver = (r) => (r && r[1] > 1 && r[2] > 1 ? (1 / r[1]) / (1 / r[1] + 1 / r[2]) : null);
const spScopeMean = (s, sc) => (sc === "h" ? s.m[0] : sc === "a" ? s.m[1] : s.m[0] + s.m[1]);
const saScope = (v, sc) => (!v ? null : sc === "h" ? v[0] : sc === "a" ? v[1] : v[0] + v[1]);

function stState() {
  if (S.st) return S.st;
  const d = { conf: 70, scope: "t", stat: "corners", mode: "conf", sort: "time", lg: "all", day: "all", q: "", show: "both", line: {} };
  try {
    const s = JSON.parse(lsGet("fp-stats") || "{}");
    if (CONFS.includes(s.conf)) d.conf = s.conf;
    if (["t", "h", "a"].includes(s.scope)) d.scope = s.scope;
    if (ST_ORDER.includes(s.stat)) d.stat = s.stat;
    if (["conf", "line"].includes(s.mode)) d.mode = s.mode;
    if (["time", "hi", "lo"].includes(s.sort)) d.sort = s.sort;
    if (["both", "over", "under"].includes(s.show)) d.show = s.show;
    if (typeof s.lg === "string") d.lg = s.lg;
  } catch (e) { }
  S.st = d;
  return d;
}
function stSave() {
  const { conf, scope, stat, mode, sort, lg, show } = S.st;
  lsSet("fp-stats", JSON.stringify({ conf, scope, stat, mode, sort, lg, show }));
}
const chipBtn = (attr, val, on, label, n) =>
  `<button class="chip${on ? " on" : ""}" data-${attr}="${esc(val)}">${label}${n != null ? `<span class="n">${n}</span>` : ""}</button>`;

function distChart(pk, line, actual) {
  const d = spDist(pk);
  const n = d.p.length;
  const W = 640, H = 170, pl = 8, pr = 8, pt = 10, pb = 26;
  const bw = (W - pl - pr) / n;
  const mx = Math.max.apply(null, d.p) || 1;
  const y = (v) => pt + (H - pt - pb) * (1 - v / mx);
  const every = n > 36 ? 5 : n > 18 ? 2 : 1;
  let g = "";
  d.p.forEach((p, i) => {
    const v = d.lo + i;
    const x = pl + i * bw;
    const over = v > line;
    const isAct = actual != null && (v === actual || (i === 0 && actual < v) || (i === n - 1 && actual > v));
    const lab = i === 0 && n > 1 ? `≤${v}` : i === n - 1 && n > 1 ? `≥${v}` : String(v);
    g += `<rect x="${(x + 1).toFixed(1)}" y="${y(p).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${(H - pb - y(p)).toFixed(1)}"
      rx="2" fill="${over ? "var(--accent)" : "var(--draw)"}" fill-opacity="${over ? 0.9 : 0.55}"${isAct ? ' stroke="var(--text)" stroke-width="2"' : ""}>
      <title>${lab}: ${pct(p, 1)}</title></rect>`;
    if (i % every === 0 || i === n - 1) {
      g += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(lab)}</text>`;
    }
  });
  const lx = pl + (line + 0.5 - d.lo) * bw;
  if (lx > pl && lx < W - pr) {
    g += `<line x1="${lx.toFixed(1)}" x2="${lx.toFixed(1)}" y1="${pt - 4}" y2="${H - pb + 2}" stroke="var(--text)" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  }
  return `<svg class="chart dist" viewBox="0 0 ${W} ${H}" role="img" aria-label="Распределение: столбики правее пунктира — больше ${fmtL(line)}">${g}</svg>`;
}

const matchStarted = (m) => m.status === "pending" && new Date(m.kickoff) <= new Date();

function statsMatchSection(m, going) {
  if (!m.sp || !ST_ORDER.some((k) => m.sp[k])) {
    return m.status === "settled" ? "" : `<h2>Статистика матча — прогноз</h2><p class="muted small card pad">Прогноза статистики для этого матча нет:
      по этому турниру сейчас нет нужных данных или они не прошли проверку.</p>`;
  }
  if (going) {
    return `<h2 id="st">Статистика матча — прогноз до матча</h2>
      <p class="muted small st-pre">Это последний прогноз, сделанный до стартового свистка: по ходу игры он не пересчитывается.
      Колонка «Сейчас» — текущие показатели матча, с ними удобно сравнивать ожидания и линии.</p>
      <section class="card pad st-box" id="stBox"></section>`;
  }
  return `<h2 id="st">Статистика матча — прогноз</h2><section class="card pad st-box" id="stBox"></section>`;
}

function stMatchMount(m) {
  const box = document.getElementById("stBox");
  if (!box) return;
  const st = stState();
  const keys = ST_ORDER.filter((k) => m.sp[k]);
  if (!keys.includes(st.stat)) st.stat = keys.includes("corners") ? "corners" : keys[0];
  if (S.stFor !== m.id) { S.stFor = m.id; S.stTab = st.scope; S.stLine = {}; }
  const sa = m.status === "settled" && m.sa ? m.sa : null;
  const saSrc = (sa && m.sa_q) || {};
  const going = matchStarted(m);
  const scName = (sc) => (sc === "t" ? "Тотал матча" : sc === "h" ? m.home : m.away);
  const liveNowStats = () => {
    const e = going ? liveFor(m.id) : null;
    if (!e) return null;
    const x = {};
    keys.forEach((k) => { if (e.x && Array.isArray(e.x[k])) x[k] = e.x[k]; });
    return { e, x, any: Object.keys(x).length > 0, ft: e.st === "ft" };
  };
  let lv = null;

  const render = () => {
    const sc = st.scope;
    lv = liveNowStats();
    const nowCol = !!(lv && lv.any);
    const nowName = lv && lv.ft ? "Итог" : "Сейчас";
    let h = `<div class="pk-row"><span class="muted small">Уверенность</span><div class="chips">
        ${CONFS.map((c) => chipBtn("stconf", c, st.conf === c, `от ${c}%`)).join("")}</div></div>
      <div class="pk-row"><span class="muted small">Линии</span><div class="chips">
        ${["t", "h", "a"].map((x) => chipBtn("stscope", x, sc === x, esc(scName(x)))).join("")}</div></div>
      <div class="st-sum${sa || nowCol ? " has-fact" : ""}" role="table">
      <div class="st-srow st-shead" role="row"><span>Показатель</span><span class="st-exp">${going ? "Ожидалось до матча" : "Ожидается"}<br><span class="muted">хоз. : гост. · тотал</span></span>
        <span>Больше</span><span>Меньше</span>${sa ? "<span>Факт</span>" : nowCol ? `<span>${nowName}</span>` : ""}</div>`;
    keys.forEach((k) => {
      const s = m.sp[k];
      const cl = confLines(s[sc], st.conf);
      const y = sa ? saScope(sa[k], sc) : null;
      const cell = (x, isOver) => {
        if (!x) return `<span class="muted">—</span>`;
        const hit = y == null ? "" : (isOver ? y > x[0] : y < x[0]) ? " hit" : " miss";
        return `<span class="st-line${hit}">${isOver ? "больше" : "меньше"} ${fmtL(x[0])} <b>${pct(x[1])}</b>${hit ? (hit === " hit" ? " ✓" : " ✗") : ""}</span>`;
      };
      const cur = nowCol ? lv.x[k] : null;
      h += `<button class="st-srow${st.stat === k ? " on" : ""}" data-stk="${k}" role="row">
        <span class="st-name">${ST_NAME[k]}${s.r ? ` <span class="st-ref" title="учтена строгость судьи матча">судья</span>` : ""}</span>
        <span class="st-exp"><b>${num(s.m[0], 1)}</b> : <b>${num(s.m[1], 1)}</b> <span class="muted">·</span> <b>${num(s.m[0] + s.m[1], 1)}</b></span>
        ${cell(cl.over, true)}${cell(cl.under, false)}
        ${sa ? `<span class="st-fact">${sa[k] ? `${sa[k][0]} : ${sa[k][1]}${saSrc[k] ? Q_MARK : ""}` : "—"}</span>`
          : nowCol ? `<span class="st-fact ${lv.ft ? "st-ft" : "st-now"}">${cur ? `${cur[0]} : ${cur[1]}` : "—"}</span>` : ""}</button>`;
    });
    let lvNote = "";
    if (going && lv && lv.ft) {
      lvNote = lv.any ? `«Итог» — показатели после финального свистка (данные на ${esc(fmtTime(lv.e.t || S.live.generated))});
        окончательная статистика появится при ближайшем обновлении сайта.` : "";
    } else if (going && lv) {
      lvNote = `«Сейчас» — показатели по ходу матча${lv.e.st === "live" && lv.e.min ? ` (${esc(lv.e.min)})` : lv.e.st === "ht" ? " (перерыв)" : ""}
        на ${esc(fmtTime(lv.e.t || S.live.generated))}; ${LIVE_DELAY}.${lv.any ? "" : " Текущей статистики по этому матчу нет — только счёт."}`;
    } else if (going && S.index && S.index.live_url && liveNow({ id: m.id, ko: m.kickoff, st: "pending" })) {
      lvNote = "Текущие показатели появятся здесь, когда придут данные по ходу матча.";
    }
    h += `</div>${lvNote ? `<p class="small lv-st-note">${lvNote}</p>` : ""}${keys.some((k) => saSrc[k]) ? `<p class="muted small">${Q_MARK} — предварительный факт сразу после матча; окончательный
      приходит примерно через сутки. Без отметки — окончательные данные.</p>` : ""}<p class="muted small">«Больше» — самая высокая линия, а «меньше» — самая низкая, на которых вероятность не ниже выбранной уверенности
      (для ${sc === "t" ? "тотала матча" : "показателя команды «" + esc(scName(sc)) + "»"})${going ? " — по прогнозу до матча" : ""}. Нажмите на строку — ниже откроется подробный разбор.</p>
      <div id="stDetail"></div>`;
    box.innerHTML = h;
    box.querySelectorAll("[data-stconf]").forEach((b) => b.addEventListener("click", () => { st.conf = Number(b.dataset.stconf); stSave(); render(); }));
    box.querySelectorAll("[data-stscope]").forEach((b) => b.addEventListener("click", () => { st.scope = b.dataset.stscope; S.stTab = st.scope; stSave(); render(); }));
    box.querySelectorAll("[data-stk]").forEach((b) => b.addEventListener("click", () => { st.stat = b.dataset.stk; stSave(); render(); }));
    detail();
  };

  const detail = () => {
    const k = st.stat, s = m.sp[k];
    const tab = S.stTab || "t";
    const el = document.getElementById("stDetail");
    const act = sa && sa[k] ? sa[k] : null;
    const cur = !act && lv && lv.x[k] ? lv.x[k] : null;
    const curName = lv && lv.ft ? "итог" : "сейчас";
    let h = `<div class="st-detail"><div class="st-dhead"><b>${ST_NAME[k]}</b> <span class="muted small">— ${ST_NOTE[k]}</span></div>
      <p class="st-big">${going ? "До матча ожидалось" : "Ожидается"} <b style="color:var(--home)">${num(s.m[0], 2)}</b> : <b style="color:var(--away)">${num(s.m[1], 2)}</b>,
      всего <b>${num(s.m[0] + s.m[1], 2)}</b>${act ? ` · в матче было <b>${act[0]} : ${act[1]}</b>${saSrc[k] ? Q_MARK : ""}`
        : cur ? ` · <span class="lv-now">${curName} <b>${cur[0]} : ${cur[1]}</b>, всего <b>${cur[0] + cur[1]}</b></span>` : ""}</p>
      <div class="st-who"><div class="muted small">У кого будет больше${going ? " — прогноз до матча" : ""}</div>${pbar(s.w, false, ["у хозяев больше", "поровну", "у гостей больше"])}
        <div class="st-wl"><span>${esc(m.home)} ${pct(s.w[0])}</span><span>поровну ${pct(s.w[1])}</span><span>${esc(m.away)} ${pct(s.w[2])}</span></div></div>
      <div class="chips st-tabs">${["t", "h", "a", "d"].map((x) => chipBtn("sttab", x, tab === x,
        x === "t" ? "Тотал матча" : x === "h" ? esc(m.home) : x === "a" ? esc(m.away) : "Фора")).join("")}</div>`;
    if (tab === "d") {
      h += act ? stHandicap(m, s, act, "Итог") : cur ? stHandicap(m, s, cur, lv.ft ? "Итог" : "Сейчас") : stHandicap(m, s, null, "");
    } else {
      const pk = s[tab];
      const lk = `${k}:${tab}`;
      const [a, b] = spRange(pk);
      if (!S.stLine) S.stLine = {};
      let L = S.stLine[lk];
      if (L == null || L < a || L > b) L = spMedianLine(pk);
      S.stLine[lk] = L;
      const y = act ? saScope(act, tab) : null;
      const yNow = cur ? saScope(cur, tab) : null;
      const yFt = yNow != null && lv.ft;
      const po = spOver(pk, L);
      const mk = m.smk && m.smk[k] ? m.smk[k][tab] : null;
      h += `<div class="st-step"><button class="stepb" data-stl="-1" aria-label="Линия меньше"${L - 1 < a ? " disabled" : ""}>−</button>
        <div class="st-stepv"><span class="muted small">линия</span><b>${fmtL(L)}</b></div>
        <button class="stepb" data-stl="1" aria-label="Линия больше"${L + 1 > b ? " disabled" : ""}>+</button>
        <div class="st-po"><div><span class="muted small">больше ${fmtL(L)}</span><b class="${P100(po) >= st.conf ? "good" : ""}">${pct(po)}</b></div>
        <div><span class="muted small">меньше ${fmtL(L)}</span><b class="${P100(1 - po) >= st.conf ? "good" : ""}">${pct(1 - po)}</b></div></div></div>
        ${distChart(pk, L, y)}
        <p class="muted small" style="margin-top:2px">Столбик — вероятность каждого значения${y != null ? "; обведён фактический итог" : ""}. Зелёные — больше линии.</p>`;
      const lines = [];
      for (let x = Math.max(a, L - 3); x <= Math.min(b, L + 3) + 1e-9; x += 1) lines.push(x);
      const nowHead = yNow == null ? "" : yFt ? "<th>Итог</th>"
        : `<th title="Сколько уже есть сейчас и сколько не хватает до «больше»">Сейчас: ${yNow}</th>`;
      const nowCell = (x) => (yNow == null ? "" : yFt ? `<td>${yNow > x ? "больше" : "меньше"}</td>`
        : yNow > x ? `<td class="lv-over">уже больше</td>` : `<td>ещё ${Math.floor(x) + 1 - yNow}</td>`);
      h += `<table class="kv st-lines"><tr><th>Линия</th><th>Больше</th><th>Меньше</th>${mk ? `<th>Контора${going ? " до матча" : ""}: больше</th>` : ""}${y != null ? "<th>Итог</th>" : nowHead}</tr>
        ${lines.map((x) => {
          const p = spOver(pk, x);
          const hi = (q) => (P100(q) >= st.conf ? ' class="good"' : "");
          const isMk = mk && Math.abs(mk[0] - x) < 1e-9;
          return `<tr${Math.abs(x - L) < 1e-9 ? ' class="sel"' : ""}><td>${fmtL(x)}</td><td${hi(p)}>${pct(p, 1)}</td><td${hi(1 - p)}>${pct(1 - p, 1)}</td>
            ${mk ? `<td>${isMk ? pct(mkOver(mk), 1) : ""}</td>` : ""}${y != null ? `<td>${y > x ? "больше" : "меньше"}</td>` : nowCell(x)}</tr>`;
        }).join("")}</table>`;
      if (yNow != null && !yFt) {
        h += `<p class="muted small">Вероятности в таблице — прогноз до матча на весь матч. «Ещё N» — сколько не хватает
          до «больше» от текущего значения (${yNow}).</p>`;
      }
      if (mk) {
        h += `<p class="small">Контора${going ? " (линия до матча)" : ""}: основная линия <b>${fmtL(mk[0])}</b> — больше ${pct(mkOver(mk))} без маржи; модель — ${pct(spOver(pk, mk[0]))}.
          <span class="muted">Расхождение — повод присмотреться, а не сигнал к ставке.</span></p>`;
      }
    }
    if ((k === "cards" || k === "fouls") && m.ref) {
      const e = m.ref[k];
      h += `<p class="small">Судья: <b>${esc(m.ref.name || "—")}</b>${e ? ` — в данных ${e[1]} ${plural(e[1], ["матч", "матча", "матчей"])} лиги;
        ${ST_SHORT[k]} у него ${e[0] >= 1.005 ? `в среднем <b>+${Math.round((e[0] - 1) * 100)}%</b> к обычному` : e[0] <= 0.995 ? `в среднем <b>−${Math.round((1 - e[0]) * 100)}%</b> к обычному` : "на уровне средних"}
        (с поправкой на команды; по немногим матчам оценка осторожно тянется к среднему).` : " — в данных лиги его матчей нет, принят средний судья."}</p>`;
    } else if ((k === "cards" || k === "fouls") && going) {
      h += `<p class="muted small">Судья матча не был известен до стартового свистка — в прогнозе принят средний судья.</p>`;
    } else if ((k === "cards" || k === "fouls") && m.status === "pending") {
      h += `<p class="muted small">Судья матча ещё не назначен — принят средний; когда судью назовут (обычно за 1–2 дня), прогноз учтёт его строгость.</p>`;
    }
    h += `</div>`;
    el.innerHTML = h;
    el.querySelectorAll("[data-sttab]").forEach((b) => b.addEventListener("click", () => { S.stTab = b.dataset.sttab; detail(); }));
    el.querySelectorAll("[data-stl]").forEach((b) => b.addEventListener("click", () => {
      const lk = `${k}:${S.stTab}`;
      S.stLine[lk] = S.stLine[lk] + Number(b.dataset.stl);
      detail();
    }));
  };
  render();
  if (going) {
    let sig = JSON.stringify(liveFor(m.id) || null);
    S.onLive = () => {
      const s = JSON.stringify(liveFor(m.id) || null);
      if (s !== sig && document.getElementById("stBox") === box) { sig = s; render(); }
    };
  }
}

function stHandicap(m, s, act, lab) {
  if (!s.d) return "";
  const d = spDist(s.d);
  const cover = (x) => { let w = 0; d.p.forEach((p, i) => { if (d.lo + i + x > 0) w += p; }); return w; };
  const dAct = act ? act[0] - act[1] : null;
  const dmin = d.lo, dmax = d.lo + d.p.length - 1;
  const rows = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].filter((x) => -x > dmin && -x < dmax);
  return `<table class="kv st-lines"><tr><th>Фора</th><th>${esc(m.home)}</th><th>${esc(m.away)}</th>${dAct != null ? `<th>${esc(lab || "Итог")}</th>` : ""}</tr>
    ${rows.map((x) => {
      const w = cover(x);
      return `<tr><td>${esc(m.home)} ${fmtLine(x)} · ${esc(m.away)} ${fmtLine(-x)}</td><td>${pct(w, 1)}</td><td>${pct(1 - w, 1)}</td>
        ${dAct != null ? `<td>${dAct + x > 0 ? esc(m.home) : esc(m.away)}</td>` : ""}</tr>`;
    }).join("")}</table>
    <p class="muted small">Фора по показателю: например, «${esc(m.home)} −1,5» — у хозяев на 2 и больше, чем у гостей.
    Разница считается из той же совместной модели, что и тоталы.</p>`;
}

function matchStatsSection(m) {
  const st = m.mst;
  if (!st || !st.rows || !st.rows.length) {
    return `<p class="muted small">Статистика матча ещё не пришла — она появится при одном из следующих обновлений.</p>`;
  }
  const row = ([label, a, b]) => {
    const tot = a + b;
    const wa = tot > 0 ? (100 * a / tot) : 50;
    const fa = label.startsWith("Ожидаемые") ? num(a, 2) : a, fb = label.startsWith("Ожидаемые") ? num(b, 2) : b;
    return `<div class="st-row"><div class="st-label"><b class="${a > b ? "st-lead" : ""}">${fa}</b><span>${esc(label)}</span><b class="${b > a ? "st-lead" : ""}">${fb}</b></div>
      <div class="st-bar">${tot > 0 ? `<i style="width:${wa.toFixed(1)}%;background:var(--home)"></i><i style="width:${(100 - wa).toFixed(1)}%;background:var(--away)"></i>` : ""}</div></div>`;
  };
  const xg = st.rows.find((r) => r[0].startsWith("Ожидаемые"));
  return `<h2>Статистика матча</h2><section class="card pad">
    <div class="st-head"><span>${esc(m.home)}</span><span>${st.ht ? `1-й тайм ${st.ht[0]}:${st.ht[1]}` : ""}</span><span>${esc(m.away)}</span></div>
    ${st.rows.map(row).join("")}
    ${xg ? `<p class="small" style="margin-top:12px">До матча модель ждала <b>${num(m.lh, 2)} : ${num(m.la, 2)}</b> гола; xG матча — <b>${num(xg[1], 2)} : ${num(xg[2], 2)}</b>, счёт — <b>${st.score[0]}:${st.score[1]}</b>.</p>` : ""}
    <p class="muted small">${st.q
      ? "Предварительные данные сразу после матча. Полная статистика (владение, xG, сейвы) появится примерно через сутки."
      : "Статистика после матча."}</p></section>`;
}

function hcp(gd, line) {
  const T = (gd.length - 1) / 2;
  let w = 0, p = 0, l = 0;
  gd.forEach((x, i) => { const v = i - T + line; if (v > 0) w += x; else if (v === 0) p += x; else l += x; });
  return [w, p, l];
}
const fmtLine = (x) => (x > 0 ? "+" : x < 0 ? "−" : "") + String(Math.abs(x)).replace(".", ",");
const HCP_LINES = [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
function handicapSection(m) {
  const G = m.gd;
  if (!Array.isArray(G) || G.length < 7 || G.length % 2 !== 1) return "";
  const T = (G.length - 1) / 2;
  const sum = (a, b) => G.slice(a, b + 1).reduce((s, x) => s + x, 0);
  const rows = [
    ["Хозяева +3 и больше", sum(T + 3, G.length - 1), "var(--home)"], ["Хозяева +2", G[T + 2], "var(--home)"],
    ["Хозяева +1", G[T + 1], "var(--home)"], ["Ничья", G[T], "var(--muted)"], ["Гости +1", G[T - 1], "var(--away)"],
    ["Гости +2", G[T - 2], "var(--away)"], ["Гости +3 и больше", sum(0, T - 3), "var(--away)"]];
  const mx = Math.max.apply(null, rows.map((r) => r[1]));
  let h = `<div class="grid2"><div><h2>Разница мячей</h2><section class="card pad">
    ${rows.map(([k, p, c]) => `<div class="gdrow"><span>${k}</span><span class="gdbar"><i style="width:${(100 * p / mx).toFixed(1)}%;background:${c}"></i></span><b>${pct(p, 1)}</b></div>`).join("")}
    <p class="muted small">С каким перевесом закончится матч — из той же матрицы счетов, что и вероятности исхода.</p>
    </section></div><div><h2>Форы</h2><section class="card pad">
    <table class="kv"><tr><th>Фора</th><th>Хозяева</th><th>Возврат</th><th>Гости</th></tr>
    ${HCP_LINES.map((x) => {
      const [w, p, l] = hcp(G, x);
      return `<tr><td class="tl" style="text-align:left">Ф1(${fmtLine(x)}) · Ф2(${fmtLine(-x)})</td><td>${pct(w, 1)}</td>
        <td>${Number.isInteger(x) ? pct(p, 1) : "—"}</td><td>${pct(l, 1)}</td></tr>`;
    }).join("")}</table>
    <p class="muted small">Ф1(−1,5): хозяевам нужно выиграть в два мяча и больше; Ф2(+1,5) — обратное. При целой форе
    бывает возврат: Ф1(−1) возвращается, если хозяева выиграли ровно в один мяч; Ф1(0) — победа хозяев с возвратом при ничьей.</p>
    </section></div></div>`;
  return h;
}

function tieSection(m) {
  const parts = [];
  if (m.neu) parts.push(`Финал — на нейтральном поле: домашнего преимущества нет ни у одной команды.`);
  if (m.leg === 2 && m.agg0) {
    const a = m.agg0;
    const d = a[0] - a[1];
    parts.push(`Первый матч: ${esc(m.away)} — ${esc(m.home)} <b>${a[1]}:${a[0]}</b>. Перед ответным по сумме
      ${d === 0 ? "<b>ничья</b>" : `впереди <b>${esc(d > 0 ? m.home : m.away)}</b> (+${Math.abs(d)})`}.`);
  } else if (m.leg === 1) {
    parts.push(`Первый матч противостояния; ответный — на поле ${esc(m.away)}.`);
  }
  let h = parts.length ? `<p class="cx-note">${parts.join(" ")}</p>` : "";
  const ad = m.adv;
  if (ad && ad.h != null && m.status === "pending") {
    const t = m.neu ? "Кто выиграет трофей" : "Шансы пройти дальше";
    h += `<h2>${t}</h2><section class="card pad">${advBar(ad.h, ad.a, m.home, m.away)}
      <div class="adv-legend"><div><div class="v" style="color:var(--home)">${pct(ad.h)}</div><div class="k">${esc(m.home)}</div></div>
        <div><div class="v" style="color:var(--away)">${pct(ad.a)}</div><div class="k">${esc(m.away)}</div></div></div>
      <p class="muted small">${m.neu ? "Победа в основное время, а при ничьей — в дополнительное время или по пенальти."
        : m.leg === 2 ? "С учётом счёта первого матча: при ничьей по сумме двух матчей — дополнительное время, затем пенальти."
        : "С учётом ответного матча на поле соперника: модель разыгрывает оба матча, а при ничьей по сумме — дополнительное время и пенальти."}
      ${ad.et != null ? ` Дополнительное время понадобится с вероятностью ${pct(ad.et)}, серия пенальти — ${pct(ad.pen)}.` : ""}
      Дополнительное время — 30 минут с тем же темпом голов; пенальти — 50 на 50. Вероятности исхода ниже — только основное время (90 минут).</p></section>`;
  }
  return h;
}

function motLine(m) {
  if (!m.mot || m.mot[0] == null || m.mot[1] == null || Math.abs(m.mot[0] - m.mot[1]) < 0.15) return "";
  const say = (x) => (x >= 0.25 ? "ещё борется за своё место в таблице" : x >= 0.05 ? "сохраняет небольшие турнирные шансы"
    : "турнирно почти ничего не решает");
  const p0 = m.p0 ? ` Без этой поправки: П1 ${pct(m.p0[0])} · Х ${pct(m.p0[1])} · П2 ${pct(m.p0[2])}.` : "";
  return `<p class="muted small mot">Учтена турнирная мотивация: ${esc(m.home)} ${say(m.mot[0])}, ${esc(m.away)} — ${say(m.mot[1])};
    более мотивированной команде добавлено немного силы.${p0}</p>`;
}

async function renderMatch(lgKey, id) {
  setNav("matches");
  const L = await ensureLeague(lgKey);
  const m = (L.matches || []).find((x) => String(x.id) === String(id));
  if (!m) {
    app.innerHTML = `<p class="error">Матч не найден — возможно, он уже выпал из окна показа.</p><p><a href="#/">← Ко всем матчам</a></p>`;
    return;
  }
  const settled = m.status === "settled" && m.result;
  const going = matchStarted(m);
  const [ph, pa] = m.prof || [null, null];
  const P = m.p;
  const cup = !!L.cup;
  if (cup) setNav("cups");
  const tl = (tid, name) => (cup ? cupTeamLink(L.tc, tid, name) : teamLink(L.key, tid, name));
  const sub = (i, tid) => {
    const pos = m.pos && m.pos[i] ? m.pos[i] + (cup ? "-е место в общем этапе" : "-е место") : "";
    const c = cup ? (teamFrom(L.tc, tid) || [])[0] : "";
    return [c, pos].filter(Boolean).map(esc).join(" · ");
  };
  let h = cup
    ? `<div class="crumbs"><a href="#/cups">Еврокубки</a> · <a href="#/league/${encodeURIComponent(L.key)}">${esc(L.name)}</a></div>`
    : `<div class="crumbs"><a href="#/">Матчи</a> · <a href="#/league/${encodeURIComponent(L.key)}">${esc(L.country)} · ${esc(L.name)}</a></div>`;
  h += notices();
  h += `<section class="card mhead${cup ? ` cup-mh cup-m-${esc(L.key)}` : ""}">
    <div><div class="tm">${tl(m.home_id, m.home)}</div><div class="sub">${sub(0, m.home_id)}</div></div>
    <div>${cup ? `<div class="cx-top">${cupTag(L.key)} ${esc(stageLabel(m) || "")}</div>` : ""}${settled ? `<div class="big-res">${m.result[0]}:${m.result[1]}</div><div class="sub">финал${cup ? " · основное время" : ""}${m.rq ? ' <span class="muted" title="Итог сразу после матча; окончательно подтверждается примерно через сутки">· предварительно</span>' : ""}</div>` : `<div class="vs">${esc(fmtDateTime(m.kickoff))}</div>`}</div>
    <div><div class="tm">${tl(m.away_id, m.away)}</div><div class="sub">${sub(1, m.away_id)}</div></div>
  </section>`;
  if (cup) h += tieSection(m);
  if (settled) {
    const ok = m.pk && m.pk.h != null ? m.pk.h : argmax(P) === outcome(m.result);
    h += `<p class="notice">Прогноз ниже — последний, сделанный до стартового свистка (${esc(fmtDateTime(m.made))}).
      ${m.pk ? `Прогноз <b>${PICK_LABEL[m.pk.c]}</b> ${ok ? "<b class='good'>сыграл</b>" : "<b class='bad'>не сыграл</b>"}.` : `Исход ${ok ? "<b class='good'>угадан</b>" : "<b class='bad'>не угадан</b>"}.`}</p>`;
    h += matchStatsSection(m);
  } else if (going) {
    S.curMatch = m;
    h += `<section class="card pad live-box" id="liveBox" hidden></section>`;
    h += lgQuick(L.key)
      ? `<p class="notice">Матч начался в ${esc(fmtTime(m.kickoff))}. Итоговый счёт и статистика появятся здесь при ближайшем обновлении сайта
      после финального свистка; полная статистика — примерно через сутки. Прогноз ниже — последний, сделанный до стартового свистка.</p>`
      : `<p class="notice">Матч начался в ${esc(fmtTime(m.kickoff))}. Итоговый счёт и статистика появятся здесь обычно в течение суток после матча.
      Прогноз ниже — последний, сделанный до стартового свистка.</p>`;
    h += statsMatchSection(m, true);
  }

  h += `<h2>Вероятности исхода</h2><section class="card pad">
    ${m.pk ? `<p class="pick-line">Прогноз: ${pickTag(m.pk, false)} <span>${PICK_TITLE[m.pk.c]} — <b>${pct(m.pk.p)}</b></span></p>` : ""}
    ${pbar(P, true)}
    <div class="pbar-legend">${P.map((x, i) => `<div><div class="v">${pct(x)}</div><div class="k">${["Победа хозяев", "Ничья", "Победа гостей"][i]} · ≈ ${num(1 / x, 2)}</div></div>`).join("")}</div>
    ${motLine(m)}`;
  if (m.market) {
    h += `<table class="kv" style="margin-top:14px"><tr><th></th><th>П1</th><th>Х</th><th>П2</th></tr>
      <tr><td>Модель</td>${P.map((x) => `<td>${pct(x, 1)}</td>`).join("")}</tr>
      <tr><td>Рынок без маржи</td>${m.market.map((x) => `<td>${pct(x, 1)}</td>`).join("")}</tr>
      <tr><td>Разница</td>${P.map((x, i) => `<td>${sgn((x - m.market[i]) * 100, 1)} п.п.</td>`).join("")}</tr></table>
      <p class="muted small">Рынок — цена конторы, маржа снята пропорционально. Расхождение — повод разобраться, а не сигнал к ставке:
      на проверке модель и рынок близки по точности (см. «Точность»).</p>`;
  }
  h += `<p class="muted small">«≈» — коэффициент, равный обратной вероятности, без маржи.</p></section>`;

  h += `<div class="grid2"><div><h2>Ожидаемые голы</h2><section class="card pad">
      <div class="xg"><div><div class="v" style="color:var(--home)">${num(m.lh, 2)}</div><div class="muted small">${esc(m.home)}</div></div>
      <div><div class="v" style="color:var(--away)">${num(m.la, 2)}</div><div class="muted small">${esc(m.away)}</div></div></div>
      <table class="kv" style="margin-top:12px"><tr><th>Тотал</th><th>Больше</th><th>Меньше</th></tr>
      ${["0.5", "1.5", "2.5", "3.5", "4.5"].map((k) => `<tr><td>${k}</td><td>${pct(m.ou[k], 1)}</td><td>${pct(1 - m.ou[k], 1)}</td></tr>`).join("")}
      <tr><td>Обе забьют</td><td>${pct(m.btts, 1)}</td><td>${pct(1 - m.btts, 1)}</td></tr>
      <tr><td>Сухой матч хозяев / гостей</td><td>${pct(m.cs && m.cs[0], 1)}</td><td>${pct(m.cs && m.cs[1], 1)}</td></tr></table>
    </section></div>`;
  const maxg = Math.max.apply(null, m.grid.flat());
  h += `<div><h2>Вероятные счета</h2><section class="card pad">
      <div class="tops">${m.top.map((t) => `<span><b>${esc(t.s)}</b>${pct(t.p, 1)}</span>`).join("")}</div>
      <table class="heat" style="margin-top:14px" aria-label="Матрица счетов"><tr><th></th>${[0, 1, 2, 3, 4, 5].map((j) => `<th>${j}</th>`).join("")}</tr>
      ${m.grid.map((row, i) => `<tr><th>${i}</th>${row.map((v) => `<td style="background:rgba(var(--heat),${(0.06 + 0.8 * v / maxg).toFixed(3)})">${(v * 100).toFixed(1)}</td>`).join("")}</tr>`).join("")}
      </table><p class="muted small" style="text-align:center">строки — голы хозяев, столбцы — гостей, % вероятности</p>
    </section></div></div>`;
  h += handicapSection(m);
  if (!going) h += statsMatchSection(m, false);

  if (ph && pa) {
    const ax = ["Атака", "Оборона", "xG-баланс", "Форма", "Дом / выезд"];
    const va = [ph.r_att, ph.r_def, ph.r_xg, ph.form, ph.r_home];
    const vb = [pa.r_att, pa.r_def, pa.r_xg, pa.form, pa.r_away];
    h += `<h2>Сравнение сил</h2><section class="card pad"><div class="grid2"><div>${radar(ax, va, vb)}
      <div class="legend"><span><i style="background:var(--home)"></i>${esc(m.home)}</span><span><i style="background:var(--away)"></i>${esc(m.away)}</span></div></div><div>
      ${cmpRow("Забивает за матч (модель)", ph.mgf, pa.mgf, (x) => num(x, 2))}
      ${cmpRow("Пропускает за матч (модель)", ph.mga, pa.mga, (x) => num(x, 2), true)}
      ${cmpRow(cup ? "xG за матч (10 последних игр)" : "xG за матч (10 игр лиги)", ph.xgf, pa.xgf, (x) => num(x, 2))}
      ${cmpRow("xG соперников за матч", ph.xga, pa.xga, (x) => num(x, 2), true)}
      ${cmpRow("Форма: % очков (6 игр)", ph.form, pa.form, (x) => (x == null ? "—" : Math.round(x) + "%"))}
      ${cmpRow("Очки за матч: хозяева дома / гости в гостях", ph.home_ppg, pa.away_ppg, (x) => num(x, 2))}
      </div></div>
      <p class="muted small">${cup ? `Радар — профиль команд, а не вероятность. «Атака» и «Оборона» — место по силам модели среди участников
      еврокубков сезона в единой шкале (100 — лучшая); «Забивает / Пропускает» — против среднего участника еврокубков на нейтральном поле.
      xG, «Форма» (доля очков в 6 последних матчах) и очки дома / в гостях — по последним матчам всех турниров; оси «xG-баланс» и «Дом / выезд»
      сравнивают только эти две команды. Вероятности исхода выше считает только модель.`
      : `Радар — профиль команд, а не вероятность: оси показывают место команды в своей лиге (100 — лучшая).
      «Атака» и «Оборона» — силы модели против среднего соперника на нейтральном поле; «Форма» — доля набранных очков
      в последних 6 матчах всех турниров. Вероятности исхода выше считает только модель.`}</p></section>`;
  }

  h += `<div class="grid2"><div><h2>Последние матчи</h2><section class="card pad">
      <p><b>${esc(m.home)}</b></p>${formStrip(m.form && m.form[0])}
      <p style="margin-top:14px"><b>${esc(m.away)}</b></p>${formStrip(m.form && m.form[1])}
      <p class="muted small" style="margin-top:12px">Слева направо — от последнего. Наведите курсор, чтобы увидеть соперника и счёт.</p>
    </section></div><div><h2>Личные встречи</h2><section class="card pad">`;
  if (m.h2h && m.h2h.length) {
    h += `<table class="kv">${m.h2h.map((x) => `<tr><td>${esc(x.date)}</td><td class="tl" style="text-align:left">${esc(x.home)} — ${esc(x.away)}</td><td><b>${x.gh}:${x.ga}</b></td></tr>`).join("")}</table>`;
  } else h += `<p class="muted">Официальных встреч в данных нет.</p>`;
  h += `</section></div></div>`;
  app.innerHTML = h;
  stMatchMount(m);
}

function renderLeagues() {
  setNav("leagues");
  const cups = (S.index.leagues || []).filter((l) => l.cup);
  const ls = (S.index.leagues || []).filter((l) => !l.cup);
  const byCountry = {};
  ls.forEach((l) => { (byCountry[l.country] = byCountry[l.country] || []).push(l); });
  const countries = Object.keys(byCountry).sort((a, b) => a.localeCompare(b, "ru"));
  const item = (l) => `<a class="lg-item" href="#/league/${encodeURIComponent(l.key)}">
     <span>${esc(l.name)}${l.tier > 1 ? ` <span class="muted small">· ${l.tier}-й уровень</span>` : ""}</span>
     <span class="muted small">${l.ok ? (l.n_up ? `${l.n_up} матч.` : "перерыв") : "нет данных"}</span></a>`;
  const cupsH = cups.length ? `<div class="cups-strip">${cups.map((l) => `<a class="cup-pill cup-c-${esc(l.key)}" href="#/league/${encodeURIComponent(l.key)}">
      <span class="cup-badge">${esc(l.short || "")}</span><span><b>${esc(l.name)}</b><span class="muted small">${esc(l.stage || "еврокубок")}</span></span></a>`).join("")}</div>` : "";
  app.innerHTML = `<h1>Лиги</h1>${cupsH}<p class="muted small">${ls.length} лиг в ${countries.length} странах. На сайте только лиги,
    где данных достаточно для корректного прогноза — отбор описан в разделе «Методика».</p>
    <div class="leagues-grid">${countries.map((c) => `<section class="card lg-card"><div class="nm">${esc(c)}</div>${byCountry[c]
      .slice().sort((a, b) => a.tier - b.tier).map(item).join("")}</section>`).join("")}</div>`;
}
const ZONE_NAME = { top: "сразу в 1/8 финала", po: "стыковой раунд плей-офф", out: "выбывают" };
const teamFrom = (tc, tid) => (tc && tc[String(tid)] ? tc[String(tid)] : null);
const cupTeamLink = (tc, tid, name) => {
  const x = teamFrom(tc, tid);
  return x && x[1] ? `<a href="${teamHref(x[1], tid)}">${esc(name)}</a>` : esc(name);
};
const ctryTag = (tc, tid) => { const x = teamFrom(tc, tid); return x && x[0] ? `<span class="ctry">${esc(x[0])}</span>` : ""; };

function advBar(pa, pb, na, nb) {
  const a = Math.max(0, Math.min(1, pa)), b = Math.max(0, Math.min(1, pb));
  return `<div class="advbar" role="img" aria-label="${esc(na)} ${pct(a)}, ${esc(nb)} ${pct(b)}">
    <span class="h" style="width:${(a * 100).toFixed(1)}%">${a >= 0.12 ? pct(a) : ""}</span><span class="a" style="width:${(b * 100).toFixed(1)}%">${b >= 0.12 ? pct(b) : ""}</span></div>`;
}

function cupGateNote(L) {
  if (L.gate && L.gate.ok) return "";
  return `<p class="notice">${L.gate && L.gate.checked
    ? "Прогнозы этого турнира сейчас не публикуются: модель не прошла проверку точности на отложенных матчах (правило — в разделе «Методика»)."
    : "Прогнозы этого турнира появятся после первой проверки точности модели на отложенных матчах."}</p>`;
}

function tableSection(L) {
  const T = L.table;
  if (!T || !T.rows || !T.rows.length) return "";
  const z = T.zones || [8, 24];
  const hasM = T.rows.some((r) => r.mgd != null);
  return `<h2>Таблица общего этапа</h2>
    <p class="muted small">36 команд в одной таблице, у каждой ${T.n_lp} ${plural(T.n_lp, ["матч", "матча", "матчей"])} с разными соперниками.
    Места 1–${z[0]} — <span class="zn top">сразу в 1/8 финала</span>, ${z[0] + 1}–${z[1]} — <span class="zn po">стыковой раунд плей-офф</span>,
    ${z[1] + 1}–36 — <span class="zn out">выбывают</span>. Сыграно матчей: ${T.played} из ${T.total}.</p>
    <section class="card tbl-wrap"><table class="tbl cup-tbl"><thead><tr><th>#</th><th class="tl">Команда</th>
    <th>И</th><th>В</th><th>Н</th><th>П</th><th>Мячи</th><th>О</th>
    ${hasM ? `<th title="Ожидаемые голы за матч против среднего участника еврокубков на нейтральном поле">Забьёт</th><th title="Ожидаемый пропуск за матч">Пропустит</th><th title="Сила в голах за матч — единая шкала для команд всех лиг">Сила</th>` : ""}</tr></thead><tbody>
    ${T.rows.map((r) => `<tr class="zr-${r.zone}"><td><span class="zpos zp-${r.zone}" title="${ZONE_NAME[r.zone] || ""}">${r.pos ?? ""}</span></td>
      <td class="tl">${cupTeamLink(L.tc, r.team_id, r.team)}${r.c ? `<span class="ctry">${esc(r.c)}</span>` : ""}</td>
      <td>${r.p ?? ""}</td><td>${r.w ?? ""}</td><td>${r.d ?? ""}</td><td>${r.l ?? ""}</td><td>${r.gf ?? ""}:${r.ga ?? ""}</td><td><b>${r.pts ?? ""}</b></td>
      ${hasM ? (r.mgd != null ? `<td>${num(r.mgf, 2)}</td><td>${num(r.mga, 2)}</td><td class="${r.mgd >= 0 ? "good" : "bad"}">${sgn(r.mgd, 2)}</td>` : `<td colspan="3" class="muted">—</td>`) : ""}</tr>`).join("")}
    </tbody></table></section>
    <p class="muted small">При равенстве очков регламент учитывает разницу мячей, забитые, выездные голы, победы и силу соперников.
    «Забьёт / Пропустит / Сила» — оценки модели в единой шкале для команд всех лиг (против среднего участника еврокубков на нейтральном поле);
    порядок по силе может отличаться от таблицы: в ней учтены только матчи общего этапа, а в силе — все матчи команды и сила её соперников.</p>`;
}

function tiesSection(L) {
  const T = (L.ties || []).filter((t) => t.ph !== "qual" || t.legs.some((x) => !x.s));
  const Q = (L.ties || []).filter((t) => t.ph === "qual" && !t.legs.some((x) => !x.s));
  if (!T.length && !Q.length) return "";
  const row = (t) => {
    const legs = t.legs.map((x) => {
      const homeA = x.h === t.a;
      const sc = x.s ? (homeA ? `${x.s[0]}:${x.s[1]}` : `${x.s[1]}:${x.s[0]}`) : "—";
      const lab = t.final ? "финал" : t.legs.length === 1 || x === t.legs[0] ? "1-й" : "2-й";
      const link = x.pg ? `<a href="#/match/${encodeURIComponent(L.key)}/${x.id}">${esc(fmtDate(x.ko))}</a>` : esc(fmtDate(x.ko));
      return `<span class="tie-leg" title="${homeA ? "дома у " + esc(t.an) : "дома у " + esc(t.bn)}">${t.final ? "" : lab + " · "}${link} · <b>${sc}</b></span>`;
    }).join("");
    const winA = t.win === t.a, winB = t.win === t.b;
    let res = "";
    if (t.win != null) res = `<span class="tie-res">прошла <b>${esc(winA ? t.an : t.bn)}</b></span>`;
    else if (t.pen) res = `<span class="tie-res muted">ничья по сумме — дальше решили дополнительное время или пенальти</span>`;
    const adv = t.adv && t.win == null && !t.pen ? `<div class="tie-adv">${advBar(t.adv[0], t.adv[1], t.an, t.bn)}
      <div class="tie-advl"><span>${esc(t.an)} ${pct(t.adv[0])}</span><span class="muted small">${t.final ? "шансы на трофей" : "шансы пройти дальше"}</span><span>${pct(t.adv[1])} ${esc(t.bn)}</span></div></div>` : "";
    return `<div class="tie${t.final ? " tie-final" : ""}">
      <div class="tie-t"><span class="${winA ? "tie-w" : ""}">${cupTeamLink(L.tc, t.a, t.an)}</span>
        <b class="tie-agg">${t.agg ? `${t.agg[0]} : ${t.agg[1]}` : "— : —"}</b>
        <span class="${winB ? "tie-w" : ""}">${cupTeamLink(L.tc, t.b, t.bn)}</span></div>
      <div class="tie-legs">${legs}${res}</div>${adv}</div>`;
  };
  const byPh = (ph) => T.filter((t) => t.ph === ph);
  let h = "";
  for (const [ph, title] of [["final", "Финал"], ["ko", "Плей-офф"], ["qual", "Квалификация"]]) {
    const xs = byPh(ph);
    if (xs.length) h += `<h2>${title}</h2><section class="card pad ties">${xs.map(row).join("")}</section>`;
  }
  if (Q.length) {
    h += `<details class="card simall"><summary>Сыгранные пары квалификации — ${Q.length}</summary><div class="pad ties">${Q.map(row).join("")}</div></details>`;
  }
  return h + `<p class="muted small">Счёт пары — сумма двух матчей (основное время). Если по сумме ничья, в ответном матче играют
    дополнительное время, затем серию пенальти; правило выездного гола отменено. Шансы пройти дальше учитывают уже сыгранный матч,
    силу команд, поле ответного матча, дополнительное время и пенальти (50 на 50).</p>`;
}

function powerSection(L) {
  const P = L.power || [];
  if (!P.length) return "";
  const top = P.slice(0, 40);
  const mx = Math.max.apply(null, top.map((r) => Math.abs(r.mgd))) || 1;
  return `<h2>Сила участников — единая шкала</h2>
    <section class="card tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th class="tl">Команда</th><th>Забьёт</th><th>Пропустит</th><th class="tl">Сила</th></tr></thead><tbody>
    ${top.map((r, i) => `<tr><td>${i + 1}</td><td class="tl">${cupTeamLink(L.tc, r.team_id, r.team)}${r.c ? `<span class="ctry">${esc(r.c)}</span>` : ""}</td>
      <td>${num(r.mgf, 2)}</td><td>${num(r.mga, 2)}</td>
      <td class="tl pw"><span class="pwbar"><i class="${r.mgd >= 0 ? "p" : "n"}" style="width:${(50 * Math.abs(r.mgd) / mx).toFixed(1)}%"></i></span><b class="${r.mgd >= 0 ? "good" : "bad"}">${sgn(r.mgd, 2)}</b></td></tr>`).join("")}
    </tbody></table></section>
    <p class="muted small">Участники сезона${P.length > top.length ? ` (первые ${top.length} из ${P.length})` : ""}: ожидаемые голы за матч против среднего
    участника еврокубков на нейтральном поле. Шкала общая для всех лиг: её строят матчи национальных чемпионатов вместе с матчами
    еврокубков, поэтому сравнивать можно команды из разных стран.</p>`;
}

function cupAccSection(L) {
  const a = L.acc;
  if (!a || !a.n) return "";
  const g = a.ll_base - a.ll;
  return `<h2>Точность на этом турнире</h2><div class="grid3">
    <div class="card stat"><div class="v">${a.n}</div><div class="k">матчей в проверке (с 1 июля 2025 года)</div></div>
    <div class="card stat"><div class="v">${num(a.ll, 3)}</div><div class="k">логлосс модели (частоты исходов: ${num(a.ll_base, 3)})</div></div>
    <div class="card stat"><div class="v">${a.picks && a.picks.all && a.picks.all.n ? pct(a.picks.all.rate, 1) : pct(a.acc, 1)}</div>
      <div class="k">${a.picks && a.picks.all && a.picks.all.n ? "прогноз со страховкой сыграл" : "исход угадан"}</div></div></div>
    <p class="muted small">Модель каждую неделю подгонялась только по матчам до этой недели; параметры подобраны на сезонах 2023/24–2024/25.
    Выигрыш у частот: ${sgn(g, 3)}${a.adv && a.adv.all ? `; шансы пройти дальше — Брайер ${num(a.adv.all.brier, 3)} (у «50 на 50» — 0,250) на ${a.adv.all.n} противостояниях` : ""}.
    Подробнее — в разделе «<a href="#/accuracy">Точность</a>».</p>`;
}

function renderCup(L) {
  const ms = (S.index.matches || []).filter((m) => m.lg === L.key);
  const up = ms.filter((m) => m.st === "pending");
  const past = ms.filter((m) => m.st !== "pending").reverse();
  let h = `<div class="crumbs"><a href="#/cups">Еврокубки</a></div>
    <div class="cup-hero cup-h-${esc(L.key)}"><div class="cup-badge">${esc(L.short || "")}</div><div>
      <h1>${esc(L.name)}</h1><div class="cup-sub">${esc(L.season ? "Сезон " + L.season : "")}${L.stage ? " · " + esc(L.stage) : ""}</div></div></div>${notices()}${cupGateNote(L)}`;
  if (up.length) h += `<h2>Ближайшие матчи</h2><section class="card block">${up.map(matchRow).join("")}</section>`;
  if (L.nopred && L.nopred.length) {
    h += `<h2>Без прогноза</h2><section class="card pad"><table class="kv">${L.nopred.map((x) => `<tr><td>${esc(fmtDateTime(x.ko))}</td>
      <td class="tl" style="text-align:left">${esc(x.h)} — ${esc(x.a)}</td><td class="muted small">${x.why === "gate" ? "турнир не прошёл проверку"
        : `мало данных${x.who ? " о команде «" + esc(x.who) + "»" : ""}`}</td></tr>`).join("")}</table>
      <p class="muted small">Прогноз даётся, только если о каждой команде достаточно данных: не меньше 10 матчей за последние 400 дней
      и известна её лига. Иначе прогноз был бы гаданием — его нет.</p></section>`;
  }
  if (past.length) h += `<h2>Недавние результаты</h2><section class="card block">${past.map(matchRow).join("")}</section>`;
  h += tiesSection(L);
  h += tableSection(L);
  h += powerSection(L);
  h += cupAccSection(L);
  if (L.fit) {
    h += `<p class="muted small">Модель сейчас: ${L.fit.n.toLocaleString("ru-RU")} матчей (из них еврокубков ${L.fit.n_cup.toLocaleString("ru-RU")}),
      ${L.fit.teams.toLocaleString("ru-RU")} команд из ${L.fit.leagues} лиг · домашнее преимущество в еврокубках ×${num(L.fit.home_mult, 3)} к голам · ρ ${num(L.fit.rho, 3)}.
      Как устроен прогноз еврокубков — в разделе «<a href="#/method">Методика</a>».</p>`;
  }
  app.innerHTML = h;
}

async function renderCups() {
  setNav("cups");
  const cups = (S.index.leagues || []).filter((l) => l.cup);
  if (!cups.length) {
    app.innerHTML = `<h1>Еврокубки</h1><p class="card pad">Еврокубки сейчас не показываются.</p>`;
    return;
  }
  const Ls = await Promise.all(cups.map((l) => ensureLeague(l.key).catch(() => null)));
  const now = new Date();
  const up = (S.index.matches || []).filter((m) => isCup(m.lg) && m.st === "pending" && new Date(m.ko) > now);
  let h = `<h1>Еврокубки</h1>${notices()}
    <p class="muted">Лига чемпионов, Лига Европы и Лига конференций. Команды из разных стран сравниваются в единой шкале сил:
    её строят матчи национальных чемпионатов вместе с матчами самих еврокубков. Для плей-офф и квалификации — шансы пройти дальше
    с учётом первого матча, дополнительного времени и пенальти; финал — на нейтральном поле.</p>
    <div class="cups-grid">${cups.map((l, i) => {
      const L = Ls[i];
      const fav = L && L.power ? L.power.slice(0, 3) : [];
      const n = up.filter((m) => m.lg === l.key).length;
      return `<a class="card cup-card cup-c-${esc(l.key)}" href="#/league/${encodeURIComponent(l.key)}">
        <div class="cup-card-top"><span class="cup-badge">${esc(l.short || "")}</span><span>
          <b>${esc(l.name)}</b><span class="muted small">${esc(L && L.season ? "Сезон " + L.season : "")}</span></span></div>
        <div class="cup-card-body"><div class="small">${esc(l.stage || "")}</div>
          <div class="small">${n ? `${n} ${plural(n, ["матч", "матча", "матчей"])} впереди` : "ближайших матчей нет"}</div>
          ${fav.length ? `<div class="cup-fav"><span class="muted small">Сильнейшие по модели:</span>${fav.map((r) => `<span>${esc(r.team)} <b>${sgn(r.mgd, 2)}</b></span>`).join("")}</div>` : ""}
          ${l.ok ? "" : `<div class="small warn">прогнозы не публикуются</div>`}</div>
        <div class="cup-card-go">Таблица, пары, прогнозы →</div></a>`;
    }).join("")}</div>`;
  if (up.length) {
    const groups = {};
    up.sort((a, b) => (a.ko < b.ko ? -1 : a.ko > b.ko ? 1 : 0)).forEach((m) => { const d = dayKey(new Date(m.ko)); (groups[d] = groups[d] || []).push(m); });
    h += `<h2>Ближайшие матчи</h2>`;
    Object.keys(groups).sort().forEach((d) => {
      h += `<section class="card block"><div class="lg-head">${esc(dayLabel(d))}<span class="muted small">· ${groups[d].length}</span></div>
        ${cups.map((l) => { const xs = groups[d].filter((m) => m.lg === l.key); return xs.length ? `<div class="sub-head">${cupTag(l.key)} ${esc(l.name)}</div>${xs.map(matchRow).join("")}` : ""; }).join("")}</section>`;
    });
  } else {
    h += `<p class="card pad">В ближайшие дни матчей еврокубков нет — расписание появляется за несколько дней до тура.</p>`;
  }
  const ea = S.index.euro_acc;
  if (ea && ea.n) {
    h += `<h2>Точность на еврокубках</h2><div class="grid3">
      <div class="card stat"><div class="v">${ea.n.toLocaleString("ru-RU")}</div><div class="k">матчей в проверке (с 1 июля 2025 года)</div></div>
      <div class="card stat"><div class="v">${num(ea.ll, 3)}</div><div class="k">логлосс модели (частоты исходов: ${num(ea.ll_base, 3)})</div></div>
      <div class="card stat"><div class="v">${ea.adv && ea.adv.all ? num(ea.adv.all.brier, 3) : pct(ea.acc, 1)}</div>
        <div class="k">${ea.adv && ea.adv.all ? `Брайер шансов пройти дальше (у «50 на 50» — 0,250; ${ea.adv.all.n} пар)` : "исход угадан"}</div></div></div>
      <p class="muted small">Проверка на матчах, которые при подборе параметров не использовались. Подробнее — «<a href="#/accuracy">Точность</a>».</p>`;
  }
  app.innerHTML = h;
}

async function renderLeague(key) {
  setNav("leagues");
  const L = await ensureLeague(key);
  if (L.cup) { setNav("cups"); renderCup(L); return; }
  const ms = (S.index.matches || []).filter((m) => m.lg === key);
  const up = ms.filter((m) => m.st === "pending");
  const past = ms.filter((m) => m.st !== "pending").reverse();
  let h = `<div class="crumbs"><a href="#/leagues">Лиги</a></div><h1>${esc(L.name)} <span class="muted" style="font-weight:400">· ${esc(L.country)}</span></h1>${notices()}`;
  if (L.fit) {
    h += `<p class="muted small">Сезон ${esc(L.fit.season || "—")} · модель подогнана по ${L.fit.n} матчам (весомых ${L.fit.eff}) ·
      домашнее преимущество ×${num(L.fit.home_mult, 3)} к голам · ρ ${num(L.fit.rho, 3)}</p>`;
  }
  if (up.length) h += `<h2>Ближайшие матчи</h2><section class="card block">${up.map(matchRow).join("")}</section>`;
  if (past.length) h += `<h2>Недавние результаты</h2><section class="card block">${past.map(matchRow).join("")}</section>`;
  const T = L.table || [];
  if (T.length) {
    const hasStd = T[0].pos != null;
    h += `<h2>Таблица и силы команд</h2><section class="card tbl-wrap"><table class="tbl"><thead><tr>
      ${hasStd ? "<th>#</th>" : ""}<th class="tl">Команда</th>${hasStd ? "<th>И</th><th>В</th><th>Н</th><th>П</th><th>Мячи</th><th>О</th>" : ""}
      <th title="Ожидаемые голы за матч против среднего соперника лиги на нейтральном поле">Забьёт</th><th title="Ожидаемый пропуск за матч">Пропустит</th>
      <th title="Разница: сила команды в голах за матч">Сила</th><th title="Средний xG за и против в 10 последних матчах лиги">xG ±</th></tr></thead><tbody>
      ${T.map((r) => `<tr>${hasStd ? `<td>${r.pos ?? ""}</td>` : ""}<td class="tl">${teamLink(L.key, r.team_id, r.team)}</td>
        ${hasStd ? `<td>${r.p ?? ""}</td><td>${r.w ?? ""}</td><td>${r.d ?? ""}</td><td>${r.l ?? ""}</td><td>${r.gf ?? ""}:${r.ga ?? ""}</td><td><b>${r.pts ?? ""}</b></td>` : ""}
        <td>${num(r.mgf, 2)}</td><td>${num(r.mga, 2)}</td>
        <td class="${(r.mgd ?? 0) >= 0 ? "good" : "bad"}">${sgn(r.mgd, 2)}</td><td>${r.xgf != null ? num(r.xgf, 2) + " / " + num(r.xga, 2) : "—"}</td></tr>`).join("")}
      </tbody></table></section>
      <p class="muted small">${hasStd ? `Таблица${L.table_ts ? " на " + esc(fmtDateTime(L.table_ts)) : ""}.`
        : "Турнирной таблицы для этой лиги нет — здесь команды текущего сезона, упорядоченные по силе модели."}
      «Забьёт / Пропустит / Сила» — оценки модели в голах за матч против среднего соперника лиги на нейтральном поле; они учитывают силу соперников и свежесть матчей${hasStd ? ", поэтому порядок может отличаться от таблицы" : ""}.</p>`;
  }
  h += leagueStatsSection(L);
  h += simSection(L.sim, L.key);
  app.innerHTML = h;
  ltsMount(L);
}

function plural(n, f) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return f[2];
  if (b === 1) return f[0];
  if (b >= 2 && b <= 4) return f[1];
  return f[2];
}
const teamHref = (lg, tid) => `#/team/${encodeURIComponent(lg)}/${encodeURIComponent(tid)}`;
const teamLink = (lg, tid, name) => (tid == null ? esc(name) : `<a href="${teamHref(lg, tid)}">${esc(name)}</a>`);

async function ensureTeams(key) {
  if (!S.teams) S.teams = {};
  if (!S.teams[key]) S.teams[key] = await loadJSON(`data/team/${encodeURIComponent(key)}.json`);
  return S.teams[key];
}

function strengthChart(pts) {
  if (!pts || pts.length < 2) return `<p class="muted small">Пока мало недель для графика.</p>`;
  const W = 760, H = 230, pl = 46, pr = 14, pt = 14, pb = 30;
  const ys = pts.map((s) => s[1] - s[2]);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = Math.max(0.12, (hi - lo) * 0.2);
  lo -= pad; hi += pad;
  const span = hi - lo;
  const step = span > 2.4 ? 0.5 : span > 1.2 ? 0.25 : 0.1;
  const x = (i) => pl + (W - pl - pr) * (i / (pts.length - 1));
  const y = (v) => pt + (H - pt - pb) * (hi - v) / span;
  const lab = (d) => (d === "now" ? "сейчас" : fmtDate(d + "T12:00:00Z"));
  let g = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    const vv = Math.round(v * 100) / 100;
    g += `<line x1="${pl}" x2="${W - pr}" y1="${y(vv).toFixed(1)}" y2="${y(vv).toFixed(1)}" stroke="var(--line)" ${vv === 0 ? 'stroke-width="1.6"' : ""}/>
      <text x="${pl - 6}" y="${(y(vv) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)">${sgn(vv, step < 0.25 ? 1 : 2)}</text>`;
  }
  const idx = [...new Set([0, Math.floor((pts.length - 1) / 2), pts.length - 1])];
  idx.forEach((i) => { g += `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}" font-size="11" fill="var(--muted)">${lab(pts[i][0])}</text>`; });
  const path = pts.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(ys[i]).toFixed(1)}`).join(" ");
  const dots = pts.map((s, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(ys[i]).toFixed(1)}" r="${i === pts.length - 1 ? 4.5 : 3}" fill="var(--accent)">
    <title>${lab(s[0])}: сила ${sgn(ys[i], 2)} (забьёт ${num(s[1], 2)}, пропустит ${num(s[2], 2)})</title></circle>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Сила команды по неделям">${g}
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round"/>${dots}</svg>`;
}

function probCells(p, s) {
  if (!p) return `<td colspan="3" class="muted">—</td>`;
  const o = s[0] > s[1] ? 0 : s[0] === s[1] ? 1 : 2;
  return p.map((x, i) => `<td class="${i === o ? "hit" : ""}">${pct(x)}</td>`).join("");
}

async function renderTeam(key, tid) {
  setNav("leagues");
  const [L, TD] = await Promise.all([ensureLeague(key), ensureTeams(key)]);
  const T = (TD.teams || {})[String(tid)];
  const row = (L.table || []).find((r) => String(r.team_id) === String(tid));
  const name = (T && T.name) || (row && row.team) || "Команда";
  let h = `<div class="crumbs"><a href="#/leagues">Лиги</a> · <a href="#/league/${encodeURIComponent(L.key)}">${esc(L.country)} · ${esc(L.name)}</a></div>
    <h1>${esc(name)}</h1>${notices()}`;
  if (row && row.pos != null) {
    h += `<p class="muted">${row.pos}-е место · ${row.pts} ${plural(row.pts, ["очко", "очка", "очков"])} · ${row.p} ${plural(row.p, ["матч", "матча", "матчей"])}:
      ${row.w} ${plural(row.w, ["победа", "победы", "побед"])}, ${row.d} ${plural(row.d, ["ничья", "ничьи", "ничьих"])},
      ${row.l} ${plural(row.l, ["поражение", "поражения", "поражений"])} · мячи ${row.gf}:${row.ga}</p>`;
  }
  if (!T) {
    app.innerHTML = h + `<p class="muted">В текущем сезоне у команды ещё нет сыгранных матчей лиги.</p>`;
    return;
  }
  const sim = L.sim && L.sim.status === "ok" ? (L.sim.teams || []).find((r) => String(r.team_id) === String(tid)) : null;
  const cur = T.strength && T.strength.length ? T.strength[T.strength.length - 1] : null;
  h += `<h2>Сила по ходу сезона</h2><section class="card pad">${strengthChart(T.strength)}
    ${cur ? `<p class="small">Сейчас: забьёт <b>${num(cur[1], 2)}</b>, пропустит <b>${num(cur[2], 2)}</b> за матч против среднего соперника лиги на нейтральном поле — сила <b class="${cur[1] - cur[2] >= 0 ? "good" : "bad"}">${sgn(cur[1] - cur[2], 2)}</b>.</p>` : ""}
    <p class="muted small">Сила — ожидаемая разница мячей за матч против среднего соперника лиги на нейтральном поле (0 — средняя команда).
    Точка — оценка модели на понедельник этой недели только по матчам до него; последняя — сейчас. Наведите курсор на точку, чтобы увидеть числа.</p></section>
    <div class="grid2"><div>`;
  if (sim) {
    h += `<h2>Симуляция сезона</h2><section class="card pad"><table class="kv">
      <tr><td class="tl" style="text-align:left">Очки в конце сезона</td><td><b>${num(sim.xpts, 1)}</b> <span class="muted small">(80 % прогонов: ${sim.q[0]}–${sim.q[1]})</span></td></tr>
      <tr><td class="tl" style="text-align:left">1-е место</td><td>${simPct(sim.p1)}</td></tr>
      <tr><td class="tl" style="text-align:left">Места 1–${L.sim.top_k}</td><td>${simPct(sim.ptop)}</td></tr>
      <tr><td class="tl" style="text-align:left">Последние ${L.sim.bottom_k}</td><td>${simPct(sim.pbot)}</td></tr></table>
      <p class="muted small">Подробнее — на <a href="#/league/${encodeURIComponent(L.key)}">странице лиги</a>.</p></section>`;
  }
  h += `</div><div>`;
  if (T.upcoming && T.upcoming.length) {
    h += `<h2>Ближайшие матчи</h2><section class="card pad"><table class="kv"><tr><th class="tl" style="text-align:left">Матч</th><th>Победа</th><th>Ничья</th><th>Поражение</th></tr>
      ${T.upcoming.map((u) => `<tr><td class="tl" style="text-align:left"><a href="#/match/${encodeURIComponent(L.key)}/${u.id}">${esc(fmtDateTime(u.ko))} · ${u.v === "Д" ? "дома" : "в гостях"} — ${esc(u.o)}</a></td>
        ${u.p ? u.p.map((x) => `<td>${pct(x)}</td>`).join("") : `<td colspan="3">—</td>`}</tr>`).join("")}</table></section>`;
  }
  h += `</div></div>`;
  h += teamStatsSection(L, tid);
  const A = T.acc || {};
  h += `<h2>Матчи сезона ${esc(TD.season || "")}</h2>`;
  if (A.n) {
    h += `<p class="small">Прогноз со страховкой сыграл в <b>${A.pk_hit ?? "—"}</b> из ${A.pk_n ?? "—"} ${plural(A.pk_n || 0, ["матча", "матчей", "матчей"])} команды;
      самый вероятный исход сбылся в ${A.hit} из ${A.n}; фактическому исходу модель в среднем давала <b>${pct(A.p_act)}</b>.</p>`;
  }
  h += `<section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Дата</th><th class="tl">Соперник</th><th>Счёт</th><th title="xG команды и соперника">xG</th>
    <th title="Вероятности до матча с точки зрения команды">Победа</th><th>Ничья</th><th>Пораж.</th>
    <th title="Прогноз матча со страховкой: 1 — хозяева, 2 — гости этого матча">Прогноз</th><th title="● — живой прогноз сайта до свистка; ○ — ретро-прогноз"></th></tr></thead><tbody>
    ${T.matches.map((r) => {
      const res = r.s[0] > r.s[1] ? "good" : r.s[0] < r.s[1] ? "bad" : "";
      return `<tr><td class="tl">${esc(fmtDate(r.d + "T12:00:00Z"))}</td><td class="tl">${r.v === "Д" ? "" : "@ "}${teamLink(L.key, r.oid, r.o)}</td>
        <td class="${res}"><b>${r.s[0]}:${r.s[1]}</b></td><td>${r.x ? num(r.x[0], 1) + ":" + num(r.x[1], 1) : "—"}</td>
        ${probCells(r.p, r.s)}<td class="${r.pk ? (r.pk.h ? "good" : "bad") : ""}">${r.pk ? `${r.pk.h ? "✓" : "✗"} ${pickTag(r.pk, false)}` : "—"}</td>
        <td title="${r.src === "live" ? "живой прогноз до свистка" : r.src === "retro" ? "ретро-прогноз" : ""}">${r.src === "live" ? "●" : r.src === "retro" ? "○" : ""}</td></tr>`;
    }).join("")}</tbody></table></section>
    <p class="muted small">«@» — матч в гостях. Выделена вероятность, которую модель давала тому, что случилось.
    «Прогноз» записан как для протокола матча: 1 — хозяева, 2 — гости этого матча (1X — хозяева не проиграют, X2 — гости не проиграют).
    ● — живой прогноз сайта, сделанный до стартового свистка (журнал ведётся с 20 ноября 2026 года).
    ○ — ретро-прогноз: посчитан позже, но так же, как в проверке точности, — модель подогнана только по матчам до понедельника той недели,
    поэтому результат матча в него не попал. Только матчи лиги текущего сезона.</p>`;
  app.innerHTML = h;
}

function simPct(p) {
  if (p == null || p <= 0) return "—";
  if (p < 0.005) return "&lt;1%";
  if (p >= 0.995) return "&gt;99%";
  return Math.round(p * 100) + "%";
}
function simCell(p, blankZero) {
  const a = p > 0 ? (0.05 + 0.75 * Math.min(1, p)).toFixed(3) : 0;
  const txt = blankZero && !(p > 0) ? "" : simPct(p);
  return `<td class="simc" style="background:rgba(var(--heat),${a})">${txt}</td>`;
}
function simSection(sim, lgKey) {
  if (!sim) return "";
  const head = `<h2>Симуляция сезона</h2>`;
  if (sim.status === "finished") {
    return head + `<p class="muted small">Регулярный чемпионат сезона ${esc(sim.season || "")} сыгран полностью — итог в таблице выше.</p>`;
  }
  if (sim.status !== "ok" || !sim.teams) {
    return head + `<p class="muted small">Сейчас не считается: ${esc(sim.reason || "данные не прошли сверку")}.
      Симуляция появится, когда собранные матчи снова сойдутся с официальной таблицей.</p>`;
  }
  const tk = sim.top_k, bk = sim.bottom_k, n = sim.n_teams, T = sim.teams;
  const runs = Number(sim.n_sims).toLocaleString("ru-RU");
  let h = head + `<p class="muted small">Сезон ${esc(sim.season || "")}: осталось сыграть матчей — ${sim.remaining}.
    Остаток сезона разыгран ${runs} раз; ниже — в какой доле прогонов команда закончила сезон на этих местах.</p>
    <section class="card tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th class="tl">Команда</th><th>О</th>
    <th title="Среднее число очков в конце сезона; мелко — 80 % прогонов лежат в этом интервале">Очки в конце</th>
    <th>1-е место</th><th>Места 1–${tk}</th><th>Последние ${bk}</th></tr></thead><tbody>
    ${T.map((r) => `<tr><td>${r.pos ?? ""}</td><td class="tl">${teamLink(lgKey, r.team_id, r.team)}${r.ded ? ` <span class="bad small" title="Снятые очки">(${r.ded})</span>` : ""}</td>
      <td>${r.pts}</td><td><b>${num(r.xpts, 1)}</b> <span class="muted small simq">${r.q[0]}–${r.q[1]}</span></td>
      ${simCell(r.p1)}${simCell(r.ptop)}${simCell(r.pbot)}</tr>`).join("")}
    </tbody></table></section>
    <details class="card simall"><summary>Вероятности всех мест</summary><div class="tbl-wrap"><table class="tbl simgrid">
    <thead><tr><th class="tl">Команда</th>${Array.from({ length: n }, (_, i) => `<th>${i + 1}</th>`).join("")}</tr></thead><tbody>
    ${T.map((r) => `<tr><td class="tl">${esc(r.team)}</td>${r.pp.map((p) => simCell(p, true)).join("")}</tr>`).join("")}
    </tbody></table></div></details>
    <p class="muted small">Каждый матч разыгрывается из той же модели, что и прогнозы матчей; учтено, что сила команды за остаток
    сезона может измениться. Места решают очки, затем разница мячей, затем забитые (личные встречи не учитываются).
    Колонки названы по местам: какие места дают еврокубки, повышение или вылет, зависит от регламента лиги и кубков.
    «—» — ни в одном прогоне (это не значит «невозможно»); «&gt;99%» и «&lt;1%» — округление.
    Расчёт на ${esc(fmtDateTime(sim.ts))}. Как метод проверен на прошлых сезонах — в разделе «<a href="#/method">Как это работает</a>».</p>`;
  return h;
}

function calibChart(cal) {
  if (!cal || !cal.length) return "";
  const W = 340, H = 300, P = 40, s = (v) => P + v * (W - 2 * P), t = (v) => H - P - v * (H - 2 * P);
  let g = `<rect x="${P}" y="${P}" width="${W - 2 * P}" height="${H - 2 * P}" fill="none" stroke="var(--line)"/>`;
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
    g += `<text x="${s(v)}" y="${H - P + 16}" font-size="11" text-anchor="middle" fill="var(--muted)">${v * 100}%</text>`;
    g += `<text x="${P - 6}" y="${t(v) + 4}" font-size="11" text-anchor="end" fill="var(--muted)">${v * 100}%</text>`;
  });
  g += `<line x1="${s(0)}" y1="${t(0)}" x2="${s(1)}" y2="${t(1)}" stroke="var(--muted)" stroke-dasharray="4 4"/>`;
  g += `<polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${cal.map((c) => `${s(c.pred)},${t(c.obs)}`).join(" ")}"/>`;
  cal.forEach((c) => {
    g += `<circle cx="${s(c.pred)}" cy="${t(c.obs)}" r="4" fill="var(--accent)"><title>прогноз ${pct(c.pred, 1)} → сбылось ${pct(c.obs, 1)} (n=${c.n})</title></circle>`;
  });
  g += `<text x="${W / 2}" y="${H - 4}" font-size="11" text-anchor="middle" fill="var(--muted)">предсказанная вероятность</text>`;
  return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Калибровка">${g}</svg>`;
}
function picksTable(ps) {
  if (!ps || !ps.all || !ps.all.n) return "";
  const order = ["1X", "X2", "1", "X", "2"];
  const row = (k, name) => {
    const x = ps[k];
    if (!x || !x.n) return "";
    return `<tr><td class="tl">${name}</td><td>${x.n}</td><td>${x.hit}</td><td><b>${pct(x.rate, 1)}</b></td><td>${pct(x.pred, 1)}</td></tr>`;
  };
  return `<section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Прогноз</th><th>Матчей</th><th>Сыграл</th>
    <th>Доля</th><th title="Средняя вероятность прогноза по модели">Модель обещала</th></tr></thead><tbody>
    ${order.map((k) => row(k, `${pickTag({ c: k }, false)} <span class="muted small">${PICK_TITLE[k]}</span>`)).join("")}
    ${row("all", "<b>Все прогнозы</b>")}</tbody></table></section>`;
}

async function renderAccuracy() {
  setNav("accuracy");
  if (!S.acc) S.acc = await loadJSON("data/accuracy.json");
  const A = S.acc, bt = A.backtest;
  let h = `<h1>Точность модели</h1>
    <p class="muted">Главная мера — <b>логлосс</b>: средний −ln вероятности, которую модель дала сбывшемуся исходу.
    Меньше — лучше. Подбрасывание монеты на три исхода даёт ln 3 ≈ 1.099; угадывать «по частотам лиги» — около 1.07–1.08;
    цена букмекера без маржи — около 0.98–1.00.</p>`;
  if (bt) {
    const v = bt.valid.all;
    const vm = v.vs_market && v.vs_market.model;
    const y0 = Number(bt.protocol.tune[0].slice(0, 4)), y1 = Number(bt.protocol.tune[1].slice(0, 4));
    const ss = (y) => `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
    h += `<h2>Проверка на отложенных матчах</h2>
      <p class="muted small">Параметры модели подбирались только на сезонах ${ss(y0)}–${ss(y1 - 1)}.
      Ниже — матчи с ${esc(fmtDate(bt.protocol.valid_from))} ${esc(bt.protocol.valid_from.slice(0, 4))}, которые при подборе не использовались.
      Модель каждую неделю подгонялась только по матчам, сыгранным до этой недели.</p>
      <div class="grid3">
        <div class="card stat"><div class="v">${v.model.n}</div><div class="k">матчей в проверке</div></div>
        <div class="card stat"><div class="v">${num(v.model.logloss, 4)}</div><div class="k">логлосс модели (частоты лиги: ${num(v.baseline.logloss, 4)})</div></div>
        <div class="card stat"><div class="v">${pct(v.model.acc, 1)}</div><div class="k">исход с наибольшей вероятностью сбылся</div></div>
      </div>`;
    if (v.picks && v.picks.all && v.picks.all.n) {
      h += `<h2>Прогнозы со страховкой</h2>
        <p class="muted small">Правило: победа хозяев 58 % и выше — «1X», победа гостей 58 % и выше — «X2», иначе самый вероятный исход.
        На тех же отложенных матчах: как часто каждый вид прогноза сыграл и сколько обещала модель — если модель честна, доли близки.</p>
        ${picksTable(v.picks)}`;
    }
    if (vm) {
      const mk = v.vs_market.market;
      const d = vm.logloss - mk.logloss;
      h += `<section class="card pad" style="margin-top:16px"><b>Против рынка</b> на ${vm.n} матчах, где есть цена конторы:
        модель ${num(vm.logloss, 4)}, рынок без маржи ${num(mk.logloss, 4)} —
        ${Math.abs(d) < 0.003 ? "практически вровень" : d < 0 ? "<span class='good'>модель точнее на " + num(-d, 4) + "</span>" : "<span class='bad'>рынок точнее на " + num(d, 4) + "</span>"}.
        Разница в тысячные логлосса на таком числе матчей статистически мала.</section>`;
    }
    h += `<h2>По лигам</h2><section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Лига</th><th>Матчей</th>
      <th>Логлосс модели</th><th>Частоты лиги</th><th>Выигрыш</th><th>Угадано</th><th>Модель / рынок</th></tr></thead><tbody>
      ${S.index.leagues.map((l) => {
        const x = bt.valid.leagues[l.key];
        if (!x) return "";
        const g = x.baseline.logloss - x.model.logloss;
        const mk = x.vs_market && x.vs_market.model ? `${num(x.vs_market.model.logloss, 3)} / ${num(x.vs_market.market.logloss, 3)} <span class="muted">(${x.vs_market.model.n})</span>` : "—";
        return `<tr><td class="tl">${esc(l.name)} <span class="muted small">${esc(l.country)}</span></td><td>${x.model.n}</td><td>${num(x.model.logloss, 4)}</td>
          <td>${num(x.baseline.logloss, 4)}</td><td class="${g > 0 ? "good" : "bad"}">${sgn(g, 4)}</td><td>${pct(x.model.acc, 1)}</td><td>${mk}</td></tr>`;
      }).join("")}</tbody></table></section>`;
    h += `<div class="grid2"><div><h2>Калибровка</h2><section class="card pad">${calibChart(bt.valid.calibration)}
      <p class="muted small">Если модель говорит «40 %», такие исходы должны сбываться примерно в 40 % случаев. Точки у пунктирной диагонали — модель откалибрована.</p></section></div>
      <div><h2>Параметры модели</h2><section class="card pad"><table class="kv">
      <tr><td>Затухание по времени, ξ</td><td>${bt.params.xi} / день (полвеса за ${Math.round(Math.log(2) / bt.params.xi)} дн.)</td></tr>
      <tr><td>Доля голов в цели (остальное — xG)</td><td>${pct(bt.params.goal_weight)}</td></tr>
      <tr><td>Сжатие к среднему (ridge)</td><td>${bt.params.ridge}</td></tr>
      <tr><td>Поправка новичку лиги</td><td>−${bt.params.newcomer_shift}</td></tr>
      <tr><td>Поправка вылетевшему</td><td>+${bt.params.relegated_shift}</td></tr>
      <tr><td>Растяжение сил при прогнозе</td><td>×${bt.params.spread ?? 1}</td></tr>
      ${bt.params.motivation_k ? `<tr><td>Поправка на турнирную мотивацию, k</td><td>${bt.params.motivation_k}</td></tr>` : ""}
      <tr><td>Окно данных</td><td>${bt.params.window_days} дн.</td></tr></table>
      <p class="muted small">Отчёт бэктеста: ${esc(fmtDateTime(bt.generated))}.</p></section></div></div>`;
  }
  const lv = A.live;
  h += `<h2>Живой журнал</h2><p class="muted small">Каждый прогноз фиксируется в момент последнего обновления до стартового свистка и после свистка
    не меняется. Это настоящая проверка: ни один из этих матчей модель не видела.</p>`;
  if (lv && lv.n) {
    h += `<div class="grid3"><div class="card stat"><div class="v">${lv.n}</div><div class="k">рассчитанных матчей</div></div>
      <div class="card stat"><div class="v">${num(lv.model.logloss, 4)}</div><div class="k">логлосс</div></div>
      <div class="card stat"><div class="v">${lv.picks && lv.picks.all && lv.picks.all.n ? pct(lv.picks.all.rate, 1) : pct(lv.model.acc, 1)}</div>
        <div class="k">${lv.picks && lv.picks.all && lv.picks.all.n ? "прогноз со страховкой сыграл" : "исход угадан"}</div></div></div>`;
    if (lv.picks && lv.picks.all && lv.picks.all.n) h += `<div style="margin-top:12px">${picksTable(lv.picks)}</div>`;
    if (lv.vs_market) h += `<p class="small">На ${lv.vs_market.model.n} матчах с ценой: модель ${num(lv.vs_market.model.logloss, 4)}, рынок ${num(lv.vs_market.market.logloss, 4)}.</p>`;
    h += `<section class="card tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th class="tl">Дата</th><th class="tl">Матч</th><th>П1</th><th>Х</th><th>П2</th><th>Прогноз</th><th>Счёт</th><th></th></tr></thead><tbody>
      ${A.journal.slice(0, 100).map((j) => {
        const ok = j.pk && j.pk.h != null ? j.pk.h : argmax(j.p) === outcome(j.res);
        const lgOn = (S.index.leagues || []).some((l) => l.key === j.lg) && j.pg !== 0;
        const name = `${esc(j.h)} — ${esc(j.a)}`;
        return `<tr><td class="tl">${esc(fmtDate(j.ko))}</td><td class="tl">${lgOn ? `<a href="#/match/${encodeURIComponent(j.lg)}/${j.id}">${name}</a>` : name}</td>
          ${j.p.map((x, i) => `<td${argmax(j.p) === i ? " style='font-weight:700'" : ""}>${pct(x)}</td>`).join("")}
          <td>${pickTag(j.pk, false) || "—"}</td><td><b>${j.res[0]}:${j.res[1]}</b></td><td class="${ok ? "hit" : "miss"}">${ok ? "✓" : "✗"}</td></tr>`;
      }).join("")}</tbody></table></section>`;
  } else {
    h += `<p class="card pad">Журнал только начат: первые рассчитанные матчи появятся после ближайшего тура.</p>`;
  }
  h += euroAccuracySection(A.euro, A.euro_live);
  h += statsAccuracySection(A.stats);
  app.innerHTML = h;
  statsAccuracyMount(A.stats);
}

const PH_TITLE = { qual: "Квалификация", group: "Групповой этап (до 2024/25)", league: "Общий этап", ko: "Плей-офф", final: "Финалы" };
function euroAccuracySection(E, live) {
  if (!E || !E.all) return "";
  const a = E.all;
  const cups = (S.index.leagues || []).filter((l) => l.cup);
  const g = a.ll_base - a.ll;
  let h = `<h2 id="euro">Еврокубки</h2>
    <p class="muted small">Совместная модель лиг и еврокубков (единая шкала сил) проверена тем же способом: параметры подобраны на сезонах
    еврокубков 2023/24–2024/25 (с квалификацией), ниже — матчи с 1 июля 2025 года, которые при подборе не использовались; модель каждую неделю
    подгонялась только по матчам до этой недели. Прогноз даётся, только если о каждой команде достаточно данных
    (так было в ${pct(a.cover, 0)} матчей; остальные — в основном ранняя квалификация с клубами малых лиг).</p>
    <div class="grid3">
      <div class="card stat"><div class="v">${a.n.toLocaleString("ru-RU")}</div><div class="k">матчей еврокубков в проверке</div></div>
      <div class="card stat"><div class="v">${num(a.ll, 4)}</div><div class="k">логлосс модели (частоты исходов еврокубков: ${num(a.ll_base, 4)}; выигрыш ${sgn(g, 3)})</div></div>
      <div class="card stat"><div class="v">${pct(a.acc, 1)}</div><div class="k">исход с наибольшей вероятностью сбылся</div></div>
    </div>`;
  h += `<section class="card tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th class="tl">Турнир / стадия</th><th>Матчей</th>
    <th>Логлосс модели</th><th>Частоты</th><th>Выигрыш</th><th>Угадано</th><th>Калибровка</th></tr></thead><tbody>
    ${cups.map((l) => { const x = E.cups && E.cups[l.key]; if (!x) return ""; const gg = x.ll_base - x.ll;
      return `<tr><td class="tl">${cupTag(l.key)} ${esc(l.name)}</td><td>${x.n}</td><td>${num(x.ll, 4)}</td><td>${num(x.ll_base, 4)}</td>
        <td class="${gg > 0 ? "good" : "bad"}">${sgn(gg, 4)}</td><td>${pct(x.acc, 1)}</td><td>${x.ece != null ? num(x.ece * 100, 1) + " п.п." : "—"}</td></tr>`; }).join("")}
    ${["qual", "league", "ko", "final"].map((ph) => { const x = E.phases && E.phases[ph]; if (!x || !x.n) return ""; const gg = x.ll_base - x.ll;
      return `<tr><td class="tl muted">${PH_TITLE[ph]}</td><td>${x.n}</td><td>${num(x.ll, 4)}</td><td>${num(x.ll_base, 4)}</td>
        <td class="${gg > 0 ? "good" : "bad"}">${sgn(gg, 4)}</td><td>${pct(x.acc, 1)}</td><td>${x.ece != null ? num(x.ece * 100, 1) + " п.п." : "—"}</td></tr>`; }).join("")}
    </tbody></table></section>`;
  if (a.picks && a.picks.all && a.picks.all.n) {
    h += `<h3 style="margin-top:16px">Прогнозы со страховкой на еврокубках</h3>${picksTable(a.picks)}`;
  }
  const ad = a.adv;
  if (ad && ad.all) {
    const r = (k, name) => { const x = ad[k]; return x ? `<tr><td class="tl">${name}</td><td>${x.n}</td><td><b>${num(x.brier, 4)}</b></td><td>0,2500</td>
      <td>${num(x.ll, 4)}</td><td>${num(Math.log(2), 4)}</td><td>${pct(x.acc, 1)}</td></tr>` : ""; };
    h += `<h3 style="margin-top:16px">Шансы пройти дальше</h3>
      <section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Когда считались</th><th>Пар</th><th>Брайер</th><th>«50 на 50»</th>
      <th>Логлосс</th><th>«50 на 50»</th><th>Фаворит прошёл</th></tr></thead><tbody>
      ${r("leg1", "Перед первым матчем")}${r("leg2", "Перед ответным (первый сыгран)")}${r("final", "Перед финалом")}${r("all", "<b>Все</b>")}</tbody></table></section>
      <p class="muted small">Брайер — средний квадрат ошибки вероятности (меньше — лучше). Кто прошёл, если по сумме была ничья, определяется
      по тому, кто играл в турнире дальше; пары, где это неизвестно, в проверку не входят.</p>`;
  }
  if (E.calibration && E.calibration.length) {
    h += `<div class="grid2"><div><h3 style="margin-top:16px">Калибровка (еврокубки)</h3><section class="card pad">${calibChart(E.calibration)}</section></div>
      <div><h3 style="margin-top:16px">Параметры совместной модели</h3><section class="card pad"><table class="kv">
      <tr><td>Затухание по времени, ξ</td><td>${E.params.xi} / день (полвеса за ${Math.round(Math.log(2) / E.params.xi)} дн.)</td></tr>
      <tr><td>Доля голов в цели (остальное — xG)</td><td>${pct(E.params.goal_weight)}</td></tr>
      <tr><td>Сжатие команды к среднему её лиги</td><td>${E.params.ridge}</td></tr>
      <tr><td>Сжатие уровня лиги к общему среднему</td><td>${E.params.ridge_league}</td></tr>
      <tr><td>Растяжение сил при прогнозе</td><td>×${E.params.spread}</td></tr>
      <tr><td>Окно данных</td><td>${E.params.window_days} дн.</td></tr></table>
      <p class="muted small">Отчёт проверки: ${esc(fmtDateTime(E.generated))}.</p></section></div></div>`;
  }
  if (live && live.n) {
    h += `<p class="small">Живой журнал еврокубков: рассчитано ${live.n} ${plural(live.n, ["матч", "матча", "матчей"])}, логлосс ${num(live.model.logloss, 4)}${live.picks && live.picks.all && live.picks.all.n
      ? `, прогноз со страховкой сыграл в ${pct(live.picks.all.rate, 1)}` : ""} (они входят и в общий журнал выше).</p>`;
  }
  if (E.stats) {
    const ks = ST_ORDER.filter((k) => E.stats[k]);
    if (ks.length) {
      h += `<h3 style="margin-top:16px">Статистика матча на еврокубках</h3><section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Показатель</th><th>Матчей</th>
        <th>Ошибка тотала: модель</th><th>средние еврокубков</th><th>Калибровка</th><th>На сайте</th></tr></thead><tbody>
        ${ks.map((k) => { const x = E.stats[k]; return `<tr><td class="tl">${ST_NAME[k]}</td><td>${x.n ?? "—"}</td><td>${num(x.mae_total, 2)}</td><td>${num(x.mae_total_base, 2)}</td>
          <td>${x.calib_err != null ? num(x.calib_err * 100, 1) + " п.п." : "—"}</td><td class="${x.gate && x.gate.ok ? "good" : "bad"}">${x.gate && x.gate.ok ? "да" : "нет"}</td></tr>`; }).join("")}
        </tbody></table></section><p class="muted small">Показатель выводится для еврокубков, только если на отложенных матчах модель точнее простых
        средних еврокубков и вероятности откалиброваны (≤ 3,5 п.п.) — то же правило, что для лиг.</p>`;
    }
  }
  return h;
}

function leagueStatsSection(L) {
  return L.tstat && L.tstat.keys && L.tstat.keys.length ? `<h2>Статистика команд</h2><div id="ltsBox"></div>` : "";
}
function ltsMount(L) {
  const box = document.getElementById("ltsBox");
  if (!box) return;
  const T = L.tstat, st = stState();
  const keys = ST_ORDER.filter((k) => T.keys.includes(k));
  if (!S.lts) S.lts = { col: 0, desc: true };
  const name = {};
  (L.table || []).forEach((r) => { name[String(r.team_id)] = r.team; });
  const render = () => {
    const k = keys.includes(st.stat) ? st.stat : keys[0];
    const rows = Object.entries(T.teams).filter(([, v]) => v[k]).map(([tid, v]) => ({ tid, nm: name[tid] || tid, v: v[k] }));
    const c = S.lts.col;
    const val = (r) => (c < 4 ? r.v[c] : r.v[4]);
    rows.sort((a, b) => ((val(b) ?? -1) - (val(a) ?? -1)) * (S.lts.desc ? 1 : -1) || a.nm.localeCompare(b.nm, "ru"));
    const th = (i, t, tip) => `<th data-ltc="${i}" class="sortable${c === i ? " on" : ""}" title="${esc(tip)}">${t}${c === i ? (S.lts.desc ? " ↓" : " ↑") : ""}</th>`;
    box.innerHTML = `<div class="chips st-pick">${keys.map((x) => chipBtn("ltk", x, x === k, ST_NAME[x])).join("")}</div>
      <section class="card tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th class="tl">Команда</th>
      ${th(0, "Модель: у команды", "Сколько у самой команды за матч против среднего соперника лиги на нейтральном поле")}
      ${th(1, "Модель: у соперников", "Сколько у её соперников за матч")}
      ${th(2, "Сезон: у команды", "Фактическое среднее за матч в текущем сезоне лиги")}${th(3, "Сезон: у соперников", "Фактическое среднее соперников")}
      ${th(4, "Матчей", "Матчей сезона с этой статистикой")}</tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td class="tl">${teamLink(L.key, r.tid, r.nm)}</td><td><b>${num(r.v[0], 1)}</b></td><td>${num(r.v[1], 1)}</td>
        <td>${r.v[2] == null ? "—" : num(r.v[2], 1)}</td><td>${r.v[3] == null ? "—" : num(r.v[3], 1)}</td><td>${r.v[4]}</td></tr>`).join("")}
      </tbody></table></section>
      <p class="muted small">${ST_NAME[k]}: у средней команды лиги за матч — ${num(T.avg[k], 1)}. «У команды» — сколько у неё самой (бьёт, подаёт угловые, фолит,
      получает карточки), «у соперников» — сколько у её соперников в матчах с ней. «Модель» — оценка с поправкой на силу соперников и свежесть матчей
      (против среднего соперника лиги на нейтральном поле); «сезон» — простое среднее по матчам текущего сезона лиги. Нажмите на заголовок столбца, чтобы отсортировать.</p>`;
    box.querySelectorAll("[data-ltk]").forEach((b) => b.addEventListener("click", () => { st.stat = b.dataset.ltk; stSave(); render(); }));
    box.querySelectorAll("[data-ltc]").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.ltc);
      if (S.lts.col === i) S.lts.desc = !S.lts.desc; else { S.lts.col = i; S.lts.desc = true; }
      render();
    }));
  };
  render();
}

function teamStatsSection(L, tid) {
  const T = L.tstat;
  const me = T && T.teams ? T.teams[String(tid)] : null;
  if (!me) return "";
  const keys = ST_ORDER.filter((k) => T.keys.includes(k) && me[k]);
  if (!keys.length) return "";
  const rank = (k, i, desc) => {
    const vals = Object.values(T.teams).filter((v) => v[k]).map((v) => v[k][i]);
    const mine = me[k][i];
    const better = vals.filter((x) => (desc ? x > mine + 1e-9 : x < mine - 1e-9)).length;
    return `${better + 1}<span class="muted small">/${vals.length}</span>`;
  };
  const nx = (L.matches || []).filter((m) => m.status === "pending" && new Date(m.kickoff) > new Date() && m.sp &&
    (String(m.home_id) === String(tid) || String(m.away_id) === String(tid))).sort((a, b) => (a.kickoff < b.kickoff ? -1 : 1))[0];
  let h = `<h2>Статистика команды</h2><section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Показатель</th>
    <th title="Модель: за матч против среднего соперника лиги на нейтральном поле">У команды</th><th title="Место в лиге: 1 — больше всех">место</th>
    <th title="Модель: сколько у соперников в матчах с командой">У соперников</th><th title="Место в лиге: 1 — у соперников меньше всех">место</th>
    <th>Сезон: у команды</th><th>Сезон: у соперников</th><th>Средняя команда</th></tr></thead><tbody>
    ${keys.map((k) => { const v = me[k]; return `<tr><td class="tl">${ST_NAME[k]}</td><td><b>${num(v[0], 1)}</b></td><td>${rank(k, 0, true)}</td>
      <td><b>${num(v[1], 1)}</b></td><td>${rank(k, 1, false)}</td><td>${v[2] == null ? "—" : num(v[2], 1)}</td><td>${v[3] == null ? "—" : num(v[3], 1)}</td>
      <td>${num(T.avg[k], 1)}</td></tr>`; }).join("")}</tbody></table></section>
    <p class="muted small">«У команды» — сколько у неё самой (бьёт, подаёт угловые, фолит, получает карточки), «у соперников» — сколько у соперников в матчах с ней.
    Первые столбцы — модель (против среднего соперника лиги на нейтральном поле, с учётом силы соперников и свежести матчей);
    «сезон» — простое среднее текущего сезона лиги (${me[keys[0]][4]} ${plural(me[keys[0]][4], ["матч", "матча", "матчей"])} с этими данными).</p>`;
  if (nx) {
    const home = String(nx.home_id) === String(tid);
    h += `<h3 style="margin-top:14px">Ближайший матч: <a href="#/match/${encodeURIComponent(L.key)}/${nx.id}">${home ? "дома" : "в гостях"} — ${esc(home ? nx.away : nx.home)}</a>
      <span class="muted small">· ${esc(fmtDateTime(nx.kickoff))}</span></h3>
      <section class="card pad"><div class="st-next">${ST_ORDER.filter((k) => nx.sp[k]).map((k) => {
        const s = nx.sp[k];
        const a = home ? s.m[0] : s.m[1], b = home ? s.m[1] : s.m[0];
        return `<div><span class="muted small">${ST_NAME[k]}</span><b>${num(a, 1)}</b><span class="muted small">соперник ${num(b, 1)}</span></div>`;
      }).join("")}</div><p class="muted small">Ожидаемые значения команды и соперника. Линии и вероятности — на <a href="#/match/${encodeURIComponent(L.key)}/${nx.id}">странице матча</a>.</p></section>`;
  }
  return h;
}

function statsAccuracySection(SA) {
  const bt = SA && SA.bt;
  let h = `<h2 id="acc-stats">Статистика матча</h2>`;
  if (!bt || !bt.stats || !Object.keys(bt.stats).length) {
    return h + `<p class="card pad">Проверка моделей статистики ещё не проводилась.</p>`;
  }
  const keys = ST_ORDER.filter((k) => bt.stats[k]);
  const y0 = Number(bt.protocol.tune[0].slice(0, 4));
  h += `<p class="muted small">Каждый показатель — своя модель (как для голов): параметры подобраны на сезонах ${y0}/${String((y0 + 1) % 100).padStart(2, "0")}–${y0 + 1}/${String((y0 + 2) % 100).padStart(2, "0")},
    ниже — проверка на матчах с ${esc(fmtDate(bt.protocol.valid_from))} ${esc(bt.protocol.valid_from.slice(0, 4))}, которые при подборе не использовались; модель каждую неделю
    подгонялась только по прошлым матчам. Ориентир — средние лиги у хозяев и у гостей за прошедший год.</p>
    <section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Показатель</th><th>Матчей</th>
    <th title="Средняя абсолютная ошибка ожидаемого тотала матча">Ошибка тотала</th><th title="То же у средних лиги">у средних</th>
    <th title="Средняя ошибка показателя команды">Ошибка команды</th><th>у средних</th>
    <th title="Уверенные линии от 70 % (тотал матча): доля сыгравших против обещанного">Линии 70 %: тотал</th><th title="То же по командам">команды</th>
    <th title="Средняя ошибка калибровки вероятностей «тотал больше линии»">Калибровка</th><th>На сайте</th></tr></thead><tbody>
    ${keys.map((k) => {
      const x = bt.stats[k], c = (x.conf || {})["70"] || {};
      const cc = (z) => (z && z.n ? `<b>${pct(z.rate, 1)}</b> <span class="muted small">/ ${pct(z.pred, 1)}</span>` : "—");
      return `<tr><td class="tl">${ST_NAME[k]}</td><td>${(x.n || 0).toLocaleString("ru-RU")}</td>
        <td class="${x.mae_total < x.mae_total_base ? "good" : "bad"}">${num(x.mae_total, 2)}</td><td>${num(x.mae_total_base, 2)}</td>
        <td class="${x.mae_team < x.mae_team_base ? "good" : "bad"}">${num(x.mae_team, 2)}</td><td>${num(x.mae_team_base, 2)}</td>
        <td>${cc(c.t)}</td><td>${cc(c.team)}</td><td>${x.calib_err == null ? "—" : num(x.calib_err * 100, 1) + " п.п."}</td>
        <td>${x.gate && x.gate.ok ? "да" : `<span class="bad" title="${esc((x.gate && x.gate.why) || "")}">нет</span>`}</td></tr>`;
    }).join("")}</tbody></table></section>
    <p class="muted small">«Линии 70 %»: для каждого матча берутся самые смелые линии «больше» и «меньше», на которых модель даёт не меньше 70 %;
    первая цифра — как часто они сыграли, вторая — сколько в среднем обещала модель. Если модель честна, цифры близки.
    Показатель выводится на сайт, только если модель точнее средних лиги и калибровка не хуже 3,5 п.п. — правило записано до проверки.</p>`;
  if (!S.accSt || !keys.includes(S.accSt)) S.accSt = keys.includes("corners") ? "corners" : keys[0];
  h += `<div class="grid2"><div><h3 style="margin-top:14px">Калибровка тоталов</h3><div class="chips" id="accStChips">${keys.map((k) => chipBtn("accst", k, S.accSt === k, ST_NAME[k])).join("")}</div>
    <section class="card pad" id="accStCal"></section></div><div><h3 style="margin-top:14px">Уверенные линии по порогам</h3><section class="card pad" id="accStConf"></section></div></div>
    <h3 style="margin-top:14px">По лигам</h3><div id="accStLg"></div>`;
  const lv = SA.live || {};
  const lk = keys.filter((k) => lv[k] && lv[k].n);
  h += `<h3 style="margin-top:18px">Живой журнал статистики</h3>`;
  if (lk.length) {
    h += `<section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Показатель</th><th>Матчей</th><th>Ошибка тотала</th>
      <th>Линии 70 %: тотал</th><th>команды</th><th title="Логлосс «больше/меньше» на основной линии конторы: модель / контора (меньше — лучше)">Против линии конторы</th></tr></thead><tbody>
      ${lk.map((k) => { const x = lv[k], c = (x.conf || {})["70"] || {};
        const cc = (z) => (z && z.n ? `<b>${pct(z.rate, 1)}</b> <span class="muted small">/ ${pct(z.pred, 1)} (${z.n})</span>` : "—");
        return `<tr><td class="tl">${ST_NAME[k]}</td><td>${x.n}</td><td>${num(x.mae_total, 2)}</td><td>${cc(c.t)}</td><td>${cc(c.team)}</td>
          <td>${x.vs_market ? `${num(x.vs_market.model, 3)} / ${num(x.vs_market.market, 3)} <span class="muted small">(${x.vs_market.n})</span>` : "—"}</td></tr>`; }).join("")}
      </tbody></table></section><p class="muted small">Прогноз статистики фиксируется до стартового свистка вместе с прогнозом исхода. Факт — окончательные данные
      (примерно через сутки после матча), а до них — предварительные, сразу после матча.
      ${lk.some((k) => lv[k].n_q) ? `По предварительным данным сейчас: ${lk.filter((k) => lv[k].n_q).map((k) => `${ST_SHORT[k]} — ${lv[k].n_q}`).join(", ")}.` : ""}</p>`;
  } else {
    h += `<p class="card pad">Журнал статистики только начат: первые рассчитанные матчи появятся, когда придёт фактическая статистика ближайшего тура.</p>`;
  }
  return h;
}
function statsAccuracyMount(SA) {
  const bt = SA && SA.bt;
  if (!bt || !document.getElementById("accStCal")) return;
  const draw = () => {
    const x = bt.stats[S.accSt];
    document.getElementById("accStCal").innerHTML = `${calibChart(x.calib)}
      <p class="muted small">${ST_NAME[S.accSt]}: вероятности «тотал больше линии» для линий вокруг ожидаемого значения против того, как часто это сбылось.</p>`;
    const cf = x.conf || {};
    document.getElementById("accStConf").innerHTML = `<table class="kv"><tr><th>Уверенность</th><th>Тотал: сыграли / обещано</th><th>Команды</th></tr>
      ${CONFS.map((c) => { const z = cf[String(c)] || {}; const f = (q) => (q && q.n ? `${pct(q.rate, 1)} / ${pct(q.pred, 1)}` : "—");
        return `<tr><td>от ${c}%</td><td>${f(z.t)}</td><td>${f(z.team)}</td></tr>`; }).join("")}</table>
      <p class="muted small">${ST_NAME[S.accSt]}, отложенные матчи (${(x.n || 0).toLocaleString("ru-RU")}).</p>`;
    const lgs = x.leagues || {};
    const hide = (x.gate && x.gate.hide) || [];
    document.getElementById("accStLg").innerHTML = `<section class="card tbl-wrap"><table class="tbl"><thead><tr><th class="tl">Лига</th><th>Матчей</th>
      <th title="Средний тотал матча в лиге на проверке">Средний тотал</th><th>Ошибка тотала</th><th>у средних лиги</th>
      <th title="Логарифм правдоподобия пары (хозяева, гости) на матч: модель минус средние лиги; больше нуля — модель точнее">Выигрыш</th></tr></thead><tbody>
      ${(S.index.leagues || []).filter((l) => lgs[l.key]).map((l) => { const z = lgs[l.key], g = z.ll - z.ll_base;
        return `<tr><td class="tl">${esc(l.name)} <span class="muted small">${esc(l.country)}</span>${hide.includes(l.key) ? ' <span class="bad small">скрыта</span>' : ""}</td>
          <td>${z.n}</td><td>${num(z.avg_total, 1)}</td><td class="${z.mae_total <= z.mae_total_base ? "good" : "bad"}">${num(z.mae_total, 2)}</td>
          <td>${num(z.mae_total_base, 2)}</td><td class="${g > 0 ? "good" : "bad"}">${sgn(g, 3)}</td></tr>`; }).join("")}</tbody></table></section>
      <p class="muted small">${ST_NAME[S.accSt]} по лигам на отложенных матчах. Лига скрывается по показателю, если в ней не меньше 80 матчей проверки и модель хуже средних лиги.</p>`;
    document.querySelectorAll("[data-accst]").forEach((b) => b.classList.toggle("on", b.dataset.accst === S.accSt));
  };
  document.querySelectorAll("[data-accst]").forEach((b) => b.addEventListener("click", () => { S.accSt = b.dataset.accst; draw(); }));
  draw();
}

function stHalfLives() {
  const bt = S.index && S.index.stats_bt;
  if (!bt) return "";
  const xs = ST_ORDER.filter((k) => bt[k] && bt[k].hl).map((k) => [k, bt[k].hl]).sort((a, b) => a[1] - b[1]);
  if (!xs.length) return "";
  const mon = (d) => (d < 45 ? `${d} дн.` : `≈ ${Math.round(d / 30.44)} мес.`);
  const s = xs.map(([k, d]) => `${ST_NAME[k].toLowerCase()} — ${mon(d)}`).join(", ");
  return ` Сейчас матч теряет половину веса: ${s}${s.endsWith(".") ? "" : "."}`;
}

function statsMethod() {
  return `<h2>Статистика матча: удары, угловые, фолы, карточки, офсайды, ауты</h2>
  <p>Для каждого показателя и каждой лиги подгоняется своя модель того же вида, что и для голов: у команды есть «за» — сколько она обычно
  набирает (бьёт, подаёт угловые, фолит) — и «против» — сколько позволяет соперникам; у лиги — общий уровень и домашнее преимущество.
  Ожидаемое значение для матча складывается из «за» одной команды и «против» другой, поэтому учитывается и стиль, и соперник.</p>
  <ul>
    <li><b>Перевес и темп.</b> Силы команды рассматриваются в двух разрезах: перевес (у кого будет больше) и общий объём матча.
      Объём от игры к игре шумнее, поэтому оценивается осторожнее, — так прогноз тотала не «дёргается» от случайных матчей.</li>
    <li><b>Судья.</b> Для карточек и фолов учитывается строгость главного судьи (его обычно называют за 1–2 дня до матча).
      По немногим матчам судьи оценка мягко тянется к среднему.</li>
    <li><b>Свежесть.</b> Старые матчи весят меньше; скорость забывания подобрана отдельно для каждого показателя.${stHalfLives()}
      Проверено: простые «последние 10 матчей» и равный вес последних матчей дают прогноз хуже —
      на малой выборке слишком много случайности и не учтена сила соперников.</li>
    <li><b>Уровень лиги — по последним неделям.</b> Если показатель меняется сразу во всей лиге (так, летом 2026 года
      во всех лигах выросло число учтённых ударов), модель сверяет общий уровень со свежими матчами и быстро
      подстраивается, а силы команд по-прежнему оценивает по длинной истории.</li>
    <li><b>Разброс.</b> У ударов, угловых и аутов значения разбросаны сильнее, чем у «идеальной случайности» (распределение Пуассона),
      у карточек — слабее; это учтено распределением Конвея–Максвелла–Пуассона с подобранным параметром.</li>
    <li><b>Связь команд в матче.</b> Если одна команда давит, у другой меньше ударов и угловых; в «жёстком» матче карточки получают обе.
      Эта связь учтена копулой Франка — поэтому вероятности тотала матча, тоталов команд и «кто больше» согласованы между собой.</li>
    <li><b>Уверенные линии.</b> Для выбранной уверенности (например, 70 %) показываются самая высокая линия «больше» и самая низкая «меньше»,
      где вероятность не ниже порога. Как часто такие линии сыграли на отложенных матчах — в разделе «Точность».</li>
  </ul>
  <p>Параметры подобраны на сезонах 2023/24–2024/25 и проверены на матчах после 1 июля 2025 года, которые при подборе не использовались.
  Показатель выводится, только если модель на проверке точнее простых средних лиги и вероятности откалиброваны. Прогноз статистики
  фиксируется в журнале до стартового свистка, как и прогноз исхода. Модель не знает о составах, травмах и погоде.</p>`;
}

function euroMethod() {
  if (!hasCups()) return "";
  const ea = S.index.euro_acc;
  return `<h2 id="euro">Еврокубки: Лига чемпионов, Лига Европы, Лига конференций</h2>
  <p>В еврокубке встречаются команды разных лиг, и силы из моделей своих лиг у них в разных шкалах: «середняк» сильного чемпионата
  и лидер слабого могут выглядеть одинаково. Поэтому для еврокубков строится <b>совместная модель</b> того же вида
  (Диксона–Коулза по голам и xG): одной подгонкой по матчам национальных чемпионатов, где играют участники, и матчам самих еврокубков.
  Сила команды одна во всех турнирах; внутри лиги команды сравнивает её чемпионат, а лиги между собой — матчи еврокубков
  (с квалификацией). У каждой лиги свой уровень голов и своё домашнее преимущество, у еврокубков — своё.</p>
  <ul>
    <li><b>Сила лиги.</b> Оценка команды мягко тянется к среднему её лиги, а средний уровень лиги — к общему; насколько сильно —
      подобрано на истории. Так команда из лиги, где данных мало, не получает случайную оценку.</li>
    <li><b>90 минут.</b> Вероятности П1 / Х / П2, тоталы и форы — за основное время: так рассчитываются и прогнозы, и журнал.</li>
    <li><b>Двухматчевые противостояния.</b> Для квалификации и плей-офф считаются шансы пройти дальше: перед первым матчем модель
      разыгрывает оба матча (ответный — на поле соперника), перед ответным — учитывает счёт первого. Если по сумме ничья —
      дополнительное время (30 минут с тем же темпом голов), затем пенальти (50 на 50). Правило выездного гола отменено.</li>
    <li><b>Финал</b> — на нейтральном поле, домашнего преимущества нет; показан шанс выиграть трофей.</li>
    <li><b>Общий этап</b> (с сезона 2024/25): 36 команд в одной таблице, места 1–8 — сразу в 1/8 финала, 9–24 — стыковой раунд,
      25–36 выбывают. Таблица показывается с зонами и силой команд в единой шкале.</li>
    <li><b>Мало данных — нет прогноза.</b> Прогноз даётся, только если о каждой команде за последние 400 дней есть не меньше 10 матчей
      и известна её лига (в ранней квалификации у клубов самых малых лиг данных нет — такие матчи остаются без прогноза).</li>
    <li><b>Статистика матча</b> (удары, угловые, фолы, карточки…) — такая же совместная модель для каждого показателя: у еврокубков свой
      уровень, учитываются стиль обеих команд, сила соперников и строгость судьи. Показатель выводится, только если прошёл проверку.</li>
  </ul>
  <p><b>Проверено и не включено:</b> поправки на счёт первого матча в ответном (кто ведёт — «закрывается»), на летнюю квалификацию
  (команда в разгаре сезона против команды на предсезонке) и на отдельное домашнее преимущество в плей-офф — на отложенных матчах
  точность с ними не выросла достаточно надёжно (правило приёма — то же, что для факторов лиг).</p>
  <p><b>Проверка.</b> Параметры подобраны на сезонах еврокубков 2023/24–2024/25 и проверены на матчах после 1 июля 2025 года${ea && ea.n
    ? `: ${ea.n.toLocaleString("ru-RU")} матчей, логлосс ${num(ea.ll, 3)} против ${num(ea.ll_base, 3)} у частот исходов` : ""}.
  Прогнозы турнира публикуются, только если модель на подборе заметно точнее частот исходов (выигрыш ≥ 0,010),
  откалибрована (≤ 3,5 п.п.) и на проверке не хуже частот — те же правила, что при отборе лиг. Подробнее — «<a href="#/accuracy">Точность</a>».</p>`;
}

function hcpMethod(hc) {
  let h = `<h2>Форы и разница мячей</h2>
  <p>Форы считаются из той же матрицы точных счетов: Ф1(−1,5) — сумма вероятностей всех счетов, где хозяева выигрывают
  в два мяча и больше; при целой форе отдельно показан возврат.</p>`;
  if (hc && hc["-1.5"]) {
    const L = ["-2.5", "-1.5", "-0.5", "0.5", "1.5", "2.5"].filter((k) => hc[k]);
    h += `<p><b>Проверка</b> на ${hc["-1.5"].n.toLocaleString("ru-RU")} матчах после 1 июля 2025 года (при подборе не использовались):
    средний прогноз против фактической доли.</p>
    <table class="kv"><tr><th>Фора хозяев</th><th>Прогноз</th><th>Факт</th><th>Брайер модели</th><th>Брайер частоты</th></tr>
    ${L.map((k) => `<tr><td>Ф1(${fmtLine(Number(k))})</td><td>${pct(hc[k].pred, 1)}</td><td>${pct(hc[k].obs, 1)}</td>
      <td>${num(hc[k].brier, 4)}</td><td>${num(hc[k].brier_base, 4)}</td></tr>`).join("")}</table>
    <p class="muted small">Брайер — средний квадрат ошибки (меньше — лучше); «частота» — если всегда называть долю из этой же выборки.</p>`;
  }
  return h;
}

function simMethod(bt) {
  let h = `<h2>Симуляция сезона</h2>
  <p>Для лиг, где все играют со всеми дома и в гостях и итог решает таблица, сайт разыгрывает остаток сезона 10 000 раз:
  счёт каждого оставшегося матча выпадает с вероятностями модели, а в каждом прогоне сила команды ещё чуть сдвигается случайно —
  за полсезона она может измениться. По прогонам считается, как часто команда заканчивает на каждом месте.
  Перед расчётом собранные матчи сверяются с официальной таблицей (игры, мячи, очки, снятые очки); если что-то не сходится,
  симуляция лиги не показывается, а не считается по неверным данным. Лиги с разделением на группы после круга, плей-офф за титул
  или короткими турнирами не симулируются.</p>`;
  if (bt && bt.rps != null) {
    const gain = bt.rps_equal ? (1 - bt.rps / bt.rps_equal) * 100 : null;
    h += `<p><b>Проверка.</b> Размер случайного сдвига силы (σ = ${num(bt.sigma, 2)}) подобран на сезонах 2023/24–2024/25
    (для лиг, играющих по календарному году, — 2023–2024). Затем метод проверен на сезоне 2025/26 (соответственно 2025),
    который при подборе не использовался: ${bt.cases} прогнозов (после четверти, половины и трёх четвертей сезона),
    всего ${bt.teams} оценок итогового места команды.
    Ошибка итоговых мест (RPS, меньше — лучше): <b>${num(bt.rps, 4)}</b> против ${num(bt.rps_equal, 4)}
    у простого продления таблицы, где все команды считаются равными по силе${gain != null ? ` (на ${gain.toFixed(0)} % меньше)` : ""}.
    Брайер для событий «1-е место», «верх таблицы», «последние места»: ${num(bt.brier, 4)} против ${num(bt.brier_equal, 4)}.</p>`;
  }
  return h;
}

function renderMethod() {
  setNav("method");
  app.innerHTML = `<div class="prose"><h1>Как считаются вероятности</h1>
  <h2>Коротко</h2>
  <p>Для каждой лиги отдельно подгоняется <b>модель Диксона–Коулза</b>: у каждой команды есть сила атаки и сила обороны,
  у лиги — общий уровень голов и домашнее преимущество. Из них для матча получаются ожидаемые голы хозяев λ₁ и гостей λ₂,
  а из них — вероятность каждого точного счёта. Сумма по счетам даёт П1 / Х / П2, тоталы и «обе забьют».</p>
  <h2>Подробнее</h2>
  <ul>
    <li><b>Формула.</b> log λ₁ = μ + дом + атака<sub>хоз</sub> − оборона<sub>гост</sub>; log λ₂ = μ + атака<sub>гост</sub> − оборона<sub>хоз</sub>.
      Голы — пуассоновские, с поправкой Диксона–Коулза ρ для счетов 0:0, 1:0, 0:1, 1:1 (в футболе ничьих 0:0 и 1:1 чуть больше, чем у чистого Пуассона).</li>
    <li><b>Голы и xG.</b> Модель учится на смеси настоящих голов и ожидаемых (xG): xG меньше зависит от везения и лучше
      показывает силу команды. Пропорция подобрана на истории.</li>
    <li><b>Свежесть.</b> Вес матча убывает экспоненциально с его давностью, поэтому прошлогодняя форма постепенно забывается.</li>
    <li><b>Сила соперников учтена.</b> Победа над лидером весит больше победы над аутсайдером — силы оцениваются все сразу, совместно.</li>
    <li><b>Новички лиги.</b> Поднявшиеся из низшего дивизиона стартуют чуть ниже среднего, вылетевшие сверху — чуть выше;
      по мере игр их оценка определяется уже их собственными матчами.</li>
    <li><b>Сжатие к среднему.</b> По нескольким матчам сила команды известна плохо, поэтому оценка мягко тянется к среднему (гребневой штраф).</li>
    <li><b>Турнирная мотивация.</b> В лигах, где все играют со всеми дома и в гостях, по таблице считается, насколько судьба каждой команды
      в сезоне ещё решается: может ли она за оставшиеся туры подняться к первому месту или в верх таблицы и может ли опуститься
      в зону вылета (или выбраться из неё). Если одна команда ещё борется, а у другой положение почти решено, более мотивированной
      добавляется немного силы — на странице матча это отмечено. Размер поправки подобран на сезонах 2023/24–2024/25 и проверен
      на матчах после 1 июля 2025 года: точность выросла (логлосс 1,0021 → 1,0016, на матчах с заметной разницей мотивации
      0,9739 → 0,9703), калибровка не ухудшилась.</li>
  </ul>
  <h2>Чем это отличается от «сравнения сил» на многих сайтах</h2>
  <p>Популярный приём — сложить доли команд по нескольким показателям (очки, голы, рейтинги, трансферная стоимость) и
  назвать среднее «вероятностью», например 77 на 23. Это не вероятность: в ней нет ничьей, соперники не взвешены, а сама шкала
  никогда не проверялась на результатах. Здесь вероятности — настоящие: они складываются в 100 % вместе с ничьей,
  и их точность публично проверяется (раздел «Точность»). Радар на странице матча — только профиль, в вероятность он не входит.</p>
  <h2>Проверка</h2>
  <p>Параметры модели подобраны на сезонах 2023/24–2024/25 по логлоссу. Точность показана на матчах после 1 июля 2025 года,
  которые при подборе не использовались, при еженедельной переподгонке только по прошлым матчам. Кроме того, сайт ведёт живой журнал:
  последний прогноз до свистка фиксируется и потом сравнивается с результатом.</p>
  <h2>Прогноз со страховкой</h2>
  <p>У каждого матча есть итоговый прогноз. Если вероятность победы хозяев <b>58 % и выше</b>, прогноз — <b>1X</b>
  (хозяева не проиграют: победа или ничья); если 58 % и выше у победы гостей — <b>X2</b> (гости не проиграют).
  В остальных матчах прогноз — самый вероятный исход: П1, Х или П2. Рядом показана вероятность самого прогноза
  (для 1X — сумма вероятностей победы хозяев и ничьей). Проценты сравниваются с порогом так же, как они округлены на сайте.
  Как часто прогнозы сыграли — в разделе «Точность».</p>
  ${euroMethod()}
  ${hcpMethod(S.index && S.index.accuracy && S.index.accuracy.hcp)}
  ${simMethod(S.index && S.index.sim_bt)}
  ${statsMethod()}
  <h2>Ограничения</h2>
  <ul>
    <li>Турнирную мотивацию модель учитывает по таблице (см. выше), и только в лигах, где все играют со всеми дома и в гостях.</li>
    <li>О травмах, составах, ротации, погоде и смене тренера модель пока не знает — только о том, что видно в сыгранных матчах.
      Такие данные начали накапливаться; поправка на них появится, только если на отложенных матчах она сделает прогноз точнее.</li>
    <li>Проверено и не включено, потому что на отложенных матчах прогноз не стал лучше по точности или по калибровке: поправка на еврокубки за 4 дня до или после
      матча (ротация), на «матч ни о чём» для обеих команд, отдельные поправки на начало сезона и на новичков лиги
      (кроме той, что уже есть в модели).</li>
    <li>На ранней стадии сезона и для новичков лиги оценки менее надёжны.</li>
    <li>Вероятность 70 % означает, что примерно в трёх случаях из десяти фаворит не выигрывает. Это не ошибка модели.</li>
    <li>Сайт не даёт советов по ставкам. Рынок в среднем точен; находить у него ошибки — отдельная и трудная задача.</li>
  </ul>
  <h2>Какие лиги на сайте</h2>
  <p>Регулярные национальные чемпионаты (без кубков стран, резервных, молодёжных и региональных турниров) —
  высшие дивизионы известных футбольных стран и пять сильных вторых лиг, — а также три еврокубка (о них — выше). Лига попадает на сайт, только если данных
  достаточно для корректного прогноза — по правилам, записанным до проверки:</p>
  <ul>
    <li>есть история минимум за два прошлых сезона (не меньше 120 матчей в каждом) и не меньше 300 матчей для оценки;</li>
    <li>на периоде подбора модель заметно точнее простых частот исходов лиги (выигрыш в логлоссе ≥ 0.010);</li>
    <li>вероятности откалиброваны (средняя ошибка калибровки ≤ 3.5 п.п.);</li>
    <li>на свежих, не участвовавших в подборе матчах модель не хуже частот.</li>
  </ul>
  <p>Лиги, не прошедшие отбор, на сайт не выводятся: прогноз по ним был бы ненадёжным.</p>
  <h2>Обновление</h2>
  <p>Сайт обновляется автоматически: добавляет новые матчи, переподгоняет модели и пересчитывает прогнозы.
  Итог сыгранного матча появляется при ближайшем обновлении после финального свистка, полная статистика — примерно через сутки.${(() => {
    const no = ((S.index && S.index.leagues) || []).filter((l) => !l.qk).map((l) => `${esc(l.name)} (${esc(l.country)})`);
    return no.length ? ` В этих лигах итог появляется только примерно через сутки: ${no.join(", ")}.` : "";
  })()}</p></div>`;
}

const LIVE_FRESH_MIN = 20;
const LIVE_POLL_MS = 90e3;
const LIVE_SCHED_H = 2.5;
const NOT_PLAYED = ["POSTP", "CANCL", "ABAN", "SUSP", "DELAYED", "INT", "WO", "TBA", "DELETED"];
const LIVE_DELAY = "обновляются сами, задержка до ~10 минут";
let liveTimer = null, liveLast = 0;
function liveFor(id) {
  const L = S.live;
  const e = L && L.matches ? L.matches[String(id)] : null;
  if (!e || !Array.isArray(e.s) || e.s.length !== 2 || e.s.some((x) => typeof x !== "number")) return null;
  if (e.st !== "ft" && (!e.t || (Date.now() - new Date(e.t).getTime()) / 6e4 > LIVE_FRESH_MIN)) return null;
  return e;
}
function liveNow(m) {
  if (!m || m.st !== "pending") return null;
  const e = liveFor(m.id);
  if (e) return e.st === "ft" ? null : { e };
  const h = (Date.now() - new Date(m.ko).getTime()) / 36e5;
  return h >= 0 && h < LIVE_SCHED_H && !NOT_PLAYED.includes(m.fst) ? { e: null } : null;
}
function liveMatches() {
  const ms = (S.index && S.index.matches) || [];
  return ms.filter((m) => liveNow(m)).sort((a, b) => (a.ko < b.ko ? -1 : a.ko > b.ko ? 1 : a.id - b.id));
}
function liveFileState() {
  if (!S.index || !S.index.live_url) return "off";
  if (!S.live) return S.liveErr ? "fail" : "wait";
  const age = (Date.now() - new Date(S.live.generated).getTime()) / 6e4;
  return age > LIVE_FRESH_MIN ? "old" : "ok";
}
function liveListSig(list) {
  return liveFileState() + "|" + list.map((m) => { const x = liveNow(m); return m.id + (x && x.e ? "+" : "-"); }).join(",");
}
function liveListNote(list, tail) {
  const fs = liveFileState();
  const noData = list.filter((m) => { const x = liveNow(m); return !(x && x.e); }).length;
  let t = `Идут сейчас: счёт и минута — по ходу игры, ${LIVE_DELAY}. ${tail}`;
  if (!list.length) return t;
  if (fs === "wait") t += " Загружаем текущие счета…";
  else if (fs !== "ok") t += ` Текущие счета сейчас недоступны — матчи показаны по расписанию (начались меньше ${fmtL(LIVE_SCHED_H)} ч назад).`;
  else if (noData) t += " Матчи без счёта показаны по расписанию: текущих данных по ним пока нет.";
  return t;
}
function liveEmptyText() {
  const now = Date.now();
  const next = ((S.index && S.index.matches) || []).filter((m) => m.st === "pending" && new Date(m.ko).getTime() > now)
    .sort((a, b) => (a.ko < b.ko ? -1 : a.ko > b.ko ? 1 : 0))[0];
  return "Сейчас идущих матчей нет." + (next ? ` Ближайший — ${esc(dayLabel(dayKey(new Date(next.ko))).toLowerCase())} в ${esc(fmtTime(next.ko))}:
    ${esc(next.h)} — ${esc(next.a)}.` : "");
}
const liveTail = (e) => (e.st === "ft" ? "финал" : e.st === "ht" ? "перерыв" : esc(e.min || "идёт"));
function liveRowHtml(e) {
  return `<span class="lv-dot${e.st === "ft" ? " off" : ""}"></span><b>${e.s[0]}:${e.s[1]}</b> <span>${liveTail(e)}</span>`;
}
const LIVE_REASON = { AET: "после дополнительного времени", Pen: "по пенальти", PEN: "по пенальти", AP: "по пенальти" };
function liveBoxHtml(m, e) {
  const head = e.st === "ft" ? `Финал${e.r ? ` (${esc(LIVE_REASON[e.r] || e.r)})` : ""}`
    : e.st === "ht" ? "Перерыв" : `Идёт матч${e.min ? ` · ${esc(e.min)}` : ""}`;
  let h = `<div class="lv-head"><span class="lv-dot${e.st === "ft" ? " off" : ""}"></span><b>${head}</b></div>
    <div class="lv-score"><span>${esc(m.home)}</span><b>${e.s[0]} : ${e.s[1]}</b><span>${esc(m.away)}</span></div>`;
  const inSt = (k) => !!(m.sp && m.sp[k]);
  const has = (k) => !!(e.x && Array.isArray(e.x[k]));
  const keys = ST_ORDER.filter((k) => has(k) && !inSt(k));
  if (keys.length) {
    h += `<table class="kv lv-tbl"><tr><th>Показатель</th>
      <th>${e.st === "ft" ? "Итог" : "Сейчас"}<br><span class="muted">хоз. : гост. · тотал</span></th></tr>
      ${keys.map((k) => { const x = e.x[k]; return `<tr><td>${ST_NAME[k]}</td><td><b>${x[0]} : ${x[1]}</b> · ${x[0] + x[1]}</td></tr>`; }).join("")}</table>`;
  }
  const moved = ST_ORDER.some((k) => has(k) && inSt(k));
  h += `<p class="muted small">Данные на ${esc(fmtTime(e.t || S.live.generated))}, ${LIVE_DELAY}.
    ${moved ? (e.st === "ft" ? "Итоговые показатели матча — ниже, в «Статистике матча», рядом с прогнозом до матча."
      : "Текущие показатели матча — ниже, в «Статистике матча», рядом с прогнозом до матча.") : ""}
    ${e.st === "ft" ? "Журнал прогнозов рассчитает матч при ближайшем обновлении сайта." : ""}</p>`;
  return h;
}
function liveFill() {
  document.querySelectorAll("[data-lvr]").forEach((el) => {
    const e = liveFor(el.dataset.lvr);
    const html = e ? liveRowHtml(e) : "";
    if (el.innerHTML !== html) el.innerHTML = html;
  });
  const box = document.getElementById("liveBox");
  if (box && S.curMatch) {
    const e = liveFor(S.curMatch.id);
    if (e) {
      const html = liveBoxHtml(S.curMatch, e);
      if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
      box.hidden = false;
    } else {
      box.hidden = true;
    }
  }
}
function liveApply() {
  liveFill();
  if (S.onLive) S.onLive();
}
function liveNeeded() {
  const ix = S.index;
  if (!ix) return false;
  const now = Date.now();
  return (ix.matches || []).some((m) => m.st === "pending" && now >= new Date(m.ko).getTime() - 2 * 6e4
    && now - new Date(m.ko).getTime() < 6 * 36e5);
}
async function liveLoad() {
  const url = S.index && S.index.live_url;
  if (!url) return;
  liveLast = Date.now();
  try {
    const r = await fetch(`${url}?m=${Math.floor(Date.now() / 6e4)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (!j || j.v !== 1 || !j.matches || typeof j.matches !== "object") throw new Error("формат");
    S.live = j;
    S.liveErr = false;
  } catch (e) {
    S.liveErr = true;
  }
  liveApply();
}
function liveKick() {
  if (!liveNeeded()) return;
  if (S.index.live_url && Date.now() - liveLast > 60e3) liveLoad();
  if (!liveTimer) liveTimer = setInterval(() => {
    if (document.hidden || !liveNeeded()) return;
    if (S.index.live_url) liveLoad(); else liveApply();
  }, LIVE_POLL_MS);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) liveKick(); });

const PRO = { data: null, code: null, tab: null, conf: 70, day: "all", sc: "all", busy: false, err: null, t: 0, timer: null };
const PRO_POLL_MS = 120e3;
const proUrl = () => {
  if (["localhost", "127.0.0.1"].includes(location.hostname) && S.proLocal !== false) return "data/pro.json";
  return S.index && S.index.live_url ? S.index.live_url.replace(/live\.json$/, "pro.json") : null;
};
const b64bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const proNorm = (s) => String(s || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
const proFmtCode = (s) => proNorm(s).replace(/(.{4})(?=.)/g, "$1-");

async function proDecrypt(blob, code) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64bytes(blob.kdf.s), iterations: blob.kdf.it }, base, 320));
  const id = Array.from(bits.slice(32)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const e = (blob.keys || []).find((k) => k.i === id);
  if (!e) return null;
  try {
    const kek = await crypto.subtle.importKey("raw", bits.slice(0, 32), "AES-GCM", false, ["decrypt"]);
    const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64bytes(e.v) }, kek, b64bytes(e.k));
    const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64bytes(blob.iv) }, key, b64bytes(blob.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (x) {
    return null;
  }
}
const proBlobOk = (b) => !!(b && b.v === 1 && b.kdf && Array.isArray(b.keys) && b.ct);
async function proFresh() {
  const p = String((S.index && S.index.live_url) || "").split("/");
  if (p.length < 9 || p[2] !== "raw.githubusercontent.com" || p[5] !== "refs" || p[6] !== "heads") return null;
  const r = await fetch(`https://api.github.com/repos/${p[3]}/${p[4]}/contents/pro.json?ref=${encodeURIComponent(p[7])}`);
  if (!r.ok) return null;
  const j = await r.json();
  if (!j || j.encoding !== "base64" || !j.content) return null;
  const b = JSON.parse(atob(String(j.content).replace(/\s/g, "")));
  return proBlobOk(b) ? b : null;
}
async function proFetch(code) {
  let url = proUrl();
  if (!url) return { none: true };
  let r = await fetch(`${url}?m=${Math.floor(Date.now() / 6e4)}`);
  if (!r.ok && url === "data/pro.json" && S.index && S.index.live_url) {
    S.proLocal = false;
    url = proUrl();
    r = await fetch(`${url}?m=${Math.floor(Date.now() / 6e4)}`);
  }
  if (r.status === 404) return { none: true };
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  let blob = await r.json();
  if (!proBlobOk(blob)) throw new Error("формат");
  if (!(window.crypto && crypto.subtle)) throw new Error("браузер не поддерживает шифрование");
  const d = await proDecrypt(blob, code);
  if (d) return { data: d };
  try {
    const fb = await proFresh();
    if (fb) {
      const d2 = await proDecrypt(fb, code);
      if (d2) return { data: d2 };
      blob = fb;
    }
  } catch (e) { }
  return { bad: true, gen: blob.gen };
}
const PRO_RETRY_MAX = 10;
function proState() {
  if (PRO.tab) return;
  try {
    const s = JSON.parse(lsGet("fp-pro-ui") || "{}");
    if (CONFS.includes(s.conf)) PRO.conf = s.conf;
    if (["all", "lg", "cup"].includes(s.sc)) PRO.sc = s.sc;
  } catch (e) { }
  PRO.tab = "pre";
}
function proSave() { lsSet("fp-pro-ui", JSON.stringify({ conf: PRO.conf, sc: PRO.sc })); }

function proForm(msg, prefill) {
  app.innerHTML = `<h1>Закрытый раздел</h1>
    <section class="card pad pro-gate">
      <p>Прогнозы единой системы: прематч и матчи по ходу игры — исход, голы, удары, удары в створ, фолы, карточки,
      офсайды, ауты. Раздел открывается кодом доступа.</p>
      ${msg ? `<p class="notice">${esc(msg)}</p>` : ""}
      <form id="proForm" class="pro-form" autocomplete="off">
        <label for="proCode" class="small muted">Код доступа</label>
        <div class="pro-row"><input id="proCode" class="pro-input" inputmode="text" autocapitalize="characters" spellcheck="false"
          placeholder="XXXX-XXXX-XXXX" maxlength="20" aria-label="Код доступа"><button class="chip on" type="submit">Открыть</button></div>
      </form>
      <p class="small muted">Код запоминается в этом браузере. Нет кода — раздел недоступен; остальной сайт открыт всем.</p>
    </section>`;
  const f = document.getElementById("proForm");
  const inp = document.getElementById("proCode");
  if (prefill) inp.value = proFmtCode(prefill);
  inp.addEventListener("input", () => { const c = proFmtCode(inp.value); if (c !== inp.value) inp.value = c; });
  f.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const code = proNorm(inp.value);
    if (code.length < 8) { proForm("Код — 12 знаков, например ABCD-EFGH-JKLM."); return; }
    proOpen(code, true);
  });
  inp.focus();
}
async function proOpen(code, fromForm) {
  if (PRO.busy) return;
  PRO.busy = true;
  if (!PRO.data) app.innerHTML = `<h1>Закрытый раздел</h1><p class="loading">Проверяю код…</p>`;
  let res;
  try {
    res = await proFetch(code);
  } catch (e) {
    PRO.busy = false;
    if (PRO.data) { PRO.err = e.message; proRender(); return; }
    proForm(`Не удалось загрузить данные раздела (${e.message}). Попробуйте позже.`);
    return;
  }
  PRO.busy = false;
  if (res.bad) {
    PRO.data = null; PRO.code = null;
    try { localStorage.removeItem("fp-pro"); } catch (e) { }
    if (!fromForm) { proForm("Код больше не действует (истёк или отозван)."); return; }
    const n = PRO.retry && PRO.retry.code === code ? PRO.retry.n + 1 : 0;
    clearTimeout(PRO.retryT);
    if (n < PRO_RETRY_MAX) {
      PRO.retry = { code, n };
      proForm(`Код пока не найден в данных раздела${res.gen ? ` (данные на ${fmtTime(res.gen)})` : ""}. Если его выдали только что,
        он заработает в течение нескольких минут — страница сама проверит ещё раз через минуту (проверка ${n + 1} из ${PRO_RETRY_MAX}).`, code);
      PRO.retryT = setTimeout(() => {
        if (location.hash.replace(/^#\/?/, "").split("/")[0] === "pro" && PRO.retry && PRO.retry.code === code && !PRO.data) proOpen(code, true);
      }, 60e3);
      return;
    }
    PRO.retry = null;
    proForm("Код не подходит. Проверьте написание — или срок кода истёк.", code);
    return;
  }
  PRO.retry = null;
  clearTimeout(PRO.retryT);
  if (res.none) { proForm("Данные раздела сейчас недоступны. Попробуйте позже."); return; }
  PRO.code = code;
  PRO.data = res.data;
  PRO.err = null;
  PRO.t = Date.now();
  lsSet("fp-pro", code);
  if (location.hash.replace(/^#\/?/, "").split("/")[0] === "pro") proRender();
}
function proLeave() {
  PRO.data = null; PRO.code = null;
  try { localStorage.removeItem("fp-pro"); } catch (e) { }
  proForm();
}

const proLg = (key) => { const l = (PRO.data && PRO.data.lg && PRO.data.lg[key]) || null;
  return l ? (l.cup ? l.n : `${l.c ? l.c + " · " : ""}${l.n}`) : key; };
const proIsCup = (key) => !!(PRO.data && PRO.data.lg && PRO.data.lg[key] && PRO.data.lg[key].cup);
const proInSc = (m) => PRO.sc === "all" || (PRO.sc === "cup") === proIsCup(m.lg);
const PRO_PICK = { "1X": "1X", X2: "X2", 1: "П1", X: "Х", 2: "П2" };

function proConfCells(pk, c, floor) {
  const d = spDist(pk);
  const ov = [];
  let tail = 0;
  for (let i = d.p.length - 1; i >= 1; i--) { tail += d.p[i]; ov.push([d.lo + i - 0.5, tail]); }
  ov.sort((x, y) => x[0] - y[0]);
  let over = null, under = null;
  for (const [L, p] of ov) if (L > floor && P100(p) >= c) over = [L, p];
  for (const [L, p] of ov) if (L > floor && P100(1 - p) >= c) { under = [L, 1 - p]; break; }
  const cell = (x) => (x ? `${fmtL(x[0])} <b>${pct(x[1])}</b>` : `<span class="muted">—</span>`);
  return `<td>${cell(over)}</td><td>${cell(under)}</td>`;
}
const proSplit = (a, b) => ` <span class="muted pro-split">(${num(a, 1)} : ${num(b, 1)})</span>`;
function proPreCard(m) {
  const c = PRO.conf;
  const g = m.g || {};
  const rows = [];
  rows.push(`<tr><td class="tl">Голы</td><td>${num(g.e[0] + g.e[1], 1)}${proSplit(g.e[0], g.e[1])}</td>${proConfCells(g.t, c, -1)}</tr>`);
  for (const k of ST_ORDER) {
    const s = m.st && m.st[k];
    if (!s) continue;
    rows.push(`<tr><td class="tl">${esc(ST_NAME[k])}${s.r ? ` <span class="muted" title="учтён судья матча">⚖</span>` : ""}</td>
      <td>${num(s.e[0] + s.e[1], 1)}${proSplit(s.e[0], s.e[1])}</td>${proConfCells(s.t, c, -1)}</tr>`);
  }
  const pk = m.pk ? `<span class="pick${m.pk[0].length === 2 ? " ins" : ""}">${PRO_PICK[m.pk[0]]}</span> <b>${pct(m.pk[1])}</b>` : "";
  return `<section class="card block pro-card">
    <div class="pro-head"><span class="mtime">${esc(fmtTime(m.ko))}</span><span class="small muted">${esc(proLg(m.lg))}</span></div>
    <div class="pro-teams"><b>${esc(m.h)}</b> — <b>${esc(m.a)}</b></div>
    <div class="pick-line">${pbar(m.p)}${pk}${m.bl ? `<span class="small muted">с учётом рынка</span>` : ""}</div>
    <div class="small muted">Обе забьют: ${pct(g.bt)}</div>
    <div class="tbl-wrap"><table class="tbl pro-tbl"><thead><tr><th class="tl">Показатель</th><th>Ожидание<span class="pro-split"> (хоз. : гост.)</span></th>
      <th>Больше</th><th>Меньше</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
    <p class="small muted pro-note">Больше / меньше — линии с вероятностью от ${c}%.</p>
  </section>`;
}
function proLiveCard(m) {
  const c = PRO.conf;
  const rows = [];
  const gnow = (m.s[0] || 0) + (m.s[1] || 0);
  rows.push(`<tr><td class="tl">Голы</td><td>${m.s[0]}:${m.s[1]} → <b>${num(m.g.e, 1)}</b></td>${proConfCells(m.g.t, c, gnow)}</tr>`);
  let prelim = false;
  for (const k of ST_ORDER) {
    const s = m.st && m.st[k];
    if (!s) continue;
    if (!s.c) prelim = true;
    rows.push(`<tr><td class="tl">${esc(ST_NAME[k])}${s.c ? "" : "*"}</td>
      <td>${s.n[0]}:${s.n[1]} → <b>${num(s.e[0] + s.e[1], 1)}</b>${proSplit(s.e[0], s.e[1])}</td>${proConfCells(s.t, c, s.n[0] + s.n[1])}</tr>`);
  }
  return `<section class="card block pro-card">
    <div class="pro-head"><span class="warn"><b>${esc(m.m)}</b></span><span class="small muted">${esc(proLg(m.lg))}</span></div>
    <div class="pro-teams"><b>${esc(m.h)}</b> <span class="res">${m.s[0]}:${m.s[1]}</span> <b>${esc(m.a)}</b></div>
    <div class="pick-line">${pbar(m.p, false, ["П1", "ничья", "П2"])}<span class="small muted">итог матча</span></div>
    <div class="tbl-wrap"><table class="tbl pro-tbl"><thead><tr><th class="tl">Показатель</th><th>Сейчас → итог</th>
      <th>Больше</th><th>Меньше</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
    <p class="small muted pro-note">Больше / меньше — линии итога матча с вероятностью от ${c}% (выше уже набранного).</p>
    ${prelim ? `<p class="small muted">* — предварительно: для этого показателя ход матча ещё не откалиброван.</p>` : ""}
    ${m.t ? `<p class="small muted">Данные на ${esc(fmtTime(m.t))}.</p>` : ""}
  </section>`;
}
function proAcc() {
  const a = (PRO.data && PRO.data.acc) || {};
  const out = [];
  if (a.lg) out.push(`<li>Победа и голы по ходу матча: проверка на ${a.lg.n} сыгранных матчах, которые при подборе не использовались —
    логарифмическая ошибка исхода ${num(a.lg.m, 4)} против ${num(a.lg.b, 4)} у простой модели «равномерно по времени».</li>`);
  const ls = a.ls || {};
  const nm = { shots: "удары", sot: "удары в створ", corners: "угловые", fouls: "фолы" };
  const parts = Object.keys(ls).filter((k) => ls[k].ok).map((k) => `${nm[k] || k}: ${num(ls[k].mae, 2)} против ${num(ls[k].mae0, 2)}`);
  if (parts.length) out.push(`<li>Статистика по ходу матча (прогноз 2-го тайма по 1-му), средняя ошибка на команду: ${esc(parts.join("; "))}
    — модель против простой пропорции «сколько было, столько и будет».</li>`);
  if (a.bl) out.push(`<li>Смесь прогноза до матча с рынком: на ${a.bl.n} матчах проверки ${num(a.bl.m, 4)} → ${num(a.bl.x, 4)};
    ${a.bl.ok ? "выигрыш подтверждён — смесь включена" : "выигрыш пока статистически не доказан — показывается модель без смеси"}.</li>`);
  out.push(`<li>Прогноз до матча — проверенная модель сайта: показатели статистики выводятся, только если на проверочных матчах
    они точнее средних лиги (подробно — «<a href="#/accuracy">Точность</a>»).</li>`);
  return `<section class="card pad"><h2>Как проверялась точность</h2><ul class="pro-acc">${out.join("")}</ul>
    <p class="small muted">Вероятности — оценка модели, а не гарантия и не рекомендация делать ставки. 18+.</p></section>`;
}
function proRender() {
  proState();
  const d = PRO.data;
  setNav("pro");
  const pre = (d.pre || []).filter((m) => new Date(m.ko) > new Date() && proInSc(m));
  const live = (d.live || []).filter(proInSc);
  if (PRO.tab === "live" && !live.length && PRO.auto !== false) PRO.tab = "pre";
  const days = [...new Set(pre.map((m) => dayKey(new Date(m.ko))))].sort();
  if (PRO.day !== "all" && !days.includes(PRO.day)) PRO.day = "all";
  const preDay = pre.filter((m) => PRO.day === "all" || dayKey(new Date(m.ko)) === PRO.day);
  const tabs = [["live", `Идут сейчас`, live.length], ["pre", "Ближайшие матчи", pre.length], ["acc", "Точность", null]];
  let h = `<h1>Закрытый раздел <button class="chip pro-out" id="proOut" type="button">Выйти</button></h1>
    <p class="muted small">Прогнозы единой системы · данные на ${esc(fmtDateTime(d.gen))}${PRO.err ? ` · <span class="warn">обновить не удалось</span>` : ""}</p>
    <div class="chips">${tabs.map(([k, l, n]) => chipBtn("ptab", k, PRO.tab === k, l, n)).join("")}</div>`;
  if (PRO.tab !== "acc") {
    h += `<div class="chips">${SCOPES.map(([k, l]) => chipBtn("psc", k, PRO.sc === k, l)).join("")}</div>
      <div class="chips"><span class="small muted chips-lab">Уверенность от:</span>${CONFS.map((c) => chipBtn("pconf", String(c), PRO.conf === c, c + "%")).join("")}</div>`;
  }
  if (PRO.tab === "pre") {
    if (days.length > 1) h += `<div class="chips">${chipBtn("pday", "all", PRO.day === "all", "Все дни", pre.length)}${days.map((k) =>
      chipBtn("pday", k, PRO.day === k, dayLabel(k), pre.filter((m) => dayKey(new Date(m.ko)) === k).length)).join("")}</div>`;
    h += preDay.length ? preDay.slice(0, 120).map(proPreCard).join("") : `<p class="muted">Ближайших матчей нет.</p>`;
    if (preDay.length > 120) h += `<p class="muted small">Показаны первые 120 матчей — выберите день.</p>`;
  } else if (PRO.tab === "live") {
    h += live.length ? live.map(proLiveCard).join("") : `<p class="muted">Сейчас матчей нет — они появятся здесь со стартовым свистком.</p>`;
    h += `<p class="small muted">Страница обновляется сама каждые 2 минуты, задержка данных — до ~10 минут.</p>`;
  } else {
    h += proAcc();
  }
  app.innerHTML = h;
  document.getElementById("proOut").addEventListener("click", proLeave);
  app.querySelectorAll("[data-ptab]").forEach((b) => b.addEventListener("click", () => { PRO.tab = b.dataset.ptab; PRO.auto = false; proRender(); }));
  app.querySelectorAll("[data-psc]").forEach((b) => b.addEventListener("click", () => { PRO.sc = b.dataset.psc; proSave(); proRender(); }));
  app.querySelectorAll("[data-pconf]").forEach((b) => b.addEventListener("click", () => { PRO.conf = +b.dataset.pconf; proSave(); proRender(); }));
  app.querySelectorAll("[data-pday]").forEach((b) => b.addEventListener("click", () => { PRO.day = b.dataset.pday; proRender(); }));
}
function proKick() {
  if (PRO.timer) return;
  PRO.timer = setInterval(() => {
    if (document.hidden || !PRO.code || location.hash.replace(/^#\/?/, "").split("/")[0] !== "pro") return;
    if (Date.now() - PRO.t >= PRO_POLL_MS - 1e3) proOpen(PRO.code, false);
  }, 30e3);
}
async function renderPro() {
  setNav("pro");
  proKick();
  const code = PRO.code || proNorm(lsGet("fp-pro") || "");
  if (!code) { proForm(); return; }
  if (PRO.data && PRO.code === code) {
    proRender();
    if (Date.now() - PRO.t >= PRO_POLL_MS) proOpen(code, false);
    return;
  }
  await proOpen(code, false);
}

async function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean).map(decodeURIComponent);
  S.onLive = null;
  S.curMatch = null;
  try {
    await ensureIndex();
    if (parts[0] === "match" && parts[1] && parts[2]) await renderMatch(parts[1], parts[2]);
    else if (parts[0] === "league" && parts[1]) await renderLeague(parts[1]);
    else if (parts[0] === "team" && parts[1] && parts[2]) await renderTeam(parts[1], parts[2]);
    else if (parts[0] === "leagues") renderLeagues();
    else if (parts[0] === "cups") await renderCups();
    else if (parts[0] === "picks") renderPicks();
    else if (parts[0] === "stats") await renderStats();
    else if (parts[0] === "accuracy") await renderAccuracy();
    else if (parts[0] === "method") renderMethod();
    else if (parts[0] === "pro") await renderPro();
    else renderMatches();
    liveApply();
    liveKick();
    document.getElementById("footMeta").textContent =
      `Обновлено: ${fmtDateTime(S.index.generated)} · версия ${S.index.version}`;
  } catch (e) {
    app.innerHTML = `<p class="error">Не удалось загрузить данные (${esc(e.message)}). Попробуйте обновить страницу.</p>`;
  }
  window.scrollTo(0, 0);
}

(function theme() {
  const saved = lsGet("fp-theme");
  if (saved === "dark" || saved === "light") document.documentElement.dataset.theme = saved;
  document.getElementById("themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    lsSet("fp-theme", next);
  });
})();

window.addEventListener("hashchange", route);
route();
