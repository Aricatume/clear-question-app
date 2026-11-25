/* TGSound — Tactile Haptics + iOS Silent Mode Micro-Audio Engine for 'Геометрия мышления' v4.0
 * Pure UMD module (runs in browser & Node.js unit tests).
 * Keeps iOS Safari / Telegram WKWebView in AVAudioSessionCategoryPlayback via 1.0s silent PCM WAV loop,
 * recovers "interrupted" AudioContext, and triggers subtle crystal-clear geometric cues + Telegram HapticFeedback.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TGSound = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function createSilentWavUrl() {
    if (
      typeof Uint8Array === "undefined" ||
      typeof Blob === "undefined" ||
      typeof URL === "undefined" ||
      !URL.createObjectURL
    ) {
      return null;
    }
    try {
      const sampleRate = 8000;
      const numSamples = 8000; // 1.0s exact digital silence
      const buf = new ArrayBuffer(44 + numSamples);
      const view = new DataView(buf);
      const writeStr = (off, s) => {
        for (let i = 0; i < s.length; i += 1) view.setUint8(off + i, s.charCodeAt(i));
      };
      writeStr(0, "RIFF");
      view.setUint32(4, 36 + numSamples, true);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate, true);
      view.setUint16(32, 1, true);
      view.setUint16(34, 8, true);
      writeStr(36, "data");
      view.setUint32(40, numSamples, true);
      new Uint8Array(buf, 44).fill(0x80);
      return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
    } catch (_) {
      return null;
    }
  }

  let ctx = null;
  let iosAudioEl = null;
  let iosWavUrl = null;
  let iosSessionActive = false;
  let soundEnabled = true;

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && iosAudioEl && !iosAudioEl.paused) {
        try {
          iosAudioEl.pause();
        } catch (_) {}
      }
    });
  }

  function getHaptics() {
    try {
      const tg = root.Telegram && root.Telegram.WebApp;
      return tg && tg.HapticFeedback ? tg.HapticFeedback : null;
    } catch (_) {
      return null;
    }
  }

  function haptic(kind, style) {
    const hf = getHaptics();
    if (!hf) return;
    try {
      if (kind === "selection" && typeof hf.selectionChanged === "function") {
        hf.selectionChanged();
      } else if (kind === "impact" && typeof hf.impactOccurred === "function") {
        hf.impactOccurred(style || "light");
      } else if (kind === "notify" && typeof hf.notificationOccurred === "function") {
        hf.notificationOccurred(style || "success");
      }
    } catch (_) {}
  }

  function enableIOSPlaybackSession(fromGesture) {
    try {
      if (typeof navigator !== "undefined" && navigator.audioSession) {
        if (navigator.audioSession.type !== "playback") {
          navigator.audioSession.type = "playback";
        }
        iosSessionActive = true;
      }
    } catch (_) {}

    if (fromGesture && typeof document !== "undefined" && !document.hidden && typeof Audio !== "undefined") {
      try {
        if (!iosAudioEl) {
          if (!iosWavUrl) iosWavUrl = createSilentWavUrl();
          if (iosWavUrl) {
            const el = new Audio();
            el.src = iosWavUrl;
            el.loop = true;
            el.muted = false;
            el.volume = 1.0;
            el.preload = "auto";
            el.playsInline = true;
            el.setAttribute("playsinline", "");
            el.setAttribute("webkit-playsinline", "");
            el.setAttribute("x-webkit-airplay", "deny");
            iosAudioEl = el;
          }
        }
        if (iosAudioEl && iosAudioEl.paused) {
          const p = iosAudioEl.play();
          if (p && typeof p.then === "function") {
            p.then(() => {
              iosSessionActive = true;
            }).catch(() => {});
          } else {
            iosSessionActive = true;
          }
        }
      } catch (_) {}
    }
    return iosSessionActive;
  }

  function ensureContext() {
    enableIOSPlaybackSession(false);
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state !== "running") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    if (!soundEnabled) return;
    enableIOSPlaybackSession(true);
    const c = ensureContext();
    if (!c) return;
    if (c.state !== "running") {
      c.resume().catch(() => {});
      try {
        const buf = c.createBuffer(1, 1, c.sampleRate);
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        src.start(0);
      } catch (_) {}
    }
  }

  function setEnabled(flag) {
    soundEnabled = Boolean(flag);
    if (!soundEnabled && iosAudioEl && !iosAudioEl.paused) {
      try {
        iosAudioEl.pause();
      } catch (_) {}
    }
    return soundEnabled;
  }

  function isEnabled() {
    return soundEnabled;
  }

  function playTone(freq, dur, gainPeak, wave, force) {
    if (!force && !soundEnabled) return;
    try {
      const c = ensureContext();
      if (!c) return;
      const fire = () => {
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = wave || "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.002, gainPeak || 0.045), now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.09));
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + (dur || 0.09) + 0.02);
      };
      if (c.state !== "running") {
        c.resume().then(fire).catch(() => {});
      } else {
        fire();
      }
    } catch (_) {}
  }

  function playTap() {
    haptic("selection");
    playTone(660, 0.045, 0.025, "sine", false);
  }

  function playCorrect() {
    haptic("notify", "success");
    if (!soundEnabled) return;
    playTone(528, 0.11, 0.048, "sine", false);
    setTimeout(() => playTone(792, 0.16, 0.042, "triangle", false), 85);
  }

  function playWrong() {
    haptic("notify", "warning");
    if (!soundEnabled) return;
    // Soft matte interval (zero harsh buzzer / zero guilt per M05)
    playTone(330, 0.14, 0.036, "sine", false);
    setTimeout(() => playTone(293.66, 0.18, 0.03, "sine", false), 95);
  }

  function playMilestone() {
    haptic("notify", "success");
    if (!soundEnabled) return;
    playTone(528, 0.12, 0.045, "sine", false);
    setTimeout(() => playTone(660, 0.13, 0.045, "sine", false), 90);
    setTimeout(() => playTone(792, 0.22, 0.05, "triangle", false), 185);
  }

  function playTestTone() {
    enableIOSPlaybackSession(true);
    playTone(528, 0.24, 0.065, "sine", true);
    setTimeout(() => playTone(792, 0.26, 0.055, "triangle", true), 120);
  }

  function getDiagnostics() {
    const ctxState = ctx ? ctx.state : "standby";
    const iosTag =
      iosAudioEl && !iosAudioEl.paused
        ? "playback (loop)"
        : iosSessionActive
        ? "playback (api)"
        : "standby";
    return { ctxState, iosTag, soundEnabled };
  }

  return {
    unlock,
    setEnabled,
    isEnabled,
    haptic,
    playTap,
    playCorrect,
    playWrong,
    playMilestone,
    playTestTone,
    getDiagnostics,
  };
});
