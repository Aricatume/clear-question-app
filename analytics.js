/* Privacy-safe Yandex.Metrika SPA tracker + Deep-Link parser + Zero-Backend A/B router for 'Геометрия мышления' v4.0.
 * Counter: 114629390 · webvisor: false (protects private case notes & 2x2 matrices) · 0 PII.
 * Pure UMD module (runs in browser & Node.js unit tests).
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CQAnalytics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const METRIKA_ID = 114629390;
  const AB_STORAGE_KEY = "tg_geom_ab_v1";
  const host = typeof location !== "undefined" ? String(location.hostname || "") : "";
  const isLocal = host === "127.0.0.1" || host === "localhost" || host === "";
  let lastVirtualUrl = "";

  function initMetrika() {
    if (isLocal || typeof window === "undefined" || typeof document === "undefined") return;
    try {
      const w = window;
      w.ym =
        w.ym ||
        function () {
          (w.ym.a = w.ym.a || []).push(arguments);
        };
      w.ym.l = Date.now();

      const tagUrl = "https://mc.yandex.ru/metrika/tag.js?id=114629390";
      let exists = false;
      for (let i = 0; i < document.scripts.length; i += 1) {
        if (document.scripts[i].src === tagUrl) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        const s = document.createElement("script");
        s.async = true;
        s.src = tagUrl;
        const first = document.getElementsByTagName("script")[0];
        if (first && first.parentNode) first.parentNode.insertBefore(s, first);
        else document.head.appendChild(s);
      }

      w.ym(METRIKA_ID, "init", {
        ssr: true,
        webvisor: false,
        clickmap: true,
        ecommerce: "dataLayer",
        referrer: document.referrer,
        url: location.href,
        accurateTrackBounce: true,
        trackLinks: true,
      });
    } catch (_) {}
  }

  function sanitizeParams(paramsObj) {
    if (!paramsObj || typeof paramsObj !== "object") return undefined;
    const out = {};
    const forbidden = /user|username|phone|email|token|initdata|chat_id|text|note|draft/i;
    Object.keys(paramsObj).forEach((k) => {
      if (forbidden.test(k)) return;
      const v = paramsObj[k];
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        out[k] = v;
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = sanitizeParams(v);
      }
    });
    return out;
  }

  function track(goalName, paramsObj) {
    if (isLocal || typeof window === "undefined" || typeof window.ym !== "function") return;
    try {
      const clean = sanitizeParams(paramsObj);
      if (clean && Object.keys(clean).length > 0) {
        window.ym(METRIKA_ID, "reachGoal", String(goalName), clean);
      } else {
        window.ym(METRIKA_ID, "reachGoal", String(goalName));
      }
    } catch (_) {}
  }

  function params(tree) {
    if (isLocal || typeof window === "undefined" || typeof window.ym !== "function") return;
    try {
      const clean = sanitizeParams(tree);
      if (clean && Object.keys(clean).length > 0) {
        window.ym(METRIKA_ID, "params", clean);
      }
    } catch (_) {}
  }

  function screen(virtualHash, title) {
    if (isLocal || typeof window === "undefined" || typeof window.ym !== "function") return;
    try {
      const base = `${location.origin}${location.pathname}`;
      const cleanHash = String(virtualHash || "today").replace(/^#/, "");
      const url = `${base}#${cleanHash}`;
      if (url === lastVirtualUrl) return;
      const prev = lastVirtualUrl || document.referrer;
      lastVirtualUrl = url;
      window.ym(METRIKA_ID, "hit", url, {
        title: String(title || document.title || cleanHash),
        referer: prev,
      });
    } catch (_) {}
  }

  /* Deep-Link parser: supports Web URL query (?week=10&atom=ATOM-...&lab=mill&strategy=nash&quiz=mixed&src=...&ab=A&unlock=all)
   * AND Telegram Mini App startapp (tgWebAppStartParam: wk_10, at_ATOM-..., lab_mill, st_nash, qz_mixed, tab_lab, src_tg, unlock_all).
   */
  function parseDeepLink(searchStr, tgObj) {
    const rawSearch =
      typeof searchStr === "string"
        ? searchStr
        : typeof location !== "undefined"
        ? String(location.search || "")
        : "";
    const qs = new URLSearchParams(rawSearch);
    const tg = tgObj || (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp) || null;

    const out = {
      week: qs.get("week") ? Number(qs.get("week")) : null,
      atomId: qs.get("atom") || null,
      tab: qs.get("tab") || null,
      lab: qs.get("lab") || null,
      strategy: qs.get("strategy") || null,
      quiz: qs.get("quiz") || null,
      src: qs.get("src") || qs.get("utm_source") || "manual_menu",
      abOverride: qs.get("ab") ? String(qs.get("ab")).toUpperCase() : null,
      unlockAll: qs.get("unlock") === "all",
    };

    const startParam =
      qs.get("tgWebAppStartParam") ||
      (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ||
      "";
    if (startParam) {
      const tokens = String(startParam).split("__").filter(Boolean);
      for (const tok of tokens) {
        if (tok.startsWith("wk_") && !out.week) out.week = Number(tok.slice(3)) || null;
        else if (tok.startsWith("at_") && !out.atomId) out.atomId = tok.slice(3);
        else if (tok.startsWith("tab_") && !out.tab) out.tab = tok.slice(4);
        else if (tok.startsWith("lab_") && !out.lab) out.lab = tok.slice(4);
        else if (tok.startsWith("st_") && !out.strategy) out.strategy = tok.slice(3);
        else if (tok.startsWith("qz_") && !out.quiz) out.quiz = tok.slice(3);
        else if (tok.startsWith("src_")) out.src = tok.slice(4);
        else if (tok === "unlock_all") out.unlockAll = true;
      }
    }
    return out;
  }

  function getExperimentVariant(expId, opts) {
    const o = opts || {};
    const ls =
      o.localStorage !== undefined
        ? o.localStorage
        : typeof root.localStorage !== "undefined"
        ? root.localStorage
        : null;
    const override = o.override && (o.override === "A" || o.override === "B") ? o.override : null;
    let map = {};
    if (ls) {
      try {
        map = JSON.parse(ls.getItem(AB_STORAGE_KEY) || "{}") || {};
      } catch (_) {
        map = {};
      }
    }
    let variant = override || map[expId];
    if (variant !== "A" && variant !== "B") {
      const rand = typeof o.randomFn === "function" ? o.randomFn() : Math.random();
      variant = rand < 0.5 ? "A" : "B";
    }
    map[expId] = variant;
    if (ls) {
      try {
        ls.setItem(AB_STORAGE_KEY, JSON.stringify(map));
      } catch (_) {}
    }
    params({ ab_exp: { [expId]: variant } });
    return variant;
  }

  initMetrika();
  return { METRIKA_ID, track, params, screen, parseDeepLink, getExperimentVariant };
});
