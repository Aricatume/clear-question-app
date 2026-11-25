/* Clear Question / Thinking Geometry v4.0 — UTF-8 CloudStorage (<3800B), Deterministic Merge, Progressive Unlock & Ebbinghaus Engine */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TGStorage = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CHUNK_UTF8_LIMIT = 3800; // Strict UTF-8 bytes (< 4096 B Telegram CloudStorage limit for Cyrillic!)
  const STATE_KEY = "tg_geom_state_v3";
  const REVIEW_INTERVALS_MIN = [1440, 4320, 10080, 20160]; // 1d, 3d, 7d, 14d
  const VALID_QUADS = new Set(["q1", "q2", "q3", "q4"]);

  function utcNowIso() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
  }

  function addMinutesIso(iso, mins) {
    return new Date(new Date(iso).getTime() + mins * 60000).toISOString().replace(/\.\d{3}Z$/, "+00:00");
  }

  function utf8ByteLength(str) {
    const s = String(str || "");
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(s).length;
    }
    try {
      return unescape(encodeURIComponent(s)).length;
    } catch (_) {
      return s.length * 2;
    }
  }

  function splitUtf8Chunks(str, maxBytes = CHUNK_UTF8_LIMIT) {
    const s = String(str || "");
    if (utf8ByteLength(s) <= maxBytes) return [s];
    const chunks = [];
    let cur = "";
    let curBytes = 0;
    for (const ch of s) {
      const b = utf8ByteLength(ch);
      if (curBytes + b > maxBytes && cur.length > 0) {
        chunks.push(cur);
        cur = ch;
        curBytes = b;
      } else {
        cur += ch;
        curBytes += b;
      }
    }
    if (cur.length > 0) chunks.push(cur);
    return chunks;
  }

  function defaultPrefs() {
    return {
      sandbox_unlocked: false,
      sound_enabled: true,
      seen_milestones: [],
      preferred_intent: "warmup", // warmup | course | lab
      updated_at: 0,
    };
  }

  function defaultState() {
    return {
      version: 4,
      current_week: 1,
      atoms_read: {}, // atom_id -> { ts, next_review_ts, step }
      weeks_completed: {}, // weekNum -> ts
      case_notes: {}, // part_id -> { text, ts }
      quiz_runs: [], // [{ ts, mode, total, correct, avg_sec }]
      atom_quiz_stats: {}, // atom_id -> { ok, miss, next_review_ts }
      matrix_items: [], // [{ id, text, quad }]
      custom_priorities: { wsjf: null, rice: null, kano: null },
      axelrod_runs: 0,
      prefs: defaultPrefs(),
    };
  }

  function computeActivityUnits(st) {
    if (!st || typeof st !== "object") return 0;
    const atomsCount = st.atoms_read && typeof st.atoms_read === "object" ? Object.keys(st.atoms_read).length : 0;
    const runsCount = Array.isArray(st.quiz_runs) ? st.quiz_runs.length : 0;
    const weeksCount = st.weeks_completed && typeof st.weeks_completed === "object" ? Object.keys(st.weeks_completed).length : 0;
    const axCount = Number(st.axelrod_runs || 0);
    return atomsCount + runsCount + weeksCount + axCount;
  }

  function computeUnlockLevel(st, explicitPrefs) {
    const prefs = explicitPrefs || (st && st.prefs) || defaultPrefs();
    if (prefs && prefs.sandbox_unlocked) return 3;
    const units = typeof st === "number" ? st : computeActivityUnits(st);
    if (units >= 5) return 3;
    if (units >= 3) return 2;
    if (units >= 1) return 1;
    return 0;
  }

  function isFeatureUnlocked(featureKey, unlockLevel) {
    const lvl = Number(unlockLevel || 0);
    if (
      featureKey === "today" ||
      featureKey === "express" ||
      featureKey === "rhythm" ||
      featureKey === "part-1" ||
      featureKey === "euler" ||
      featureKey === "scales"
    ) {
      return true;
    }
    if (
      featureKey === "part-2" ||
      featureKey === "part-3" ||
      featureKey === "square" ||
      featureKey === "molecule" ||
      featureKey === "nash"
    ) {
      return lvl >= 1;
    }
    if (
      featureKey === "part-4" ||
      featureKey === "part-5" ||
      featureKey === "mill" ||
      featureKey === "matrix" ||
      featureKey === "axelrod"
    ) {
      return lvl >= 2;
    }
    if (
      featureKey === "atoms145" ||
      featureKey === "micromouse" ||
      featureKey === "harvard_cases"
    ) {
      return lvl >= 3;
    }
    return true;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return defaultState();
    const basePrefs = defaultPrefs();
    const rp = raw.prefs && typeof raw.prefs === "object" ? raw.prefs : {};
    return {
      version: 4,
      current_week: Number(raw.current_week) >= 1 && Number(raw.current_week) <= 26 ? Number(raw.current_week) : 1,
      atoms_read: raw.atoms_read && typeof raw.atoms_read === "object" ? { ...raw.atoms_read } : {},
      weeks_completed: raw.weeks_completed && typeof raw.weeks_completed === "object" ? { ...raw.weeks_completed } : {},
      case_notes: raw.case_notes && typeof raw.case_notes === "object" ? { ...raw.case_notes } : {},
      quiz_runs: Array.isArray(raw.quiz_runs) ? raw.quiz_runs.slice() : [],
      atom_quiz_stats: raw.atom_quiz_stats && typeof raw.atom_quiz_stats === "object" ? { ...raw.atom_quiz_stats } : {},
      matrix_items: Array.isArray(raw.matrix_items) ? raw.matrix_items.slice() : [],
      custom_priorities:
        raw.custom_priorities && typeof raw.custom_priorities === "object"
          ? { wsjf: null, rice: null, kano: null, ...raw.custom_priorities }
          : { wsjf: null, rice: null, kano: null },
      axelrod_runs: Number(raw.axelrod_runs) || 0,
      prefs: {
        sandbox_unlocked: rp.sandbox_unlocked !== undefined ? Boolean(rp.sandbox_unlocked) : basePrefs.sandbox_unlocked,
        sound_enabled: rp.sound_enabled !== undefined ? Boolean(rp.sound_enabled) : basePrefs.sound_enabled,
        seen_milestones: Array.isArray(rp.seen_milestones) ? Array.from(new Set(rp.seen_milestones)) : [],
        preferred_intent: ["warmup", "course", "lab"].includes(rp.preferred_intent) ? rp.preferred_intent : "warmup",
        updated_at: Number(rp.updated_at || 0),
      },
    };
  }

  function mergeStates(localRaw, cloudRaw) {
    if (!localRaw && !cloudRaw) return defaultState();
    if (!localRaw) return normalizeState(cloudRaw);
    if (!cloudRaw) return normalizeState(localRaw);

    const L = normalizeState(localRaw);
    const C = normalizeState(cloudRaw);
    const localNewer = Number(L.prefs.updated_at || 0) >= Number(C.prefs.updated_at || 0);
    const primary = localNewer ? L : C;
    const secondary = localNewer ? C : L;

    const atoms_read = { ...secondary.atoms_read };
    for (const [k, v] of Object.entries(primary.atoms_read)) {
      const prev = atoms_read[k];
      if (!prev || Number(v.step || 0) > Number(prev.step || 0) || String(v.ts || "") >= String(prev.ts || "")) {
        atoms_read[k] = v;
      }
    }

    const weeks_completed = { ...secondary.weeks_completed };
    for (const [k, ts] of Object.entries(primary.weeks_completed)) {
      if (!weeks_completed[k] || String(ts || "") >= String(weeks_completed[k] || "")) {
        weeks_completed[k] = ts;
      }
    }

    const case_notes = { ...secondary.case_notes };
    for (const [pid, note] of Object.entries(primary.case_notes)) {
      const prev = case_notes[pid];
      if (!prev || (note && note.text && String(note.ts || "") >= String(prev.ts || ""))) {
        case_notes[pid] = note;
      }
    }

    const runMap = new Map();
    for (const r of [...secondary.quiz_runs, ...primary.quiz_runs]) {
      if (!r) continue;
      const rk = `${r.ts || ""}|${r.mode || ""}|${r.total || 0}|${r.correct || 0}`;
      runMap.set(rk, r);
    }
    const quiz_runs = Array.from(runMap.values())
      .sort((a, b) => String(a.ts || "").localeCompare(String(b.ts || "")))
      .slice(-60);

    const atom_quiz_stats = { ...secondary.atom_quiz_stats };
    for (const [aid, st] of Object.entries(primary.atom_quiz_stats)) {
      const prev = atom_quiz_stats[aid];
      const sumCur = Number(st.ok || 0) + Number(st.miss || 0);
      const sumPrev = prev ? Number(prev.ok || 0) + Number(prev.miss || 0) : -1;
      if (sumCur >= sumPrev) atom_quiz_stats[aid] = st;
    }

    // Preserve primary's matrix_items (or union if secondary has items and primary has updated_at === 0)
    let matrix_items = primary.matrix_items;
    if (Number(L.prefs.updated_at || 0) === 0 && Number(C.prefs.updated_at || 0) === 0) {
      const mMap = new Map();
      for (const it of [...C.matrix_items, ...L.matrix_items]) {
        if (it && it.id) mMap.set(it.id, it);
      }
      matrix_items = Array.from(mMap.values()).slice(-24);
    }

    const seenMilestones = Array.from(
      new Set([...(secondary.prefs.seen_milestones || []), ...(primary.prefs.seen_milestones || [])])
    );

    return {
      version: 4,
      current_week: primary.current_week || secondary.current_week || 1,
      atoms_read,
      weeks_completed,
      case_notes,
      quiz_runs,
      atom_quiz_stats,
      matrix_items,
      custom_priorities: {
        wsjf: primary.custom_priorities.wsjf ?? secondary.custom_priorities.wsjf ?? null,
        rice: primary.custom_priorities.rice ?? secondary.custom_priorities.rice ?? null,
        kano: primary.custom_priorities.kano ?? secondary.custom_priorities.kano ?? null,
      },
      axelrod_runs: Math.max(Number(L.axelrod_runs || 0), Number(C.axelrod_runs || 0)),
      prefs: {
        ...primary.prefs,
        seen_milestones: seenMilestones,
        updated_at: Math.max(Number(L.prefs.updated_at || 0), Number(C.prefs.updated_at || 0)),
      },
    };
  }

  function createKvAdapter(tgObj, localStore) {
    const tg =
      tgObj ||
      (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp
        ? window.Telegram.WebApp
        : null);
    const cloudSupported =
      !tg || typeof tg.isVersionAtLeast !== "function" || tg.isVersionAtLeast("6.9");
    const hasCloud = !!(
      tg &&
      cloudSupported &&
      tg.CloudStorage &&
      typeof tg.CloudStorage.getItem === "function" &&
      typeof tg.CloudStorage.setItem === "function"
    );
    const mem = Object.create(null);

    function localRawGet(key) {
      if (localStore) {
        try {
          const v = localStore.getItem(key);
          if (v !== null && v !== undefined && v !== "") return v;
        } catch (_) {}
      }
      return mem[key] ?? null;
    }

    function cloudRawGet(key) {
      if (!hasCloud) return Promise.resolve(null);
      return new Promise((resolve) => {
        try {
          tg.CloudStorage.getItem(key, (err, val) => {
            if (err) resolve(null);
            else resolve(val || null);
          });
        } catch (_) {
          resolve(null);
        }
      });
    }

    function rawSet(key, value) {
      const str = String(value);
      if (localStore) {
        try {
          localStore.setItem(key, str);
        } catch (_) {}
      }
      mem[key] = str;
      if (hasCloud) {
        return new Promise((resolve) => {
          try {
            tg.CloudStorage.setItem(key, str, () => resolve(true));
          } catch (_) {
            resolve(false);
          }
        });
      }
      return Promise.resolve(true);
    }

    function rawRemove(key) {
      delete mem[key];
      if (localStore && typeof localStore.removeItem === "function") {
        try {
          localStore.removeItem(key);
        } catch (_) {}
      }
      if (hasCloud && typeof tg.CloudStorage.removeItem === "function") {
        return new Promise((resolve) => {
          try {
            tg.CloudStorage.removeItem(key, () => resolve(true));
          } catch (_) {
            resolve(false);
          }
        });
      }
      return Promise.resolve(true);
    }

    async function readJsonFrom(getter, key, fallback) {
      const metaRaw = await getter(`${key}__n`);
      if (metaRaw && /^[1-9]\d*$/.test(metaRaw)) {
        const count = Number(metaRaw);
        const parts = [];
        for (let i = 0; i < count; i += 1) {
          const part = await getter(`${key}__${i}`);
          if (part == null) return fallback;
          parts.push(part);
        }
        try {
          return JSON.parse(parts.join(""));
        } catch (_) {
          return fallback;
        }
      }
      const single = await getter(key);
      if (!single) return fallback;
      try {
        return JSON.parse(single);
      } catch (_) {
        return fallback;
      }
    }

    async function getJson(key, fallback, mergeFn) {
      const localVal = await readJsonFrom((k) => Promise.resolve(localRawGet(k)), key, null);
      if (!hasCloud) {
        return localVal !== null ? localVal : fallback;
      }
      const cloudVal = await readJsonFrom(cloudRawGet, key, null);
      if (localVal === null && cloudVal === null) return fallback;
      if (typeof mergeFn === "function") {
        return mergeFn(localVal, cloudVal);
      }
      return localVal !== null ? localVal : cloudVal;
    }

    async function setJson(key, obj) {
      const serialized = JSON.stringify(obj);
      const chunks = splitUtf8Chunks(serialized, CHUNK_UTF8_LIMIT);
      if (chunks.length === 1) {
        await rawSet(`${key}__n`, "0");
        await rawSet(key, chunks[0]);
        return;
      }
      for (let i = 0; i < chunks.length; i += 1) {
        await rawSet(`${key}__${i}`, chunks[i]);
      }
      await rawSet(`${key}__n`, String(chunks.length));
    }

    async function removeJson(key) {
      const metaRaw = localRawGet(`${key}__n`) || (await cloudRawGet(`${key}__n`));
      const count = metaRaw && /^[1-9]\d*$/.test(metaRaw) ? Number(metaRaw) : 0;
      await rawRemove(key);
      await rawRemove(`${key}__n`);
      for (let i = 0; i < count; i += 1) {
        await rawRemove(`${key}__${i}`);
      }
    }

    return {
      backendName: hasCloud ? "telegram_cloud" : localStore ? "local_storage" : "memory",
      getJson,
      setJson,
      removeJson,
    };
  }

  class ThinkingGeometryEngine {
    constructor(catalog, kv) {
      this.catalog = catalog;
      this.kv = kv;
      this.weeksByNum = Object.fromEntries((catalog.weeks || []).map((w) => [w.week, w]));
      this.atomsById = Object.fromEntries((catalog.atoms || []).map((a) => [a.id, a]));
      this.partsById = Object.fromEntries((catalog.parts || []).map((p) => [p.id, p]));
    }

    async loadState() {
      const st = await this.kv.getJson(STATE_KEY, null, mergeStates);
      return normalizeState(st);
    }

    async saveState(st) {
      if (st.quiz_runs.length > 60) st.quiz_runs = st.quiz_runs.slice(-60);
      if (st.matrix_items.length > 24) st.matrix_items = st.matrix_items.slice(-24);
      st.prefs = {
        ...defaultPrefs(),
        ...(st.prefs || {}),
        updated_at: Date.now(),
      };
      await this.kv.setJson(STATE_KEY, st);
    }

    async updatePrefs(patch) {
      const st = await this.loadState();
      st.prefs = {
        ...defaultPrefs(),
        ...(st.prefs || {}),
        ...(patch || {}),
        updated_at: Date.now(),
      };
      if (Array.isArray(st.prefs.seen_milestones)) {
        st.prefs.seen_milestones = Array.from(new Set(st.prefs.seen_milestones));
      }
      await this.saveState(st);
      return st.prefs;
    }

    async markMilestoneSeen(level) {
      const st = await this.loadState();
      const seen = Array.isArray(st.prefs.seen_milestones) ? st.prefs.seen_milestones.slice() : [];
      if (!seen.includes(level)) seen.push(level);
      return this.updatePrefs({ seen_milestones: seen });
    }

    async exportSnapshot() {
      const st = await this.loadState();
      return {
        exported_at: utcNowIso(),
        app: "Геометрия мышления v4.0",
        backend: this.kv.backendName,
        state: st,
      };
    }

    async resetAll() {
      if (typeof this.kv.removeJson === "function") {
        await this.kv.removeJson(STATE_KEY);
      } else {
        await this.kv.setJson(STATE_KEY, defaultState());
      }
      return true;
    }

    async setCurrentWeek(weekNum) {
      const w = Math.max(1, Math.min(26, Number(weekNum) || 1));
      const st = await this.loadState();
      st.current_week = w;
      await this.saveState(st);
      return w;
    }

    async toggleAtomRead(atomId, nowIso = null) {
      const atom = this.atomsById[atomId];
      if (!atom) throw new Error(`Unknown atomId: ${atomId}`);
      const st = await this.loadState();
      const ts = nowIso || utcNowIso();
      if (st.atoms_read[atomId]) {
        delete st.atoms_read[atomId];
      } else {
        st.atoms_read[atomId] = { ts, step: 0, next_review_ts: addMinutesIso(ts, REVIEW_INTERVALS_MIN[0]) };
      }
      st.current_week = atom.chapter_num;
      const wk = this.weeksByNum[atom.chapter_num];
      if (wk && wk.atom_ids.every((id) => !!st.atoms_read[id])) {
        st.weeks_completed[String(wk.week)] = ts;
      }
      await this.saveState(st);
      return !!st.atoms_read[atomId];
    }

    async markWeekCompleted(weekNum, nowIso = null) {
      const wk = this.weeksByNum[Number(weekNum)];
      if (!wk) throw new Error(`Unknown week: ${weekNum}`);
      const st = await this.loadState();
      const ts = nowIso || utcNowIso();
      for (const aid of wk.atom_ids) {
        if (!st.atoms_read[aid]) {
          st.atoms_read[aid] = { ts, step: 0, next_review_ts: addMinutesIso(ts, REVIEW_INTERVALS_MIN[0]) };
        }
      }
      st.weeks_completed[String(wk.week)] = ts;
      st.current_week = Math.min(26, wk.week + 1);
      await this.saveState(st);
      return st.current_week;
    }

    async saveCaseNote(partId, text, nowIso = null) {
      if (!this.partsById[partId]) throw new Error(`Unknown partId: ${partId}`);
      const st = await this.loadState();
      const clean = String(text || "").trim().slice(0, 600);
      st.case_notes[partId] = { text: clean, ts: nowIso || utcNowIso() };
      await this.saveState(st);
      return st.case_notes[partId];
    }

    async recordQuizRun({ mode, results, nowIso = null }) {
      const st = await this.loadState();
      const ts = nowIso || utcNowIso();
      const total = results.length;
      const correct = results.filter((r) => r.correct).length;
      const avgSec = total
        ? Number((results.reduce((acc, r) => acc + (Number(r.sec) || 0), 0) / total).toFixed(1))
        : 0;

      const run = { ts, mode, total, correct, avg_sec: avgSec };
      st.quiz_runs.push(run);

      for (const r of results) {
        if (!r.atom_id) continue;
        const prev = st.atom_quiz_stats[r.atom_id] || { ok: 0, miss: 0, next_review_ts: null };
        const nextOk = prev.ok + (r.correct ? 1 : 0);
        const nextMiss = prev.miss + (r.correct ? 0 : 1);
        const intervalMin = r.correct
          ? REVIEW_INTERVALS_MIN[Math.min(REVIEW_INTERVALS_MIN.length - 1, nextOk)]
          : 720; // 12h gentle revisit on miss
        st.atom_quiz_stats[r.atom_id] = {
          ok: nextOk,
          miss: nextMiss,
          next_review_ts: addMinutesIso(ts, intervalMin),
        };
      }
      await this.saveState(st);
      return run;
    }

    async incrementAxelrodRuns() {
      const st = await this.loadState();
      st.axelrod_runs += 1;
      await this.saveState(st);
      return st.axelrod_runs;
    }

    async addMatrixItem(text, quad) {
      if (!VALID_QUADS.has(quad)) throw new Error(`Invalid quadrant: ${quad}`);
      const clean = String(text || "").trim().slice(0, 90);
      if (!clean) return null;
      const st = await this.loadState();
      const item = {
        id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        text: clean,
        quad,
      };
      st.matrix_items.push(item);
      await this.saveState(st);
      return item;
    }

    async removeMatrixItem(itemId) {
      const st = await this.loadState();
      st.matrix_items = st.matrix_items.filter((x) => x.id !== itemId);
      await this.saveState(st);
    }

    async saveCustomPriorityList(kind, list) {
      if (!["wsjf", "rice", "kano"].includes(kind)) return;
      const st = await this.loadState();
      st.custom_priorities = st.custom_priorities || {};
      st.custom_priorities[kind] = Array.isArray(list) ? list.slice(0, 12) : [];
      await this.saveState(st);
    }

    async getDashboard(nowIso = null) {
      const st = await this.loadState();
      const nowMs = new Date(nowIso || utcNowIso()).getTime();

      const totalAtoms = (this.catalog.atoms || []).length;
      const readAtomsCount = Object.keys(st.atoms_read).filter((id) => !!this.atomsById[id]).length;
      const weeksDoneCount = Object.keys(st.weeks_completed).length;

      const totalAnswered = st.quiz_runs.reduce((a, r) => a + r.total, 0);
      const totalCorrect = st.quiz_runs.reduce((a, r) => a + r.correct, 0);
      const accuracyPct = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : null;
      const avgSpeedSec = st.quiz_runs.length
        ? Number((st.quiz_runs.reduce((a, r) => a + r.avg_sec, 0) / st.quiz_runs.length).toFixed(1))
        : null;

      const dueAtomIds = Object.entries(st.atom_quiz_stats)
        .filter(([aid, info]) => this.atomsById[aid] && info.next_review_ts && new Date(info.next_review_ts).getTime() <= nowMs)
        .map(([aid]) => aid);

      const weakAtomIds = Object.entries(st.atom_quiz_stats)
        .filter(([aid, info]) => this.atomsById[aid] && info.miss > info.ok)
        .map(([aid]) => aid);

      const curWeekObj = this.weeksByNum[st.current_week] || this.weeksByNum[1];

      const partProgress = (this.catalog.parts || []).map((pt) => {
        const ptAtoms = (this.catalog.atoms || []).filter((a) => a.part_id === pt.id);
        const doneAtoms = ptAtoms.filter((a) => !!st.atoms_read[a.id]).length;
        return {
          ...pt,
          total_atoms: ptAtoms.length,
          done_atoms: doneAtoms,
        };
      });

      const activityUnits = computeActivityUnits(st);
      const unlockLevel = computeUnlockLevel(st);

      return {
        backend: this.kv.backendName,
        prefs: st.prefs,
        activity_units: activityUnits,
        unlock_level: unlockLevel,
        current_week: curWeekObj,
        total_atoms: totalAtoms,
        read_atoms_count: readAtomsCount,
        weeks_done_count: weeksDoneCount,
        atoms_read: st.atoms_read,
        weeks_completed: st.weeks_completed,
        case_notes: st.case_notes,
        quiz_runs: st.quiz_runs,
        total_answered: totalAnswered,
        accuracy_pct: accuracyPct,
        avg_speed_sec: avgSpeedSec,
        due_atom_ids: dueAtomIds,
        weak_atom_ids: weakAtomIds,
        part_progress: partProgress,
        matrix_items: st.matrix_items,
        custom_priorities: st.custom_priorities || { wsjf: null, rice: null, kano: null },
        axelrod_runs: st.axelrod_runs,
      };
    }
  }

  return {
    createKvAdapter,
    ThinkingGeometryEngine,
    REVIEW_INTERVALS_MIN,
    utf8ByteLength,
    splitUtf8Chunks,
    mergeStates,
    computeUnlockLevel,
    isFeatureUnlocked,
    defaultPrefs,
  };
});
