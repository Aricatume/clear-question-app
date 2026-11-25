/* Геометрия мышления v4.0 Controller — 1-Screen Smart Flow, Progressive Unlock, Focus Atom Reader, Speed Run Bridges & Precision Instruments */
(function () {
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    const canVer = (v) => typeof tg.isVersionAtLeast !== "function" || tg.isVersionAtLeast(v);
    try { tg.ready(); } catch (_) {}
    try { tg.expand(); } catch (_) {}
    if (canVer("6.1")) {
      try { tg.setHeaderColor("#0b0e13"); } catch (_) {}
      try { tg.setBackgroundColor("#0b0e13"); } catch (_) {}
    }
    if (canVer("7.10")) {
      try { if (typeof tg.setBottomBarColor === "function") tg.setBottomBarColor("#0b0e13"); } catch (_) {}
    }
  }

  // Unlock iOS audio session cleanly on user gestures (capture phase)
  const unlockAudio = () => {
    if (window.TGSound && typeof window.TGSound.unlock === "function") {
      window.TGSound.unlock();
    }
  };
  document.addEventListener("touchend", unlockAudio, { capture: true, passive: true });
  document.addEventListener("click", unlockAudio, { capture: true, passive: true });

  const deepLink =
    window.CQAnalytics && typeof window.CQAnalytics.parseDeepLink === "function"
      ? window.CQAnalytics.parseDeepLink(window.location.search, tg)
      : {
          week: null,
          atomId: null,
          tab: null,
          lab: null,
          strategy: null,
          quiz: null,
          src: "manual_menu",
          abOverride: null,
          unlockAll: false,
        };
  const abVariant =
    window.CQAnalytics && typeof window.CQAnalytics.getExperimentVariant === "function"
      ? window.CQAnalytics.getExperimentVariant("exp_logic_entry_v4", { override: deepLink.abOverride })
      : "A";

  const TRIBUTE_TG_URL = "https://t.me/tribute/app?startapp=dUHt";
  const TRIBUTE_WEB_URL = "https://web.tribute.tg/d/UHt";

  const $ = (id) => document.getElementById(id);
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function trackGoal(name, params) {
    if (window.CQAnalytics && typeof window.CQAnalytics.track === "function") {
      window.CQAnalytics.track(name, params);
    }
  }
  function trackScreen(hash, title) {
    if (window.CQAnalytics && typeof window.CQAnalytics.screen === "function") {
      window.CQAnalytics.screen(hash, title);
    }
  }

  function soundTap() {
    if (window.TGSound) window.TGSound.playTap();
  }
  function soundOk() {
    if (window.TGSound) window.TGSound.playCorrect();
  }
  function soundMiss() {
    if (window.TGSound) window.TGSound.playWrong();
  }

  function openTribute(placement) {
    trackGoal("tribute_click", { source: tg && tg.initData ? "tg" : "web", placement: placement || "general" });
    if (tg && tg.initData && tg.initData.length > 0 && typeof tg.openTelegramLink === "function") {
      try {
        tg.openTelegramLink(TRIBUTE_TG_URL);
        return;
      } catch (_) {}
    }
    window.open(TRIBUTE_WEB_URL, "_blank", "noopener,noreferrer");
  }

  let catalog = null;
  let engine = null;
  let dashboard = null;

  let activeTab = "course";
  let selectedIntent = "warmup"; // warmup | course | lab
  let activePartId = "part-1";
  let activeLabInst = "euler";
  let activeStrategyView = "nash";
  let lastMainTab = "course";
  let expandAllAtoms = false;

  let modalMode = "lock"; // lock | milestone
  let pendingUnlockFn = null;

  // Active Speed Run session
  let quiz = {
    mode: "mixed",
    deck: [],
    idx: 0,
    results: [],
    qStartMs: 0,
    timerId: null,
    answered: false,
  };

  // Interactive Strategy & Onboarding states
  let axelrodPlay = null;
  let nashPlay = null;
  let diabloState = null;
  let mazeAnimId = null;
  let onbState = { stepIdx: 0, pickedIdx: null };

  const ONB_STORAGE_KEY = "tg_onb_done_v1";

  function getOnbDoneSet() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(ONB_STORAGE_KEY) || "[]");
      if (Array.isArray(raw)) return new Set(raw.filter((x) => [0, 1, 2, 3].includes(Number(x))).map(Number));
    } catch (_) {}
    return new Set();
  }

  function markOnbStepDone(idx) {
    try {
      const s = getOnbDoneSet();
      s.add(Number(idx));
      window.localStorage.setItem(ONB_STORAGE_KEY, JSON.stringify(Array.from(s).sort()));
    } catch (_) {}
  }

  const ALL_VIEWS = [
    "view-course",
    "view-week-detail",
    "view-express",
    "view-quiz-run",
    "view-quiz-summary",
    "view-lab",
    "view-strategies",
    "view-rhythm",
    "view-onboarding",
  ];

  const INST_SHORT_NAMES = {
    euler: "Круги Эйлера",
    scales: "Дерево и Весы",
    square: "Квадрат A/E/I/O",
    molecule: "Молекула вывода",
    mill: "Прибор Милля",
    matrix: "7 оптик решений",
    atoms145: "Все 145 атомов",
  };

  function getPrefs() {
    return (dashboard && dashboard.prefs) || {
      sandbox_unlocked: false,
      sound_enabled: true,
      seen_milestones: [],
      preferred_intent: "warmup",
    };
  }

  function getUnlockLevel() {
    return dashboard && typeof dashboard.unlock_level === "number" ? dashboard.unlock_level : 0;
  }

  function isSandbox() {
    return Boolean(getPrefs().sandbox_unlocked);
  }

  function isUnlocked(featureKey) {
    if (window.TGStorage && typeof window.TGStorage.isFeatureUnlocked === "function") {
      return window.TGStorage.isFeatureUnlocked(featureKey, getUnlockLevel());
    }
    return true;
  }

  function syncSoundUI() {
    const enabled = window.TGSound ? window.TGSound.isEnabled() : true;
    const topBtn = $("btn-top-sound");
    if (topBtn) {
      topBtn.textContent = enabled ? "🔊" : "🔇";
      topBtn.classList.toggle("muted", !enabled);
      topBtn.setAttribute("aria-pressed", String(enabled));
    }
    const prefBtn = $("pref-sound-btn");
    if (prefBtn) {
      prefBtn.textContent = enabled ? "Вкл" : "Выкл";
      prefBtn.classList.toggle("on", enabled);
    }
  }

  function syncUnlockUI() {
    const lvl = getUnlockLevel();
    const sandbox = isSandbox();
    const units = dashboard ? Number(dashboard.activity_units || 0) : 0;

    const rLabel = $("rhythm-pill-label");
    if (rLabel) rLabel.textContent = `${units} · Ритм`;

    const stageChip = $("today-stage-chip");
    if (stageChip) {
      stageChip.textContent = sandbox ? "Вся карта открыта" : `Ступень ${lvl + 1} / 4`;
      stageChip.classList.toggle("sandbox", sandbox);
    }

    const hint = $("hero-unlock-hint");
    if (hint) {
      if (sandbox) hint.textContent = "Открыты все 145 атомов, 7 приборов и 3 арены стратегий";
      else if (lvl === 0) hint.textContent = "1 шаг откроет Квадрат суждений, Молекулу вывода и Нэша";
      else if (lvl === 1) hint.textContent = "Ещё 2 шага откроют Индукцию Милля, 7 оптик приоритетов и Аксельрода";
      else if (lvl === 2) hint.textContent = "Ещё 2 шага откроют граф всех 145 атомов и подземелье в тумане войны";
      else hint.textContent = "Открыта вся карта: 145 атомов, 7 приборов и 3 арены";
    }

    const heroToggle = $("btn-hero-unlock-toggle");
    if (heroToggle) {
      heroToggle.textContent = sandbox ? "↺ По шагам" : "🔓 Открыть всю карту";
      heroToggle.classList.toggle("hidden", !sandbox && lvl >= 3);
    }

    const labToggle = $("btn-lab-unlock-toggle");
    if (labToggle) {
      labToggle.textContent = sandbox ? "↺ По шагам" : "🔓 Все 7";
      labToggle.classList.toggle("hidden", !sandbox && lvl >= 3);
    }

    const stratToggle = $("btn-strat-unlock-toggle");
    if (stratToggle) {
      stratToggle.textContent = sandbox ? "↺ По шагам" : "🔓 Все 3";
      stratToggle.classList.toggle("hidden", !sandbox && lvl >= 3);
    }

    const prefBtn = $("pref-sandbox-btn");
    const prefSub = $("pref-sandbox-sub");
    if (prefBtn) {
      prefBtn.textContent = sandbox ? "Всё открыто" : "По шагам";
      prefBtn.classList.toggle("on", sandbox);
    }
    if (prefSub) {
      prefSub.textContent = sandbox
        ? "Свободный доступ ко всем 145 атомам, 7 приборам и 3 аренам"
        : `По шагам · сейчас ступень ${lvl + 1} из 4`;
    }
  }

  async function toggleSandboxMode(sourceTag) {
    soundTap();
    const next = !isSandbox();
    await engine.updatePrefs({ sandbox_unlocked: next });
    trackGoal("sandbox_unlock_toggle", { unlocked: next, source: sourceTag });
    await refreshDashboard();
    if (activeTab === "course") renderCourseTab();
    else if (activeTab === "express") renderExpressTab();
    else if (activeTab === "lab") renderLabTab();
    else if (activeTab === "strategies") renderStrategiesTab();
    if (!$("view-rhythm").classList.contains("hidden")) renderRhythmView();
  }

  // -------- DUAL-MODE PROGRESSIVE UNLOCK / MILESTONE MODAL --------

  function copyForLockedFeature(featureKey) {
    if (["part-2", "part-3", "square", "molecule", "nash"].includes(featureKey)) {
      return {
        kicker: "Ступень 2 / 4 · Простой вход",
        title: "Откроется после 1 короткого шага",
        body: "Реши 1 быструю разминку или освой 1 атом — и откроются Логический квадрат, Молекула вывода, Части II–III и Равновесие Нэша. Либо открой всю карту прямо сейчас в 1 клик.",
      };
    }
    if (["part-4", "part-5", "mill", "matrix", "axelrod"].includes(featureKey)) {
      return {
        kicker: "Ступень 3 / 4 · Причины и решения",
        title: "Откроется на 3-й ступени",
        body: "Здесь чёрный ящик причинности Милля, 7 оптик приоритезации (2×2, TOC, WSJF, EVPI, RICE, Кано), турнир Аксельрода и Части IV–V. Можно идти по шагам или открыть всё сразу.",
      };
    }
    return {
      kicker: "Ступень 4 / 4 · Полная топология",
      title: "Вершина карты · 145 атомов и Подземелье ★",
      body: "Здесь живой граф загадок по всем 145 атомам, процедурное подземелье в тумане войны (залы, маяки обзора, скоростной путь) и 5 Гарвардских кейсов. Вся карта доступна бесплатно в 1 клик.",
    };
  }

  function openLockModal(featureKey, onUnlockedFn) {
    soundTap();
    const copy = copyForLockedFeature(featureKey);
    modalMode = "lock";
    pendingUnlockFn = typeof onUnlockedFn === "function" ? onUnlockedFn : null;
    $("unlock-modal-kicker").textContent = copy.kicker;
    $("unlock-modal-title").textContent = copy.title;
    $("unlock-modal-body").textContent = copy.body;
    $("unlock-tribute-box").classList.add("hidden");
    $("btn-unlock-primary").textContent = "⚡ Пройти быструю разминку (1 мин)";
    $("btn-unlock-all").classList.remove("hidden");
    $("btn-unlock-close").textContent = "Позже";
    $("unlock-modal").classList.remove("hidden");
    trackGoal("lock_modal_shown", { feature: featureKey, level: getUnlockLevel() });
  }

  function openMilestoneModal(level) {
    if (window.TGSound) window.TGSound.playMilestone();
    modalMode = "milestone";
    pendingUnlockFn = null;
    let kicker = "Ступень 2 / 4 открыта";
    let title = "✨ Открыты Квадрат суждений, Молекула и Нэш";
    let body = "Первый шаг сделан — теперь доступны Части II–III курса, приборы «Логический квадрат», «Молекула вывода» и арена «Равновесие Нэша 2×2».";
    if (level === 2) {
      kicker = "Ступень 3 / 4 открыта";
      title = "🔬 Открыты Прибор Милля, 7 оптик и Аксельрод";
      body = "Теперь доступны методы поиска причин Милля, компас из 7 моделей приоритезации, Части IV–V и слепой турнир Аксельрода.";
    } else if (level >= 3) {
      kicker = "Ступень 4 / 4 · Вся карта открыта";
      title = "❖ Открыта вся Геометрия мышления";
      body = "Открыты все 145 атомов с живым графом топологии, процедурное подземелье в тумане войны и все 5 Гарвардских кейсов.";
    }
    $("unlock-modal-kicker").textContent = kicker;
    $("unlock-modal-title").textContent = title;
    $("unlock-modal-body").textContent = body;
    $("unlock-tribute-box").classList.remove("hidden");
    $("btn-unlock-primary").textContent = "Отлично, идём дальше";
    $("btn-unlock-all").classList.add("hidden");
    $("btn-unlock-close").textContent = "Закрыть";
    $("unlock-modal").classList.remove("hidden");
    trackGoal("milestone_modal_shown", { level });
  }

  function closeUnlockModal() {
    $("unlock-modal").classList.add("hidden");
    pendingUnlockFn = null;
  }

  async function checkMilestoneAfterProgress() {
    if (!dashboard || isSandbox()) return;
    const lvl = getUnlockLevel();
    const seen = Array.isArray(getPrefs().seen_milestones) ? getPrefs().seen_milestones : [];
    if (lvl >= 1 && !seen.includes(lvl)) {
      await engine.markMilestoneSeen(lvl);
      await refreshDashboard();
      openMilestoneModal(lvl);
    }
  }

  function stopTimers() {
    if (quiz.timerId) {
      clearInterval(quiz.timerId);
      quiz.timerId = null;
    }
    if (mazeAnimId) {
      clearInterval(mazeAnimId);
      mazeAnimId = null;
    }
  }

  function showView(viewId) {
    stopTimers();
    ALL_VIEWS.forEach((vid) => {
      const el = $(vid);
      if (el) el.classList.toggle("hidden", vid !== viewId);
    });
    const hideNav =
      viewId === "view-quiz-run" ||
      viewId === "view-quiz-summary" ||
      viewId === "view-rhythm" ||
      viewId === "view-onboarding";
    $("main-tabs").classList.toggle("hidden", hideNav);
    $("app-support-footer").classList.toggle(
      "hidden",
      viewId === "view-quiz-run" || viewId === "view-quiz-summary" || viewId === "view-onboarding"
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function syncOnboardingUI() {
    const doneSet = getOnbDoneSet();
    const doneCount = doneSet.size;
    const badge = $("onboarding-badge");
    const pill = $("btn-open-onboarding");
    if (badge) badge.textContent = `${doneCount}/4`;
    if (pill) pill.classList.toggle("done", doneCount >= 4);

    const card = $("onboarding-entry-card");
    if (!card) return;
    if (doneCount >= 4) {
      card.className = "onboarding-banner-card compact";
      card.innerHTML = `
        <span style="font-size:12.5px;color:#dcfaec;"><strong>✓ База пройдена (4/4)</strong> · Понятия, Квадрат, Причины, Системы</span>
        <button id="btn-start-onb-banner" type="button" class="btn-chip">Повторить ›</button>
      `;
    } else {
      let nextStep = 0;
      for (let i = 0; i < 4; i += 1) {
        if (!doneSet.has(i)) {
          nextStep = i;
          break;
        }
      }
      card.className = "onboarding-banner-card";
      card.innerHTML = `
        <div class="card-meta-row" style="margin-bottom:4px;">
          <span class="badge-pill sand">🎓 Вводный практикум · База за 2 минуты</span>
          <span>${doneCount} / 4 шагов</span>
        </div>
        <h3 class="card-title" style="font-size:15.5px;margin-bottom:4px;">С чего начать: 4 живые опоры ясного мышления</h3>
        <p class="card-desc" style="font-size:12.8px;margin-bottom:10px;">На примерах из работы и жизни разберём, почему люди спорят об одном слове, как 1 факт рушит «всегда!», как искать истинную причину и где бить в узкое горлышко.</p>
        <button id="btn-start-onb-banner" type="button" class="btn-tribute" style="width:100%;">
          ${doneCount > 0 ? `▶ Продолжить практикум (Шаг ${nextStep + 1} из 4)` : "▶ Пройти вводный практикум · 2 минуты"}
        </button>
      `;
    }
    const startBtn = $("btn-start-onb-banner");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        soundTap();
        let startIdx = 0;
        if (doneCount < 4) {
          for (let i = 0; i < 4; i += 1) {
            if (!doneSet.has(i)) {
              startIdx = i;
              break;
            }
          }
        }
        openOnboardingView(startIdx);
      });
    }
  }

  function openOnboardingView(stepIdx = 0) {
    if (!window.TGGuide || !Array.isArray(window.TGGuide.ONBOARDING_STEPS)) return;
    const steps = window.TGGuide.ONBOARDING_STEPS;
    onbState = {
      stepIdx: Math.max(0, Math.min(steps.length - 1, Number(stepIdx) || 0)),
      pickedIdx: null,
    };
    trackScreen("onboarding", "Вводный практикум · База");
    trackGoal("onboarding_open", { step: onbState.stepIdx + 1 });
    renderOnboardingStep();
    showView("view-onboarding");
  }

  function renderOnboardingStep() {
    const steps = window.TGGuide.ONBOARDING_STEPS;
    const doneSet = getOnbDoneSet();
    const sIdx = onbState.stepIdx;
    const step = steps[sIdx];
    const stepLabels = ["01 Понятия", "02 Квадрат", "03 Причины", "04 Системы"];

    const pText = $("onboarding-progress-text");
    if (pText) pText.textContent = `Шаг ${sIdx + 1} из ${steps.length} · освоено ${doneSet.size}/4`;

    const stepPillsHtml = stepLabels
      .map((lbl, idx) => {
        const cls = [
          "onb-step-pill",
          idx === sIdx ? "active" : "",
          doneSet.has(idx) ? "done" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<button type="button" class="${cls}" data-onb-step="${idx}">${doneSet.has(idx) ? "✓ " : ""}${lbl}</button>`;
      })
      .join("");

    const optsHtml = step.options
      .map((opt, oi) => {
        let cls = "quiz-opt onb-opt";
        if (onbState.pickedIdx !== null) {
          if (oi === step.correctIdx) cls += " correct";
          else if (oi === onbState.pickedIdx) cls += " wrong";
        }
        return `<button type="button" class="${cls}" data-oi="${oi}">${esc(opt)}</button>`;
      })
      .join("");

    const answered = onbState.pickedIdx !== null;
    const isHit = onbState.pickedIdx === step.correctIdx;

    $("onboarding-body").innerHTML = `
      <div class="onb-step-pills">${stepPillsHtml}</div>
      <div class="card blueprint-hero">
        <span class="eyebrow">${esc(step.badge)}</span>
        <h1 class="page-title" style="font-size:19px;margin:3px 0 8px;">${esc(step.title)}</h1>

        <div class="atom-box anti" style="margin-bottom:8px;">
          <strong>Живая ситуация</strong>
          ${esc(step.problem)}
        </div>

        <div class="atom-box ok" style="margin-bottom:10px;">
          <strong>Как работает инструмент</strong>
          ${esc(step.rule)}
        </div>

        <div class="svg-frame" style="margin-bottom:12px;">${step.svg}</div>

        <div class="field-label" style="margin-bottom:7px;">Проверь на практике: ${esc(step.question)}</div>
        <div class="quiz-opts">${optsHtml}</div>

        ${
          answered
            ? `<div class="quiz-explain" style="margin-top:12px;">
                 <strong style="display:block;margin-bottom:4px;color:${isHit ? "var(--accent)" : "var(--sand)"};">
                   ${isHit ? "Верный ход ✓" : "Посмотри на зелёный вариант выше — именно он бьёт в корень"}
                 </strong>
                 ${esc(step.takeaway)}
               </div>
               <div class="two-col" style="margin-top:12px;">
                 <button type="button" class="btn-secondary" id="btn-onb-jump">${esc(step.jumpLabel)}</button>
                 <button type="button" class="btn-primary" id="btn-onb-next">${
                   sIdx + 1 < steps.length ? `Шаг ${sIdx + 2} из 4 →` : "✓ На главную"
                 }</button>
               </div>`
            : ""
        }
      </div>
    `;

    $("onboarding-body").querySelectorAll("[data-onb-step]").forEach((b) => {
      b.addEventListener("click", () => {
        soundTap();
        onbState.stepIdx = Number(b.getAttribute("data-onb-step"));
        onbState.pickedIdx = null;
        renderOnboardingStep();
      });
    });

    $("onboarding-body").querySelectorAll(".onb-opt").forEach((b) => {
      b.addEventListener("click", () => {
        const oi = Number(b.getAttribute("data-oi"));
        onbState.pickedIdx = oi;
        markOnbStepDone(sIdx);
        syncOnboardingUI();
        if (oi === step.correctIdx) soundOk();
        else soundMiss();
        trackGoal("onboarding_step_answer", { step: sIdx + 1, correct: oi === step.correctIdx });
        renderOnboardingStep();
      });
    });

    const nextBtn = $("btn-onb-next");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        soundTap();
        if (sIdx + 1 < steps.length) {
          onbState.stepIdx = sIdx + 1;
          onbState.pickedIdx = null;
          renderOnboardingStep();
          window.scrollTo({ top: 0, behavior: "instant" });
        } else {
          switchTab("course");
        }
      });
    }

    const jumpBtn = $("btn-onb-jump");
    if (jumpBtn) {
      jumpBtn.addEventListener("click", async () => {
        soundTap();
        const jt = step.jumpTarget || {};
        if (jt.tab === "lab" && jt.inst) {
          if (!isUnlocked(jt.inst)) {
            await engine.updatePrefs({ sandbox_unlocked: true });
            await refreshDashboard();
          }
          activeLabInst = jt.inst;
          switchTab("lab");
        } else if (jt.tab === "strategies" && jt.sview) {
          if (!isUnlocked(jt.sview)) {
            await engine.updatePrefs({ sandbox_unlocked: true });
            await refreshDashboard();
          }
          activeStrategyView = jt.sview;
          switchTab("strategies");
        } else {
          switchTab("course");
        }
      });
    }
  }

  async function refreshDashboard() {
    dashboard = await engine.getDashboard();
    if (dashboard.prefs) {
      if (window.TGSound && typeof window.TGSound.setEnabled === "function") {
        window.TGSound.setEnabled(dashboard.prefs.sound_enabled !== false);
      }
    }
    const due = (dashboard.due_atom_ids || []).length + (dashboard.weak_atom_ids || []).length;
    const badge = $("rhythm-badge");
    if (due > 0) {
      badge.textContent = String(due);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
    syncSoundUI();
    syncUnlockUI();
    syncOnboardingUI();
  }

  function switchTab(tabName) {
    activeTab = tabName;
    lastMainTab = tabName;
    document.querySelectorAll("#main-tabs .tab").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tabName);
    });
    trackScreen(tabName, `Геометрия мышления · ${tabName}`);
    if (tabName === "course") {
      renderCourseTab();
      showView("view-course");
    } else if (tabName === "express") {
      renderExpressTab();
      showView("view-express");
    } else if (tabName === "lab") {
      renderLabTab();
      showView("view-lab");
    } else if (tabName === "strategies") {
      renderStrategiesTab();
      showView("view-strategies");
    }
  }

  // ==================== TAB 1: 1-SCREEN SMART ENTRY + COLLAPSED 26-WEEK DRAWER ====================

  function renderTodayHero() {
    const cw = dashboard.current_week;
    const instId = isUnlocked(cw.instrument_id) ? cw.instrument_id : "euler";
    const instLabel = INST_SHORT_NAMES[instId] || "Круги Эйлера";

    const nTasks = abVariant === "B" ? 5 : 3;
    const wSub = $("ip-warmup-sub");
    if (wSub) wSub.textContent = nTasks === 5 ? "1,5 мин · 5 задач" : "1 мин · 3 задачи";
    $("ip-course-sub").textContent = `Неделя ${cw.week} / 26`;
    $("ip-lab-sub").textContent = instLabel;

    document.querySelectorAll(".intent-pill").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-intent") === selectedIntent);
    });

    if (selectedIntent === "warmup") {
      const titlePlural = nTasks === 5 ? "5 живых задач" : "3 живые задачи";
      const ctaPlural = nTasks === 5 ? "5 задач" : "3 задачи";
      $("hero-rec-tag").textContent = "Быстрый вход · 1 касание";
      $("hero-rec-title").textContent = `⚡ Логическая разминка · ${titlePlural}`;
      $("hero-rec-desc").textContent =
        "Проверь глаз на подменах понятий, обращениях суждений и скрытых разрывах в выводах за 1 минуту.";
      $("btn-hero-start").textContent = `▶ Начать разминку · ${ctaPlural}`;
    } else if (selectedIntent === "course") {
      const readInWk = cw.atom_ids.filter((id) => !!dashboard.atoms_read[id]).length;
      $("hero-rec-tag").textContent = `Глава ${cw.week} из 26 · освоен ${readInWk}/${cw.atom_count}`;
      $("hero-rec-title").textContent = `📖 ${cw.title}`;
      $("hero-rec-desc").textContent =
        "Фокус-чтение по 1 атому за раз: тезис, точная цитата Челпанова, антипример и живые связи без длинной простыни.";
      $("btn-hero-start").textContent = `▶ Открыть Неделю ${cw.week} →`;
    } else {
      $("hero-rec-tag").textContent = `Интерактивный стенд к Главе ${cw.week}`;
      $("hero-rec-title").textContent = `🧪 Прибор: ${instLabel}`;
      $("hero-rec-desc").textContent =
        "Потрогай конструкцию руками на наглядной геометрии и живых примерах — без сухой теории.";
      $("btn-hero-start").textContent = `▶ Запустить «${instLabel}» →`;
    }

    // Due / weak review banner
    const reviewIds = Array.from(new Set([...(dashboard.weak_atom_ids || []), ...(dashboard.due_atom_ids || [])]));
    const dBanner = $("due-review-banner");
    if (reviewIds.length > 0) {
      dBanner.innerHTML = `
        <span>🔁 Пора освежить <strong>${reviewIds.length}</strong> ${reviewIds.length === 1 ? "узел" : "узла"} по кривой памяти</span>
        <button id="btn-due-start" type="button" class="btn-chip">▶ Освежить</button>
      `;
      dBanner.classList.remove("hidden");
      $("btn-due-start").addEventListener("click", () => {
        soundTap();
        startSpeedRun({ mode: "review", count: Math.min(5, Math.max(3, reviewIds.length)) });
      });
    } else {
      dBanner.classList.add("hidden");
    }

    const dBadge = $("curriculum-drawer-badge");
    if (dBadge) {
      dBadge.textContent = `${dashboard.read_atoms_count} / ${dashboard.total_atoms} атомов`;
    }
    syncUnlockUI();
    syncOnboardingUI();
  }

  function renderCourseTab() {
    renderTodayHero();

    if (!isUnlocked(activePartId)) activePartId = "part-1";

    // 5 Parts horizontal scroll ribbon
    $("part-chips").innerHTML = catalog.parts
      .map((pt) => {
        const unlocked = isUnlocked(pt.id);
        return `<button type="button" class="filter-chip ${pt.id === activePartId ? "active" : ""}${unlocked ? "" : " is-locked"}" data-pid="${pt.id}">${unlocked ? "" : "🔒 "}Ч.${pt.order} · ${esc(pt.weeks_label)}</button>`;
      })
      .join("");
    $("part-chips").querySelectorAll(".filter-chip").forEach((b) => {
      b.addEventListener("click", () => {
        const targetPid = b.getAttribute("data-pid");
        if (!isUnlocked(targetPid)) {
          openLockModal(targetPid, () => {
            activePartId = targetPid;
            renderCourseTab();
          });
          return;
        }
        soundTap();
        activePartId = targetPid;
        renderCourseTab();
      });
    });

    const curPart = catalog.parts.find((p) => p.id === activePartId) || catalog.parts[0];
    $("part-intro-card").innerHTML = `
      <span class="eyebrow">${esc(curPart.weeks_label)} · О чём этот блок</span>
      <h3 class="card-title">${esc(curPart.title)}</h3>
      <p class="card-desc" style="margin-top:5px;">${esc(curPart.modern_intro)}</p>
    `;

    // Weeks in selected Part
    const partWeeks = catalog.weeks.filter((w) => w.part_id === curPart.id);
    $("weeks-list").innerHTML = partWeeks
      .map((w) => {
        const readInWk = w.atom_ids.filter((id) => !!dashboard.atoms_read[id]).length;
        const done = !!dashboard.weeks_completed[String(w.week)] || (w.atom_count > 0 && readInWk === w.atom_count);
        const wPct = Math.round((readInWk / Math.max(1, w.atom_count)) * 100);
        return `
          <div class="card clickable-card wk-card" data-wk="${w.week}">
            <div class="card-meta-row">
              <span class="badge-pill ${done ? "" : "sky"}">Неделя ${w.week} · ${esc(w.pages)}</span>
              <span>${done ? "✓ Освоено" : `${readInWk}/${w.atom_count} атомов · ${w.question_count} вопр.`}</span>
            </div>
            <h3 class="card-title">${esc(w.title)}</h3>
            <div class="progress-track"><div class="progress-fill" style="width:${wPct}%"></div></div>
          </div>
        `;
      })
      .join("");
    $("weeks-list").querySelectorAll(".wk-card").forEach((el) => {
      el.addEventListener("click", () => {
        soundTap();
        openWeekDetail(Number(el.getAttribute("data-wk")));
      });
    });

    // Harvard Case Study inside tidy collapsible drawer (respecting Stage 3 or Sandbox)
    const hc = curPart.harvard_case;
    const casesUnlocked = isUnlocked("harvard_cases");
    if (!casesUnlocked) {
      $("harvard-case-slot").innerHTML = `
        <div class="card clickable-card is-locked" id="btn-locked-case">
          <div class="card-meta-row">
            <span class="badge-pill sand">🔒 Гарвардский практикум · Часть ${curPart.order}</span>
            <span>Открыть ›</span>
          </div>
          <h3 class="card-title">${esc(hc.title)}</h3>
          <p class="muted-small">Прикладной разбор управленческого кейса по инструментам части.</p>
        </div>
      `;
      $("btn-locked-case").addEventListener("click", () => {
        openLockModal("harvard_cases", () => renderCourseTab());
      });
    } else {
      const savedNote = dashboard.case_notes[curPart.id]?.text || "";
      const qList = hc.questions.map((q) => `<li>${esc(q)}</li>`).join("");
      $("harvard-case-slot").innerHTML = `
        <details class="drawer-card">
          <summary class="drawer-summary">
            <span>💼 ${esc(hc.title)}</span>
            <span class="drawer-badge">${savedNote ? "есть разбор ✓" : "практикум"}</span>
          </summary>
          <div class="drawer-body">
            <div class="case-card" style="padding:13px;">
              <p class="card-desc">${esc(hc.scenario)}</p>
              <div class="field-label">Вопросы для разбора</div>
              <ol class="case-list">${qList}</ol>
              <textarea id="case-note-input" class="text-area" rows="3" maxlength="600" placeholder="Запиши свой структурный разбор (хранится только у тебя на устройстве)...">${esc(savedNote)}</textarea>
              <div class="two-col" style="margin-top:8px;">
                <button type="button" class="btn-primary" id="btn-save-case-note">Сохранить разбор</button>
                <button type="button" class="btn-secondary" id="btn-toggle-case-synth">Эталонный синтез</button>
              </div>
              <p id="case-save-msg" class="muted-small hidden" style="margin-top:7px;color:var(--accent);">Разбор сохранён локально ✓</p>
              <div id="case-synth-box" class="quiz-explain hidden">${esc(hc.synthesis)}</div>
            </div>
          </div>
        </details>
      `;
      $("btn-save-case-note").addEventListener("click", async () => {
        soundOk();
        await engine.saveCaseNote(curPart.id, $("case-note-input").value);
        await refreshDashboard();
        $("case-save-msg").classList.remove("hidden");
      });
      $("btn-toggle-case-synth").addEventListener("click", () => {
        soundTap();
        $("case-synth-box").classList.toggle("hidden");
      });
    }
  }

  // ==================== FOCUS ATOM READER + LIVE SEMANTIC TOPOLOGY ====================

  async function openWeekDetail(weekNum, focusAtomId) {
    const wk = engine.weeksByNum[Number(weekNum)];
    if (!wk) return;
    trackScreen(`week-${wk.week}`, `Неделя ${wk.week} · ${wk.title}`);
    trackGoal("week_open", { week: wk.week, part: wk.part_id });
    await engine.setCurrentWeek(wk.week);
    await refreshDashboard();
    if (isUnlocked(wk.part_id)) activePartId = wk.part_id;

    const atoms = wk.atom_ids.map((id) => engine.atomsById[id]).filter(Boolean);
    const firstUnreadIdx = atoms.findIndex((a) => !dashboard.atoms_read[a.id]);
    const defaultOpenId = focusAtomId || (atoms[firstUnreadIdx >= 0 ? firstUnreadIdx : 0]?.id ?? null);

    const atomsHtml = atoms
      .map((a, idx) => {
        const isRead = !!dashboard.atoms_read[a.id];
        const isOpen = expandAllAtoms || a.id === defaultOpenId;
        const depsHtml = (a.depends_on || [])
          .map((did) => {
            const target = engine.atomsById[did];
            if (!target) return "";
            return `<button type="button" class="topo-link" data-jump-atom="${did}" data-jump-wk="${target.chapter_num}">← Опора: ${esc(target.title.slice(0, 36))}</button>`;
          })
          .join("");
        const contsHtml = (a.contrasts_with || [])
          .map((cid) => {
            const target = engine.atomsById[cid];
            if (!target) return "";
            return `<button type="button" class="topo-link contrast" data-jump-atom="${cid}" data-jump-wk="${target.chapter_num}">↔ Контраст: ${esc(target.title.slice(0, 36))}</button>`;
          })
          .join("");
        const bridgesHtml = (a.bridges || [])
          .map(
            (b) =>
              `<div class="atom-box bound"><strong>Мост в практику · ${esc(b.domain)}</strong>${esc(b.scenario)}<br/><em>Верный ход:</em> ${esc(b.correct_move)}</div>`
          )
          .join("");

        return `
          <details class="atom-accordion" id="atom-card-${esc(a.id)}" ${isOpen ? "open" : ""}>
            <summary class="atom-summary">
              <div class="atom-sum-left">
                <div class="atom-sum-kicker ${isRead ? "done" : ""}">${isRead ? "✓ Освоен" : `Узел ${idx + 1} из ${atoms.length}`} · с. ${esc(a.pages)}</div>
                <div class="atom-sum-title">${esc(a.title)}</div>
                <div class="atom-sum-preview">${esc(a.core_thesis)}</div>
              </div>
              <span class="atom-sum-chevron" aria-hidden="true">▾</span>
            </summary>
            <div class="atom-body">
              <p class="atom-thesis">${esc(a.core_thesis)}</p>
              ${a.exact_quote ? `<blockquote class="atom-quote">«${esc(a.exact_quote)}» — Г. И. Челпанов</blockquote>` : ""}
              <div class="atom-grid">
                ${a.classic_example ? `<div class="atom-box ok"><strong>Ясный пример</strong>${esc(a.classic_example)}</div>` : ""}
                ${a.anti_example ? `<div class="atom-box anti"><strong>Где ломается (антипример)</strong>${esc(a.anti_example)}</div>` : ""}
                ${a.epistemic_boundary ? `<div class="atom-box bound"><strong>Граница правила</strong>${esc(a.epistemic_boundary)}</div>` : ""}
                ${bridgesHtml}
              </div>
              ${depsHtml || contsHtml ? `<div class="field-label" style="margin:6px 0 4px;">Связи с другими узлами</div><div class="topo-row">${depsHtml}${contsHtml}</div>` : ""}
              <div class="atom-actions-row">
                <button type="button" class="btn-chip check-atom-quiz-btn" data-aid="${esc(a.id)}" data-wk="${wk.week}">⚡ Проверить на задаче</button>
                <button type="button" class="btn-chip toggle-atom-btn" data-aid="${esc(a.id)}">${isRead ? "✓ Освоен" : "Отметить освоенным"}</button>
              </div>
            </div>
          </details>
        `;
      })
      .join("");

    const qsHtml = (wk.questions || [])
      .map(
        (q) => `
          <details class="q-item">
            <summary>${q.num}. ${esc(q.text)}</summary>
            <div class="q-answer">${esc(q.answer)}</div>
          </details>
        `
      )
      .join("");

    const instName = INST_SHORT_NAMES[wk.instrument_id] || "Прибор главы";

    $("week-detail-body").innerHTML = `
      <div class="card blueprint-hero" style="margin-bottom:12px;">
        <span class="eyebrow">Неделя ${wk.week} из 26 · с. ${esc(wk.pages)}</span>
        <h2 class="card-title" style="font-size:19px;">${esc(wk.heading)}</h2>
        <p class="card-desc" style="margin-top:4px;">Узлов смысла: ${wk.atom_count} · контрольных вопросов: ${wk.question_count}</p>
        <div class="two-col" style="margin-top:12px;">
          <button type="button" class="btn-primary" id="btn-wk-speedrun">⚡ Тренировка главы (5)</button>
          <button type="button" class="btn-secondary" id="btn-wk-lab">🧪 ${esc(instName)}</button>
        </div>
      </div>

      <div class="card-meta-row" style="margin:12px 0 8px;">
        <span class="field-label" style="margin:0;">Ключевые узлы главы (${atoms.length})</span>
        <button type="button" class="link-btn" id="btn-toggle-all-atoms" style="font-size:12px;">${expandAllAtoms ? "Свернуть" : "Развернуть все"}</button>
      </div>
      <div class="card-stack">${atomsHtml}</div>

      <details class="drawer-card" style="margin-top:14px;">
        <summary class="drawer-summary">
          <span>❓ Контрольные вопросы Г. И. Челпанова</span>
          <span class="drawer-badge">${wk.question_count} вопр.</span>
        </summary>
        <div class="drawer-body">
          <div class="card-stack" style="margin-top:4px;">${qsHtml}</div>
        </div>
      </details>

      <div class="card" style="margin-top:14px;">
        <button type="button" class="btn-primary" id="btn-wk-complete">✓ Завершить Неделю ${wk.week} → Неделя ${Math.min(26, wk.week + 1)}</button>
      </div>
    `;

    $("btn-toggle-all-atoms").addEventListener("click", () => {
      soundTap();
      expandAllAtoms = !expandAllAtoms;
      $("week-detail-body").querySelectorAll(".atom-accordion").forEach((el, idx) => {
        el.open = expandAllAtoms ? true : idx === (firstUnreadIdx >= 0 ? firstUnreadIdx : 0);
      });
      $("btn-toggle-all-atoms").textContent = expandAllAtoms ? "Свернуть" : "Развернуть все";
    });

    $("btn-wk-speedrun").addEventListener("click", () => {
      soundTap();
      startSpeedRun({ mode: "week", chapterNum: wk.week, count: 5 });
    });
    $("btn-wk-lab").addEventListener("click", () => {
      const targetInst = wk.instrument_id || "euler";
      if (!isUnlocked(targetInst)) {
        openLockModal(targetInst, () => {
          activeLabInst = targetInst;
          switchTab("lab");
        });
        return;
      }
      soundTap();
      activeLabInst = targetInst;
      switchTab("lab");
    });
    $("btn-wk-complete").addEventListener("click", async () => {
      soundOk();
      const nextWk = await engine.markWeekCompleted(wk.week);
      await refreshDashboard();
      await checkMilestoneAfterProgress();
      if (nextWk !== wk.week) openWeekDetail(nextWk);
      else switchTab("course");
    });

    $("week-detail-body").querySelectorAll(".toggle-atom-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const aid = btn.getAttribute("data-aid");
        const nowRead = await engine.toggleAtomRead(aid);
        if (nowRead) soundOk();
        else soundTap();
        btn.textContent = nowRead ? "✓ Освоен" : "Отметить освоенным";
        const acc = $(`atom-card-${aid}`);
        if (acc) {
          const kicker = acc.querySelector(".atom-sum-kicker");
          if (kicker) kicker.classList.toggle("done", nowRead);
        }
        await refreshDashboard();
        if (nowRead) await checkMilestoneAfterProgress();
      });
    });

    $("week-detail-body").querySelectorAll(".check-atom-quiz-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        soundTap();
        const aid = btn.getAttribute("data-aid");
        const wNum = Number(btn.getAttribute("data-wk"));
        startSpeedRun({ mode: "review", customAtomIds: [aid], chapterNum: wNum, count: 3 });
      });
    });

    $("week-detail-body").querySelectorAll(".topo-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        soundTap();
        const targetWk = Number(btn.getAttribute("data-jump-wk"));
        const targetAtom = btn.getAttribute("data-jump-atom");
        openWeekDetail(targetWk, targetAtom);
      });
    });

    showView("view-week-detail");

    if (focusAtomId) {
      const targetEl = $(`atom-card-${focusAtomId}`);
      if (targetEl) {
        targetEl.open = true;
        targetEl.classList.add("highlight-pulse");
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  // ==================== TAB 2: EXPRESS SPEED RUN (365+ POOL + SOURCE BRIDGES) ====================

  function renderExpressTab() {
    const dueCount = (dashboard.due_atom_ids || []).length + (dashboard.weak_atom_ids || []).length;
    $("btn-start-review").textContent = dueCount > 0 ? `↻ Слабые узлы (${dueCount})` : "↻ Повторение";

    $("express-stats-bar").innerHTML = `
      <div class="stat-box">
        <div class="stat-num">${dashboard.accuracy_pct != null ? dashboard.accuracy_pct + "%" : "—"}</div>
        <div class="stat-lbl">Точность</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${dashboard.avg_speed_sec != null ? dashboard.avg_speed_sec + "с" : "—"}</div>
        <div class="stat-lbl">Ср. скорость</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${dashboard.total_answered}</div>
        <div class="stat-lbl">Решено задач</div>
      </div>
    `;

    $("express-part-list").innerHTML = catalog.parts
      .map((pt) => {
        const unlocked = isUnlocked(pt.id);
        return `
          <div class="card clickable-card exp-part-card${unlocked ? "" : " is-locked"}" data-pid="${pt.id}">
            <div class="card-meta-row">
              <span class="badge-pill sky">${unlocked ? "" : "🔒 "}Часть ${pt.order} · ${esc(pt.weeks_label)}</span>
              <span>${unlocked ? "⚡ 5 задач →" : "Открыть ›"}</span>
            </div>
            <h3 class="card-title">${esc(pt.short_title)}</h3>
          </div>
        `;
      })
      .join("");
    $("express-part-list").querySelectorAll(".exp-part-card").forEach((el) => {
      el.addEventListener("click", () => {
        const pid = el.getAttribute("data-pid");
        if (!isUnlocked(pid)) {
          openLockModal(pid, () => startSpeedRun({ mode: "part", partId: pid, count: 5 }));
          return;
        }
        soundTap();
        startSpeedRun({ mode: "part", partId: pid, count: 5 });
      });
    });
  }

  function startSpeedRun(opts) {
    const priority = opts.customAtomIds
      ? opts.customAtomIds
      : Array.from(new Set([...(dashboard.weak_atom_ids || []), ...(dashboard.due_atom_ids || [])]));
    const deck = window.TGGames.buildSpeedRunDeck(catalog, { ...opts, priorityAtomIds: priority });
    if (!deck.length) return;
    quiz = {
      mode: opts.mode || "mixed",
      deck,
      idx: 0,
      results: [],
      qStartMs: Date.now(),
      timerId: null,
      answered: false,
    };
    const tip = $("quiz-sound-tip");
    if (tip) tip.classList.add("hidden");
    showView("view-quiz-run");
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    stopTimers();
    const q = quiz.deck[quiz.idx];
    quiz.answered = false;
    quiz.qStartMs = Date.now();

    $("quiz-progress-label").textContent = `Задача ${quiz.idx + 1} из ${quiz.deck.length}`;
    $("quiz-progress-fill").style.width = `${Math.round((quiz.idx / quiz.deck.length) * 100)}%`;
    $("quiz-live-timer").textContent = "0.0 с";
    quiz.timerId = setInterval(() => {
      const sec = (Date.now() - quiz.qStartMs) / 1000;
      $("quiz-live-timer").textContent = `${sec.toFixed(1)} с`;
    }, 100);

    const optsHtml = q.options
      .map((opt, i) => `<button type="button" class="quiz-opt" data-oidx="${i}">${esc(opt)}</button>`)
      .join("");

    $("quiz-question-card").innerHTML = `
      <span class="badge-pill sand">${esc(q.badge || "Логика")}</span>
      <div class="quiz-prompt">${esc(q.prompt)}</div>
      <div class="quiz-opts">${optsHtml}</div>
      <div id="quiz-explain-slot" class="hidden"></div>
    `;

    $("quiz-question-card").querySelectorAll(".quiz-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (quiz.answered) return;
        quiz.answered = true;
        stopTimers();
        const elapsedSec = Number(((Date.now() - quiz.qStartMs) / 1000).toFixed(1));
        const chosen = Number(btn.getAttribute("data-oidx"));
        const ok = chosen === q.correct_index;
        if (ok) soundOk();
        else soundMiss();

        quiz.results.push({ id: q.id, atom_id: q.atom_id || null, correct: ok, sec: elapsedSec });

        $("quiz-question-card").querySelectorAll(".quiz-opt").forEach((b) => {
          const idx = Number(b.getAttribute("data-oidx"));
          if (idx === q.correct_index) b.classList.add("correct");
          else if (idx === chosen && !ok) b.classList.add("wrong");
        });

        const isLast = quiz.idx >= quiz.deck.length - 1;
        const linkedAtom = q.atom_id && engine.atomsById[q.atom_id] ? engine.atomsById[q.atom_id] : null;
        const slot = $("quiz-explain-slot");
        slot.classList.remove("hidden");
        slot.innerHTML = `
          <div class="quiz-explain">
            <strong style="display:block;margin-bottom:4px;color:${ok ? "var(--accent)" : "var(--sand)"};">
              ${ok ? `Точно (${elapsedSec} с) ✓` : `Разбор конструкции (${elapsedSec} с)`}
            </strong>
            ${esc(q.explanation)}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:11px;">
            <button type="button" class="btn-primary" id="btn-quiz-next">
              ${isLast ? "Показать итог раунда →" : "Следующая задача →"}
            </button>
            ${
              linkedAtom
                ? `<button type="button" class="btn-secondary" id="btn-quiz-source">📖 Открыть первоисточник в Главе ${linkedAtom.chapter_num} →</button>`
                : ""
            }
          </div>
        `;
        $("btn-quiz-next").addEventListener("click", () => {
          soundTap();
          if (isLast) finishSpeedRun();
          else {
            quiz.idx += 1;
            renderQuizQuestion();
          }
        });
        const srcBtn = $("btn-quiz-source");
        if (srcBtn && linkedAtom) {
          srcBtn.addEventListener("click", () => {
            soundTap();
            openWeekDetail(linkedAtom.chapter_num, linkedAtom.id);
          });
        }
      });
    });
  }

  async function finishSpeedRun() {
    stopTimers();
    const run = await engine.recordQuizRun({ mode: quiz.mode, results: quiz.results });
    await refreshDashboard();
    const acc = Math.round((run.correct / Math.max(1, run.total)) * 100);
    trackGoal("speedrun_complete", { mode: quiz.mode, total: run.total, correct: run.correct, accuracy: acc, avg_sec: run.avg_sec });

    const missedAtoms = Array.from(
      new Set(quiz.results.filter((r) => !r.correct && r.atom_id).map((r) => r.atom_id))
    );

    $("quiz-summary-card").innerHTML = `
      <span class="eyebrow">Раунд завершён</span>
      <h2 class="card-title" style="font-size:21px;">${run.correct} из ${run.total} точно (${acc}%)</h2>
      <p class="card-desc" style="margin-top:4px;">Средняя скорость хода: <strong>${run.avg_sec} с</strong> на задачу. Неточные узлы мягко поставлены в повтор по кривой памяти.</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;">
        ${
          missedAtoms.length > 0
            ? `<button type="button" class="btn-primary" id="btn-qs-fix">🎯 Отработать неточные узлы (${missedAtoms.length})</button>`
            : ""
        }
        <div class="two-col">
          <button type="button" class="${missedAtoms.length > 0 ? "btn-secondary" : "btn-primary"}" id="btn-qs-again">⚡ Ещё раунд</button>
          <button type="button" class="btn-secondary" id="btn-qs-rhythm">📊 Мой ритм</button>
        </div>
        <button type="button" class="link-btn" id="btn-qs-back" style="text-align:center;padding:4px;">← На главную</button>
      </div>
    `;
    const fixBtn = $("btn-qs-fix");
    if (fixBtn) {
      fixBtn.addEventListener("click", () => {
        soundTap();
        startSpeedRun({ mode: "review", customAtomIds: missedAtoms, count: Math.max(3, missedAtoms.length) });
      });
    }
    $("btn-qs-again").addEventListener("click", () => {
      soundTap();
      startSpeedRun({ mode: quiz.mode, count: quiz.deck.length });
    });
    $("btn-qs-rhythm").addEventListener("click", () => {
      soundTap();
      renderRhythmView();
      showView("view-rhythm");
    });
    $("btn-qs-back").addEventListener("click", () => switchTab("course"));
    showView("view-quiz-summary");

    await checkMilestoneAfterProgress();
  }

  // ==================== TAB 3: LABORATORY (7 PRECISION INSTRUMENTS) ====================

  function makeWorkbenchApi() {
    return {
      getItems: () => (dashboard && dashboard.matrix_items ? dashboard.matrix_items : []),
      addItem: async (text, quad) => {
        await engine.addMatrixItem(text, quad);
        await refreshDashboard();
      },
      removeItem: async (id) => {
        await engine.removeMatrixItem(id);
        await refreshDashboard();
      },
    };
  }

  function makeCustomPriorityApi() {
    return {
      getList: (kind) => (dashboard && dashboard.custom_priorities ? dashboard.custom_priorities[kind] : null),
      saveList: async (kind, list) => {
        await engine.saveCustomPriorityList(kind, list);
        if (dashboard) {
          dashboard.custom_priorities = dashboard.custom_priorities || {};
          dashboard.custom_priorities[kind] = list;
        }
      },
    };
  }

  function renderLabTab() {
    syncUnlockUI();
    const insts = window.TGInstruments.INSTRUMENTS;
    if (!isUnlocked(activeLabInst)) activeLabInst = "euler";

    $("lab-instrument-tabs").innerHTML = insts
      .map((x) => {
        const unlocked = isUnlocked(x.id);
        return `<button type="button" class="filter-chip ${x.id === activeLabInst ? "active" : ""}${unlocked ? "" : " is-locked"}" data-iid="${x.id}">${unlocked ? "" : "🔒 "}${esc(x.title)}</button>`;
      })
      .join("");
    $("lab-instrument-tabs").querySelectorAll(".filter-chip").forEach((b) => {
      b.addEventListener("click", () => {
        const targetId = b.getAttribute("data-iid");
        if (!isUnlocked(targetId)) {
          openLockModal(targetId, () => {
            activeLabInst = targetId;
            renderLabTab();
          });
          return;
        }
        soundTap();
        activeLabInst = targetId;
        renderLabTab();
      });
    });

    const cur = insts.find((x) => x.id === activeLabInst) || insts[0];
    $("lab-inst-title").textContent = cur.title;
    $("lab-inst-sub").textContent = cur.subtitle;
    window.TGInstruments.mountInstrument($("lab-inst-mount"), cur.id, {
      catalog,
      wbApi: makeWorkbenchApi(),
      customApi: makeCustomPriorityApi(),
      onJumpAtom: (wkNum, atomId) => openWeekDetail(wkNum, atomId),
    });
  }

  // ==================== TAB 4: PLAYABLE STRATEGY ARENA (NASH · AXELROD · DIABLO DUNGEON) ====================

  function guideBoxHtml(key) {
    return window.TGGuide && typeof window.TGGuide.renderGuideBox === "function"
      ? window.TGGuide.renderGuideBox(key)
      : "";
  }
  function bindGuideBoxes(el) {
    if (window.TGGuide && typeof window.TGGuide.bindGuideBox === "function") {
      window.TGGuide.bindGuideBox(el);
    }
  }

  function renderStrategiesTab() {
    stopTimers();
    syncUnlockUI();
    if (!isUnlocked(activeStrategyView)) {
      activeStrategyView = "nash";
    }
    document.querySelectorAll("#view-strategies .subtab").forEach((b) => {
      const sv = b.getAttribute("data-sview");
      const unlocked = isUnlocked(sv);
      const baseLabel = sv === "nash" ? "Нэш 2×2" : sv === "axelrod" ? "Аксельрод" : "Подземелье ★";
      b.textContent = `${unlocked ? "" : "🔒 "}${baseLabel}`;
      b.classList.toggle("is-locked", !unlocked);
      b.classList.toggle("active", sv === activeStrategyView && unlocked);
    });

    if (!isUnlocked(activeStrategyView)) {
      $("strategy-stage").innerHTML = `
        <div class="card blueprint-hero">
          <span class="eyebrow">Ступень 2 / 4 · Полигон стратегий</span>
          <h3 class="card-title" style="font-size:18px;">Арены откроются после 1 короткого шага</h3>
          <p class="card-desc" style="margin:6px 0 12px;">Пройди 1-минутную логическую разминку, чтобы начать с «Равновесия Нэша 2×2» — или открой все 3 арены прямо сейчас.</p>
          <div class="two-col">
            <button type="button" class="btn-primary" id="btn-strat-quick">⚡ Разминка (1 мин)</button>
            <button type="button" class="btn-secondary" id="btn-strat-open-all">🔓 Открыть все 3</button>
          </div>
        </div>
      `;
      $("btn-strat-quick").addEventListener("click", () => startSpeedRun({ mode: "mixed", count: 3 }));
      $("btn-strat-open-all").addEventListener("click", () => toggleSandboxMode("strategy_gate"));
      return;
    }

    if (activeStrategyView === "axelrod") renderAxelrodStage();
    else if (activeStrategyView === "nash") renderNashStage();
    else renderMicromouseStage();
  }

  function startNewBlindAxelrod(keepMaxRounds = null) {
    const strats = window.TGStrategy.STRATEGIES;
    const prevOpp = axelrodPlay ? axelrodPlay.oppId : null;
    const pool = strats.length > 1 && prevOpp ? strats.filter((s) => s.id !== prevOpp) : strats;
    const secret = pool[Math.floor(Math.random() * pool.length)];
    axelrodPlay = {
      oppId: secret.id,
      myHist: [],
      oppHist: [],
      myScore: 0,
      oppScore: 0,
      maxRounds: keepMaxRounds || (axelrodPlay ? axelrodPlay.maxRounds : 10),
      guessedId: null,
      showTournament: axelrodPlay ? axelrodPlay.showTournament : false,
      tourT: axelrodPlay ? axelrodPlay.tourT : 5,
      tourR: axelrodPlay ? axelrodPlay.tourR : 3,
    };
  }

  function renderAxelrodStage() {
    if (!axelrodPlay) startNewBlindAxelrod(10);
    const opp = window.TGStrategy.STRATEGIES.find((s) => s.id === axelrodPlay.oppId) || window.TGStrategy.STRATEGIES[0];
    const myTape = axelrodPlay.myHist.map((m) => `<span class="tape-dot ${m}">${m}</span>`).join("");
    const oppTape = axelrodPlay.oppHist.map((m) => `<span class="tape-dot ${m}">${m}</span>`).join("");
    const roundsPlayed = axelrodPlay.myHist.length;
    const donePlay = roundsPlayed >= axelrodPlay.maxRounds;
    const revealed = axelrodPlay.guessedId !== null;

    const compat = window.TGStrategy.evaluateHypothesisCompatibility(axelrodPlay.myHist, axelrodPlay.oppHist);
    const aliveCount = compat.filter((c) => c.compatible).length;
    const diagHint = window.TGStrategy.suggestDiagnosticMove(compat, axelrodPlay.myHist);

    const lastPair = roundsPlayed ? axelrodPlay.myHist[roundsPlayed - 1] + axelrodPlay.oppHist[roundsPlayed - 1] : null;
    const nashMap = {
      CC: "Вы вышли из разовой ловушки Нэша (1,1) в устойчивое сотрудничество (3,3)!",
      DD: "Игра скатилась в разовое равновесие Нэша (1,1) — взаимная оборона без роста.",
      CD: "Асимметрия (0,5): уступка без защиты использована соперником.",
      DC: "Асимметрия (5,0): ты сделал пробный нажим D — смотри на ответную реакцию алгоритма!",
    };

    const roundPillsHtml = [8, 10, 14]
      .map(
        (rm) =>
          `<button type="button" class="inst-pill ax-rmax ${axelrodPlay.maxRounds === rm ? "active" : ""}" data-rm="${rm}">${rm} ходов</button>`
      )
      .join("");

    const hypoCardsHtml = compat
      .map((c) => {
        let cls = "hypo-card ax-guess";
        let statusLbl = "";
        let statusCol = "var(--sky)";
        if (revealed) {
          if (c.id === opp.id) {
            cls += " correct";
            statusLbl = "✓ ЭТО ОН";
            statusCol = "var(--accent)";
          } else if (c.id === axelrodPlay.guessedId) {
            cls += " wrong";
            statusLbl = "✕ МИМО";
            statusCol = "var(--rose)";
          } else {
            cls += c.compatible ? " alive" : " eliminated";
            statusLbl = c.compatible ? "подходил" : `отпал #${c.eliminatedAt}`;
            statusCol = "var(--muted)";
          }
        } else if (c.compatible) {
          cls += " alive";
          statusLbl = roundsPlayed === 0 ? "кандидат" : `след: ${c.nextMove}`;
          statusCol = c.nextMove === "C" ? "var(--accent)" : "var(--sand)";
        } else {
          cls += " eliminated";
          statusLbl = `✕ ход #${c.eliminatedAt}`;
          statusCol = "var(--rose)";
        }
        return `<button type="button" class="${cls}" data-gid="${c.id}">
          <div class="hypo-top">
            <span class="hypo-name">${esc(c.shortName)}</span>
            <span class="hypo-status" style="color:${statusCol};">${statusLbl}</span>
          </div>
          <div class="hypo-formula">${esc(c.formula)}</div>
        </button>`;
      })
      .join("");

    function renderTourListHtml() {
      const res = window.TGStrategy.runRoundRobinTournament(25, {
        T: axelrodPlay.tourT,
        R: axelrodPlay.tourR,
        P: 1,
        S: 0,
      });
      return res.ranking
        .map(
          (s, i) => `<div class="rank-row ${i === 0 ? "top" : ""}">
            <div><strong style="font-size:12.5px;">${i + 1}. ${esc(s.name)}</strong><div class="muted-small">${esc(s.tag)} · ср. ${s.avgPerRound}</div></div>
            <strong style="color:var(--accent);">${s.total}</strong>
          </div>`
        )
        .join("");
    }

    $("strategy-stage").innerHTML = `
      ${guideBoxHtml("axelrod")}
      <div class="card" style="margin-bottom:12px;">
        <div class="card-meta-row">
          <span class="badge-pill sand">Соперник: ${revealed ? esc(opp.name) : "[ ??? СКРЫТ ]"}</span>
          <span>Раунд ${roundsPlayed}/${axelrodPlay.maxRounds} · гипотез: ${aliveCount}/8</span>
        </div>

        <div class="inst-pills" style="margin:6px 0 8px;">
          ${roundPillsHtml}
          <button type="button" class="inst-pill" id="btn-ax-new-top">🎲 Новый бот</button>
        </div>

        <div class="stats-grid" style="margin-bottom:10px;">
          <div class="stat-box"><div class="stat-num">${axelrodPlay.myScore}</div><div class="stat-lbl">Твои очки</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--sand);">${axelrodPlay.oppScore}</div><div class="stat-lbl">Соперник [?]</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--sky);">${lastPair || "—"}</div><div class="stat-lbl">Пара ходов</div></div>
        </div>

        ${
          !donePlay && !revealed
            ? `<div class="two-col">
                 <button type="button" class="btn-primary" id="btn-ax-c">🤝 Сотрудничать (C)</button>
                 <button type="button" class="btn-secondary" style="border-color:rgba(234,117,109,0.55);color:#f9c4c0;" id="btn-ax-d">⚡ Проверить (D)</button>
               </div>`
            : ""
        }

        ${
          roundsPlayed
            ? `<div style="margin-top:10px;">
                 <div class="muted-small">Твои ходы:</div>
                 <div class="tape-row">${myTape}</div>
                 <div class="muted-small" style="margin-top:5px;">Ответы соперника ${revealed ? `(${esc(opp.shortName)})` : "[ ??? ]"}:</div>
                 <div class="tape-row">${oppTape}</div>
               </div>`
            : ""
        }

        ${
          !revealed
            ? `<div class="diag-hint-box">🧭 <strong>Математика разведки:</strong> ${esc(diagHint)}</div>`
            : ""
        }

        <div class="field-label" style="margin-top:12px;">
          ${revealed ? "Итог проверки гипотез (Modus Tollens):" : "Живой детектор 8 стратегий (нажми карточку, чтобы назвать соперника):"}
        </div>
        <div class="hypo-grid">${hypoCardsHtml}</div>

        ${
          revealed
            ? `<div class="quiz-explain" style="margin-top:10px;">
                 <strong style="display:block;margin-bottom:4px;color:${axelrodPlay.guessedId === opp.id ? "var(--accent)" : "var(--sand)"};">
                   ${axelrodPlay.guessedId === opp.id ? `Распознано точно ✓ За маской был «${opp.name}»!` : `За маской играл «${opp.name}»`}
                 </strong>
                 <div><strong>Формула:</strong> ${esc(opp.formula)}. ${esc(opp.desc)}</div>
                 ${lastPair ? `<div style="margin-top:4px;"><strong>Связь с Нэшем:</strong> ${esc(nashMap[lastPair] || "")}</div>` : ""}
               </div>
               <button type="button" class="btn-primary" id="btn-ax-new" style="margin-top:10px;">🎲 Следующий скрытый алгоритм</button>`
            : ""
        }
      </div>

      <div class="card">
        <button type="button" class="btn-secondary ${axelrodPlay.showTournament ? "active" : ""}" id="btn-ax-tour">
          ${axelrodPlay.showTournament ? "▾ Скрыть круговой турнир 8×8" : "⚡ Круговой турнир 8×8 + веса матрицы (25 ходов)"}
        </button>
        ${
          axelrodPlay.showTournament
            ? `<div style="margin-top:10px;">
                 <div class="slider-wrap">
                   <div class="slider-top"><span>Соблазн предать (T)</span><strong id="ax-t-val" style="color:var(--rose);">${axelrodPlay.tourT}</strong></div>
                   <input type="range" min="3" max="8" step="1" value="${axelrodPlay.tourT}" class="apple-range" id="ax-t-range"/>
                 </div>
                 <div class="slider-wrap">
                   <div class="slider-top"><span>Награда за кооперацию (R)</span><strong id="ax-r-val" style="color:var(--accent);">${axelrodPlay.tourR}</strong></div>
                   <input type="range" min="2" max="5" step="1" value="${axelrodPlay.tourR}" class="apple-range" id="ax-r-range"/>
                 </div>
                 <div id="ax-tour-host" class="card-stack">${renderTourListHtml()}</div>
               </div>`
            : ""
        }
      </div>
    `;
    bindGuideBoxes($("strategy-stage"));

    const playTurn = async (myMove) => {
      soundTap();
      const oppMove = opp.decide(axelrodPlay.oppHist, axelrodPlay.myHist, axelrodPlay.myHist.length);
      const [pA, pB] = window.TGStrategy.PAYOFF[myMove + oppMove];
      axelrodPlay.myHist.push(myMove);
      axelrodPlay.oppHist.push(oppMove);
      axelrodPlay.myScore += pA;
      axelrodPlay.oppScore += pB;
      if (axelrodPlay.myHist.length === axelrodPlay.maxRounds) {
        await engine.incrementAxelrodRuns();
        await refreshDashboard();
        await checkMilestoneAfterProgress();
      }
      renderAxelrodStage();
    };

    const btnC = $("btn-ax-c");
    const btnD = $("btn-ax-d");
    if (btnC) btnC.addEventListener("click", () => playTurn("C"));
    if (btnD) btnD.addEventListener("click", () => playTurn("D"));

    $("strategy-stage").querySelectorAll(".ax-rmax").forEach((b) => {
      b.addEventListener("click", () => {
        soundTap();
        const rm = Number(b.getAttribute("data-rm"));
        if (axelrodPlay.myHist.length >= rm) {
          startNewBlindAxelrod(rm);
        } else {
          axelrodPlay.maxRounds = rm;
        }
        renderAxelrodStage();
      });
    });

    $("strategy-stage").querySelectorAll(".ax-guess").forEach((b) => {
      b.addEventListener("click", async () => {
        if (revealed) return;
        if (axelrodPlay.myHist.length === 0) {
          soundMiss();
          return;
        }
        const gid = b.getAttribute("data-gid");
        axelrodPlay.guessedId = gid;
        if (gid === opp.id) soundOk();
        else soundMiss();
        await engine.incrementAxelrodRuns();
        await refreshDashboard();
        await checkMilestoneAfterProgress();
        renderAxelrodStage();
      });
    });

    const resetBtn = $("btn-ax-new");
    const resetTop = $("btn-ax-new-top");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        soundTap();
        startNewBlindAxelrod(axelrodPlay.maxRounds);
        renderAxelrodStage();
      });
    }
    if (resetTop) {
      resetTop.addEventListener("click", () => {
        soundTap();
        startNewBlindAxelrod(axelrodPlay.maxRounds);
        renderAxelrodStage();
      });
    }

    $("btn-ax-tour").addEventListener("click", () => {
      soundTap();
      axelrodPlay.showTournament = !axelrodPlay.showTournament;
      renderAxelrodStage();
    });

    // Smooth live slider updates without destroying range focus
    const tRange = $("ax-t-range");
    const rRange = $("ax-r-range");
    const refreshTourDom = () => {
      const host = $("ax-tour-host");
      if (host) host.innerHTML = renderTourListHtml();
    };
    if (tRange) {
      tRange.addEventListener("input", () => {
        axelrodPlay.tourT = Number(tRange.value);
        const lbl = $("ax-t-val");
        if (lbl) lbl.textContent = String(axelrodPlay.tourT);
        refreshTourDom();
      });
    }
    if (rRange) {
      rRange.addEventListener("input", () => {
        axelrodPlay.tourR = Number(rRange.value);
        const lbl = $("ax-r-val");
        if (lbl) lbl.textContent = String(axelrodPlay.tourR);
        refreshTourDom();
      });
    }
  }

  function startNewNashGame(tplKey = "0", keepMode = null) {
    const nextMode = keepMode || (nashPlay ? nashPlay.mode : "sandbox");
    const keepEdit = nashPlay ? Boolean(nashPlay.editWeights) : false;
    let game;
    let resolvedKey = String(tplKey);
    if (resolvedKey === "rnd") {
      game = window.TGStrategy.generatePureRandomNashGame({ requirePure: nextMode === "quiz" });
    } else {
      const idx = [0, 1, 2, 3].includes(Number(resolvedKey)) ? Number(resolvedKey) : 0;
      resolvedKey = String(idx);
      game = window.TGStrategy.generateRandomNashGame(idx);
    }
    nashPlay = {
      mode: nextMode,
      tplKey: resolvedKey,
      editWeights: keepEdit,
      game,
      curR: 0,
      curC: 0,
      quizGuess: null,
    };
  }

  function recomputeNashDynamicBridge(g) {
    g.nashCoords = window.TGStrategy.findPureNashCoords(g.cells);
    if (g.nashCoords.length === 0) {
      g.bridge = "После смены весов чистых замков Нэша стало 0: в каждой клетке кому-то выгодно сбежать по кругу!";
    } else if (g.nashCoords.length === 1) {
      const [er, ec] = g.nashCoords[0].split(",").map(Number);
      g.bridge = `При новых правилах игры единственный замок Нэша 🔒 находится в клетке «${g.rows[er]} × ${g.cols[ec]}» (${g.cells[er][ec][0]}, ${g.cells[er][ec][1]}).`;
    } else {
      g.bridge = `При текущих весах возникло сразу ${g.nashCoords.length} устойчивых замка Нэша 🔒 — исход выбирается первым сигналом и доверием.`;
    }
  }

  function renderNashStage() {
    if (!nashPlay) startNewNashGame("0", "sandbox");
    const g = nashPlay.game;
    const isSandboxMode = nashPlay.mode === "sandbox";
    const r = nashPlay.curR;
    const c = nashPlay.curC;
    const [myNow, oppNow] = g.cells[r][c];
    const altR = 1 - r;
    const altC = 1 - c;
    const myIfEscape = g.cells[altR][c][0];
    const oppIfEscape = g.cells[r][altC][1];
    const myWantsEscape = myIfEscape > myNow;
    const oppWantsEscape = oppIfEscape > oppNow;
    const isCurrentNash = !myWantsEscape && !oppWantsEscape;

    const cellHtml = (rr, cc) => {
      const [p1, p2] = g.cells[rr][cc];
      const coord = `${rr},${cc}`;
      const isSelected = isSandboxMode && rr === r && cc === c;
      const isNashCell = g.nashCoords.includes(coord);
      const isRevealedEq =
        (!isSandboxMode && nashPlay.quizGuess !== null && isNashCell) ||
        (isSandboxMode && (nashPlay.editWeights ? isNashCell : isSelected && isCurrentNash));
      const isWrong = !isSandboxMode && nashPlay.quizGuess === coord && !isNashCell;

      let cls = "nash-cell nash-cell-tap";
      if (isRevealedEq) cls += " eq";
      else if (isWrong) cls += " wrong";

      const borderStyle =
        isSelected && !isRevealedEq ? "border-color:var(--sky);box-shadow:0 0 0 2px rgba(103,176,240,0.35);" : "";
      let tag = isSandboxMode ? "Нажми, чтобы встать" : "Нажми: это замок 🔒?";
      if (isSandboxMode && nashPlay.editWeights && isNashCell) {
        tag = isSelected ? "🔒 ЗАМОК · Вы здесь" : "🔒 ЗАМОК НЭША";
      } else if (isSelected && isCurrentNash) {
        tag = "🔒 ЗАМОК НЭША!";
      } else if (isSelected) {
        tag = "● Вы здесь сейчас";
      } else if (!isSandboxMode && nashPlay.quizGuess !== null && isNashCell) {
        tag = "🔒 Замок Нэша";
      }

      return `<td class="${cls}" data-r="${rr}" data-c="${cc}" style="${borderStyle}">
        <span style="color:var(--sky);">${p1}</span> <span class="muted-small">·</span> <span style="color:var(--sand);">${p2}</span>
        <span class="nash-sub">${tag}</span>
      </td>`;
    };

    const weightEditorHtml = nashPlay.editWeights
      ? `
        <div class="nash-edit-panel">
          <div class="card-meta-row" style="margin-bottom:6px;">
            <strong style="color:var(--sky);font-size:12px;">🎛 Дизайн механизма · Замков 🔒 сейчас: ${g.nashCoords.length}</strong>
          </div>
          <div class="inst-pills" style="margin-bottom:6px;">
            <button type="button" class="inst-pill nash-mech-preset" data-mp="penalty">⚖ Штраф срыву −3</button>
            <button type="button" class="inst-pill nash-mech-preset" data-mp="bonus">🌟 Бонус честным +3</button>
            <button type="button" class="inst-pill nash-mech-preset" data-mp="insure">🛡 Страховка +2</button>
          </div>
          <div class="nash-edit-grid">
            ${[
              [0, 0],
              [0, 1],
              [1, 0],
              [1, 1],
            ]
              .map(([rr, cc]) => {
                const [v1, v2] = g.cells[rr][cc];
                return `<div class="nash-edit-cell">
                  <div class="nash-edit-lbl">${esc(g.rows[rr])} × ${esc(g.cols[cc])}</div>
                  <div class="nash-stepper-row">
                    <span style="color:var(--sky);font-weight:700;">Синий: ${v1}</span>
                    <span>
                      <button type="button" class="nash-step-btn" data-nr="${rr}" data-nc="${cc}" data-np="0" data-nd="-1">−</button>
                      <button type="button" class="nash-step-btn" data-nr="${rr}" data-nc="${cc}" data-np="0" data-nd="1">+</button>
                    </span>
                  </div>
                  <div class="nash-stepper-row">
                    <span style="color:var(--sand);font-weight:700;">Золот: ${v2}</span>
                    <span>
                      <button type="button" class="nash-step-btn" data-nr="${rr}" data-nc="${cc}" data-np="1" data-nd="-1">−</button>
                      <button type="button" class="nash-step-btn" data-nr="${rr}" data-nc="${cc}" data-np="1" data-nd="1">+</button>
                    </span>
                  </div>
                </div>`;
              })
              .join("")}
          </div>
        </div>
      `
      : "";

    let bodyControls = "";
    if (isSandboxMode) {
      const myDir = altR > r ? "вниз ↓" : "вверх ↑";
      const oppDir = altC > c ? "вправо →" : "влево ←";
      bodyControls = `
        <div class="atom-box" style="margin-top:8px;border:1px solid ${isCurrentNash ? "var(--accent)" : "var(--border)"};">
          <strong style="color:${isCurrentNash ? "var(--accent)" : "var(--text)"};text-transform:none;font-size:13px;">
            ${isCurrentNash ? "🔒 Никто не хочет сбегать в одиночку — это и есть Равновесие Нэша!" : "Проверка побега из выбранной клетки:"}
          </strong>
          <div style="margin-top:6px;font-size:13px;color:var(--sky);">
            <strong>1. Твой соблазн (синий):</strong> шаг ${myDir} при неподвижном партнёре: <strong>${myNow} → ${myIfEscape}</strong>
            ${myWantsEscape ? `<strong>(+${myIfEscape - myNow} · выгодно сбежать!)</strong>` : "(невыгодно — остаёшься ✓)"}
          </div>
          <div style="margin-top:5px;font-size:13px;color:var(--sand);">
            <strong>2. Соблазн партнёра (золотой):</strong> шаг ${oppDir} при твоём месте: <strong>${oppNow} → ${oppIfEscape}</strong>
            ${oppWantsEscape ? `<strong>(+${oppIfEscape - oppNow} · он сбежит!)</strong>` : "(невыгодно — он остаётся ✓)"}
          </div>
        </div>
        ${
          !isCurrentNash
            ? `<div class="two-col" style="margin-top:8px;">
                 <button type="button" class="${myWantsEscape ? "btn-primary" : "btn-secondary"}" id="btn-nash-my-esc">
                   ${myWantsEscape ? `Сбежать ${myDir} (${myNow}→${myIfEscape})` : `Твой шаг ${myDir} (${myNow}→${myIfEscape})`}
                 </button>
                 <button type="button" class="${oppWantsEscape ? "btn-primary" : "btn-secondary"}" style="${oppWantsEscape ? "background:var(--sand);color:#12161a;" : ""}" id="btn-nash-opp-esc">
                   ${oppWantsEscape ? `Партнёр ${oppDir} (${oppNow}→${oppIfEscape})` : `Его шаг ${oppDir} (${oppNow}→${oppIfEscape})`}
                 </button>
               </div>`
            : `<div class="quiz-explain" style="margin-top:8px;">${esc(g.bridge)}</div>`
        }
      `;
    } else {
      const hit = nashPlay.quizGuess !== null && g.nashCoords.includes(nashPlay.quizGuess);
      bodyControls =
        nashPlay.quizGuess === null
          ? `<p class="muted-small" style="margin-top:6px;">Проверь каждую клетку: синий не хочет менять строку, а золотой не хочет менять столбец. <strong>Нажми клетку-замок 🔒!</strong></p>`
          : `<div class="quiz-explain" style="margin-top:8px;">
               <strong style="display:block;margin-bottom:3px;color:${hit ? "var(--accent)" : "var(--sand)"};">
                 ${hit ? "Точно в замок Нэша 🔒 ✓" : "Замок Нэша подсвечен выше 🔒"}
               </strong>
               ${esc(g.bridge)}
             </div>`;
    }

    const tplButtons = [
      ["0", "☕ Два кафе"],
      ["1", "🤝 Контракт"],
      ["2", "🦌 Олень"],
      ["3", "🚦 Уступка"],
      ["rnd", "🎲 Случайная"],
    ]
      .map(
        ([ti, lbl]) =>
          `<button type="button" class="inst-pill nash-tpl ${nashPlay.tplKey === ti ? "active" : ""}" data-ti="${ti}">${lbl}</button>`
      )
      .join("");

    $("strategy-stage").innerHTML = `
      ${guideBoxHtml("nash")}
      <div class="card">
        <div class="inst-pills">
          <button type="button" class="inst-pill ${isSandboxMode ? "active" : ""}" id="btn-nm-sand">🔍 Песочница побегов</button>
          <button type="button" class="inst-pill ${!isSandboxMode ? "active" : ""}" id="btn-nm-quiz">🎯 Найди замок 🔒</button>
          <button type="button" class="inst-pill ${nashPlay.editWeights ? "active" : ""}" id="btn-nash-edit-toggle">🎛 Менять веса</button>
        </div>

        <div class="inst-pills" style="margin-bottom:8px;">
          ${tplButtons}
        </div>

        <h3 class="card-title" style="font-size:16px;">${esc(g.title)}${nashPlay.tplKey === "custom" ? " · Свои веса" : ""}</h3>
        <p class="card-desc" style="margin-bottom:8px;">${esc(g.story || "")}</p>
        <div class="card-meta-row" style="margin-bottom:4px;">
          <span style="color:var(--sky);font-weight:700;">● Синее — ТЫ (строки)</span>
          <span style="color:var(--sand);font-weight:700;">● Золотое — ПАРТНЁР (столбцы)</span>
        </div>

        <table class="nash-table">
          <thead>
            <tr><th></th><th style="color:var(--sand);">${esc(g.cols[0])}</th><th style="color:var(--sand);">${esc(g.cols[1])}</th></tr>
          </thead>
          <tbody>
            <tr><th style="color:var(--sky);">${esc(g.rows[0])}</th>${cellHtml(0, 0)}${cellHtml(0, 1)}</tr>
            <tr><th style="color:var(--sky);">${esc(g.rows[1])}</th>${cellHtml(1, 0)}${cellHtml(1, 1)}</tr>
          </tbody>
        </table>

        ${weightEditorHtml}
        ${bodyControls}
      </div>
    `;
    bindGuideBoxes($("strategy-stage"));

    $("btn-nm-sand").addEventListener("click", () => {
      soundTap();
      nashPlay.mode = "sandbox";
      nashPlay.quizGuess = null;
      renderNashStage();
    });
    $("btn-nm-quiz").addEventListener("click", () => {
      soundTap();
      nashPlay.editWeights = false;
      startNewNashGame("rnd", "quiz");
      renderNashStage();
    });
    $("btn-nash-edit-toggle").addEventListener("click", () => {
      soundTap();
      nashPlay.editWeights = !nashPlay.editWeights;
      if (nashPlay.editWeights) nashPlay.mode = "sandbox";
      renderNashStage();
    });

    $("strategy-stage").querySelectorAll(".nash-tpl").forEach((b) => {
      b.addEventListener("click", () => {
        soundTap();
        const ti = b.getAttribute("data-ti");
        startNewNashGame(ti, nashPlay.mode);
        renderNashStage();
      });
    });

    $("strategy-stage").querySelectorAll(".nash-step-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const rr = Number(b.getAttribute("data-nr"));
        const cc = Number(b.getAttribute("data-nc"));
        const pi = Number(b.getAttribute("data-np"));
        const delta = Number(b.getAttribute("data-nd"));
        const prevEq = g.nashCoords.join("|");
        g.cells[rr][cc][pi] = Math.max(-5, Math.min(15, g.cells[rr][cc][pi] + delta));
        nashPlay.tplKey = "custom";
        recomputeNashDynamicBridge(g);
        if (g.nashCoords.join("|") !== prevEq) soundOk();
        else soundTap();
        renderNashStage();
      });
    });

    $("strategy-stage").querySelectorAll(".nash-mech-preset").forEach((b) => {
      b.addEventListener("click", () => {
        const mp = b.getAttribute("data-mp");
        if (mp === "penalty") {
          // Penalize unilateral & mutual defection (row 1 for player 1, col 1 for player 2)
          g.cells[1][0][0] = Math.max(-5, g.cells[1][0][0] - 3);
          g.cells[0][1][1] = Math.max(-5, g.cells[0][1][1] - 3);
        } else if (mp === "bonus") {
          g.cells[0][0][0] = Math.min(15, g.cells[0][0][0] + 3);
          g.cells[0][0][1] = Math.min(15, g.cells[0][0][1] + 3);
        } else if (mp === "insure") {
          g.cells[0][1][0] = Math.min(15, g.cells[0][1][0] + 2);
          g.cells[1][0][1] = Math.min(15, g.cells[1][0][1] + 2);
        }
        nashPlay.tplKey = "custom";
        nashPlay.curR = 0;
        nashPlay.curC = 0;
        recomputeNashDynamicBridge(g);
        soundOk();
        renderNashStage();
      });
    });

    $("strategy-stage").querySelectorAll(".nash-cell-tap").forEach((td) => {
      td.addEventListener("click", () => {
        const rr = Number(td.getAttribute("data-r"));
        const cc = Number(td.getAttribute("data-c"));
        if (isSandboxMode) {
          nashPlay.curR = rr;
          nashPlay.curC = cc;
          const [mN, oN] = g.cells[rr][cc];
          if (g.cells[1 - rr][cc][0] <= mN && g.cells[rr][1 - cc][1] <= oN) soundOk();
          else soundTap();
        } else {
          nashPlay.quizGuess = `${rr},${cc}`;
          if (g.nashCoords.includes(nashPlay.quizGuess)) soundOk();
          else soundMiss();
        }
        renderNashStage();
      });
    });
    const bMyEsc = $("btn-nash-my-esc");
    const bOppEsc = $("btn-nash-opp-esc");
    if (bMyEsc) bMyEsc.addEventListener("click", () => { soundTap(); nashPlay.curR = altR; renderNashStage(); });
    if (bOppEsc) bOppEsc.addEventListener("click", () => { soundTap(); nashPlay.curC = altC; renderNashStage(); });
  }

  function createFreshDiabloState(size = 11) {
    const maze = window.TGStrategy.buildDiabloDungeon({ size, randomize: true });
    const s = {
      size: maze.N,
      maze,
      explored: new Set(),
      usedShrines: new Set(),
      trail: [maze.start],
      pos: [maze.start[0], maze.start[1]],
      manualSteps: 0,
      reachedGoal: false,
      isSpeedMode: false,
      statusMsg:
        "Нажимай прямо на открытые клетки карты (или стрелки ↓→), открывай каменные залы и Маяки обзора ◈, найди Ядро ★ — затем сравни с «⚡ Скоростным путём»!",
    };
    revealDiabloAt(s, maze.start[0], maze.start[1]);
    return s;
  }

  function revealDiabloAt(st, r, c) {
    const { maze, explored, usedShrines } = st;
    const { N, walls, roomTile, shrines } = maze;
    explored.add(`${r},${c}`);
    const checks = [
      [-1, 0, 1],
      [0, 1, 2],
      [1, 0, 4],
      [0, -1, 8],
    ];
    for (const [dr, dc, bit] of checks) {
      if ((walls[r][c] & bit) === 0) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) explored.add(`${nr},${nc}`);
      }
    }
    // Entering a carved Diablo chamber illuminates adjacent chamber tiles
    if (roomTile && roomTile[r] && roomTile[r][c]) {
      for (let rr = Math.max(0, r - 2); rr <= Math.min(N - 1, r + 2); rr += 1) {
        for (let cc = Math.max(0, c - 2); cc <= Math.min(N - 1, c + 2); cc += 1) {
          if (roomTile[rr][cc]) explored.add(`${rr},${cc}`);
        }
      }
    }
    // Stepping on a Vision Shrine (◈) pierces fog in a 5x5 radius!
    const sk = `${r},${c}`;
    if (!usedShrines.has(sk) && Array.isArray(shrines) && shrines.some(([sr, sc]) => sr === r && sc === c)) {
      usedShrines.add(sk);
      for (let rr = Math.max(0, r - 2); rr <= Math.min(N - 1, r + 2); rr += 1) {
        for (let cc = Math.max(0, c - 2); cc <= Math.min(N - 1, c + 2); cc += 1) {
          explored.add(`${rr},${cc}`);
        }
      }
      return true;
    }
    return false;
  }

  function renderMicromouseStage() {
    if (!diabloState) diabloState = createFreshDiabloState(11);

    function drawDungeonSvg() {
      const { maze, explored, usedShrines, trail, pos, isSpeedMode } = diabloState;
      const { N, walls, roomTile, shrines, goal, dist } = maze;
      const cell = N >= 13 ? 28 : N >= 11 ? 33 : 39;
      const pad = 12;
      const sizePx = N * cell + pad * 2;
      const shrineSet = new Set((shrines || []).map(([sr, sc]) => `${sr},${sc}`));

      let cellsSvg = "";
      let wallsSvg = "";

      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          const x = pad + c * cell;
          const y = pad + r * cell;
          const key = `${r},${c}`;
          const isGoal = r === goal[0] && c === goal[1];
          const isShrine = shrineSet.has(key);
          const isExp = explored.has(key) || isSpeedMode;
          const isRoom = roomTile && roomTile[r] && roomTile[r][c];

          let fill = "#080b10";
          if (isExp) {
            if (isGoal) fill = "rgba(79,209,149,0.32)";
            else if (isShrine && !usedShrines.has(key)) fill = "rgba(226,191,125,0.22)";
            else if (isRoom) fill = "rgba(226,191,125,0.09)";
            else fill = "rgba(103,176,240,0.13)";
          }

          cellsSvg += `<rect class="diablo-cell" data-rc="${r},${c}" x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${fill}" stroke="${isExp ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"}"/>`;

          if (isExp) {
            const fontSz = N >= 13 ? 8.5 : 10;
            if (isGoal) {
              cellsSvg += `<text x="${x + cell / 2}" y="${y + cell / 2 + 4}" text-anchor="middle" fill="#dcfaec" font-size="${fontSz + 2}" font-weight="800" pointer-events="none">★</text>`;
            } else if (isShrine && !usedShrines.has(key)) {
              cellsSvg += `<text x="${x + cell / 2}" y="${y + cell / 2 + 3.5}" text-anchor="middle" fill="#fae6c3" font-size="${fontSz + 1}" font-weight="800" pointer-events="none">◈</text>`;
            } else if (dist[r][c] < 999) {
              cellsSvg += `<text x="${x + cell / 2}" y="${y + cell / 2 + 3.2}" text-anchor="middle" fill="#6b8094" font-size="${fontSz}" font-weight="600" pointer-events="none">${dist[r][c]}</text>`;
            }

            const w = walls[r][c];
            const wCol = isRoom ? "#9e9078" : "#8294a5";
            if (w & 1) wallsSvg += `<line x1="${x}" y1="${y}" x2="${x + cell}" y2="${y}" stroke="${wCol}" stroke-width="2" stroke-linecap="round" pointer-events="none"/>`;
            if (w & 2) wallsSvg += `<line x1="${x + cell}" y1="${y}" x2="${x + cell}" y2="${y + cell}" stroke="${wCol}" stroke-width="2" stroke-linecap="round" pointer-events="none"/>`;
            if (w & 4) wallsSvg += `<line x1="${x}" y1="${y + cell}" x2="${x + cell}" y2="${y + cell}" stroke="${wCol}" stroke-width="2" stroke-linecap="round" pointer-events="none"/>`;
            if (w & 8) wallsSvg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cell}" stroke="${wCol}" stroke-width="2" stroke-linecap="round" pointer-events="none"/>`;
          }
        }
      }

      const pts = trail.map(([r, c]) => `${pad + c * cell + cell / 2},${pad + r * cell + cell / 2}`).join(" ");
      const col = isSpeedMode ? "#4fd195" : "#e2bf7d";
      const pathSvg =
        trail.length > 1
          ? `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" pointer-events="none"/>`
          : "";
      const mx = pad + pos[1] * cell + cell / 2;
      const my = pad + pos[0] * cell + cell / 2;
      const rDot = Math.max(5.5, cell * 0.21);
      return `<svg viewBox="0 0 ${sizePx} ${sizePx}" class="inst-svg" role="img" aria-label="Процедурное подземелье в тумане войны">${cellsSvg}${pathSvg}${wallsSvg}<circle cx="${mx}" cy="${my}" r="${rDot}" fill="${col}" stroke="#0b0e13" stroke-width="2" pointer-events="none"/></svg>`;
    }

    function updateDungeonHudOnly() {
      const slot = $("mm-svg-slot");
      const st = $("mm-status");
      const badge = $("mm-fog-badge");
      if (slot) slot.innerHTML = drawDungeonSvg();
      if (st) st.textContent = diabloState.statusMsg;
      if (badge) {
        const pct = Math.round((diabloState.explored.size / (diabloState.maze.N * diabloState.maze.N)) * 100);
        badge.textContent = `Этаж #${diabloState.maze.seed} · открыто ${pct}%`;
      }
      bindSvgTileClicks();
    }

    function applyStepTo(nr, nc) {
      diabloState.pos = [nr, nc];
      diabloState.manualSteps += 1;
      diabloState.trail.push([nr, nc]);
      const hitShrine = revealDiabloAt(diabloState, nr, nc);
      const { goal, speedPath, dist } = diabloState.maze;
      if (nr === goal[0] && nc === goal[1]) {
        soundOk();
        diabloState.reachedGoal = true;
        const opt = Math.max(1, speedPath.length - 1);
        const ratio = (diabloState.manualSteps / opt).toFixed(1);
        diabloState.statusMsg = `★ Ядро подземелья найдено за ${diabloState.manualSteps} ш. разведки! Чистый маршрут без тумана = ${opt} ш. (×${ratio} короче). Жми «⚡ Скоростной»!`;
      } else if (hitShrine) {
        soundOk();
        diabloState.statusMsg = `◈ Маяк обзора активирован! Туман рассеян в радиусе 5×5 · до Ядра ★ осталось ${dist[nr][nc]} ш.`;
      } else {
        diabloState.statusMsg = `Шаг разведки ${diabloState.manualSteps} · до Ядра ★ по прямой цепи = ${dist[nr][nc]} ш.`;
      }
    }

    function stepManualDir(dr, dc, bit) {
      stopTimers();
      diabloState.isSpeedMode = false;
      const [r, c] = diabloState.pos;
      if ((diabloState.maze.walls[r][c] & bit) !== 0) {
        soundMiss();
        diabloState.statusMsg = "Каменная стена! Выбери открытый проход или нажми на соседнюю светлую клетку.";
        const st = $("mm-status");
        if (st) st.textContent = diabloState.statusMsg;
        return;
      }
      soundTap();
      applyStepTo(r + dr, c + dc);
      updateDungeonHudOnly();
    }

    function bindSvgTileClicks() {
      const slot = $("mm-svg-slot");
      if (!slot) return;
      slot.querySelectorAll(".diablo-cell").forEach((rect) => {
        rect.addEventListener("click", () => {
          stopTimers();
          diabloState.isSpeedMode = false;
          const [tr, tc] = rect.getAttribute("data-rc").split(",").map(Number);
          const [cr, cc] = diabloState.pos;
          if (tr === cr && tc === cc) return;

          // Check direct adjacent move first
          const adj = [
            [-1, 0, 1],
            [0, 1, 2],
            [1, 0, 4],
            [0, -1, 8],
          ];
          for (const [dr, dc, bit] of adj) {
            if (cr + dr === tr && cc + dc === tc) {
              stepManualDir(dr, dc, bit);
              return;
            }
          }

          // Multi-step walk along revealed tiles!
          const steps = window.TGStrategy.shortestKnownPath(
            diabloState.maze,
            diabloState.pos,
            [tr, tc],
            diabloState.explored
          );
          if (!steps || !steps.length) {
            soundMiss();
            diabloState.statusMsg = "Эта зона ещё скрыта в тумане или отрезана стеной — шагай по открытым залам!";
            const st = $("mm-status");
            if (st) st.textContent = diabloState.statusMsg;
            return;
          }
          soundTap();
          for (const [nr, nc] of steps) {
            applyStepTo(nr, nc);
            if (diabloState.reachedGoal) break;
          }
          updateDungeonHudOnly();
        });
      });
    }

    const { maze } = diabloState;
    const pctOpen = Math.round((diabloState.explored.size / (maze.N * maze.N)) * 100);
    const sizePillsHtml = [9, 11, 13]
      .map(
        (sz) =>
          `<button type="button" class="inst-pill mm-size ${maze.N === sz ? "active" : ""}" data-sz="${sz}">${sz}×${sz}</button>`
      )
      .join("");

    $("strategy-stage").innerHTML = `
      ${guideBoxHtml("micromouse")}
      <div class="card">
        <div class="card-meta-row">
          <span class="badge-pill sand" id="mm-fog-badge">Этаж #${maze.seed} · открыто ${pctOpen}%</span>
          <button type="button" class="btn-chip" id="btn-mm-new">🎲 Новый этаж</button>
        </div>
        <div class="inst-pills" style="margin:6px 0 6px;">
          ${sizePillsHtml}
          <span class="muted-small" style="align-self:center;margin-left:4px;">Залов: ${maze.rooms.length} · Маяки ◈ · Ядро ★</span>
        </div>
        <div class="svg-frame" id="mm-svg-slot" style="margin:6px 0;">${drawDungeonSvg()}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;max-width:210px;margin:8px auto;">
          <div></div>
          <button type="button" class="btn-secondary mm-dir" data-d="N">↑</button>
          <div></div>
          <button type="button" class="btn-secondary mm-dir" data-d="W">←</button>
          <button type="button" class="btn-secondary mm-dir" data-d="S">↓</button>
          <button type="button" class="btn-secondary mm-dir" data-d="E">→</button>
        </div>
        <div class="two-col" style="margin-top:8px;">
          <button type="button" class="btn-secondary" id="btn-mm-auto">🧭 Авторазведка</button>
          <button type="button" class="btn-primary" id="btn-mm-speed">⚡ Скоростной (${maze.speedPath.length - 1} ш.)</button>
        </div>
        <p class="inst-caption" id="mm-status">${esc(diabloState.statusMsg)}</p>
      </div>
    `;
    bindGuideBoxes($("strategy-stage"));
    bindSvgTileClicks();

    const dirMap = { N: [-1, 0, 1], E: [0, 1, 2], S: [1, 0, 4], W: [0, -1, 8] };
    $("strategy-stage").querySelectorAll(".mm-dir").forEach((b) => {
      b.addEventListener("click", () => {
        const [dr, dc, bit] = dirMap[b.getAttribute("data-d")];
        stepManualDir(dr, dc, bit);
      });
    });

    $("strategy-stage").querySelectorAll(".mm-size").forEach((b) => {
      b.addEventListener("click", () => {
        soundTap();
        stopTimers();
        diabloState = createFreshDiabloState(Number(b.getAttribute("data-sz")));
        renderMicromouseStage();
      });
    });

    $("btn-mm-new").addEventListener("click", () => {
      soundTap();
      stopTimers();
      diabloState = createFreshDiabloState(diabloState.size);
      renderMicromouseStage();
    });

    const runAnim = (pathArr, speedFlag, labelStart, labelDone) => {
      soundTap();
      stopTimers();
      diabloState.isSpeedMode = speedFlag;
      if (speedFlag) {
        for (let r = 0; r < maze.N; r += 1) {
          for (let c = 0; c < maze.N; c += 1) diabloState.explored.add(`${r},${c}`);
        }
      } else {
        diabloState.explored = new Set();
        diabloState.usedShrines = new Set();
        revealDiabloAt(diabloState, maze.start[0], maze.start[1]);
      }
      diabloState.trail = [pathArr[0]];
      diabloState.pos = pathArr[0];
      let step = 0;
      diabloState.statusMsg = labelStart;
      updateDungeonHudOnly();
      mazeAnimId = setInterval(() => {
        step += 1;
        if (step >= pathArr.length) {
          stopTimers();
          soundOk();
          diabloState.statusMsg = labelDone;
          updateDungeonHudOnly();
          return;
        }
        diabloState.pos = pathArr[step];
        revealDiabloAt(diabloState, diabloState.pos[0], diabloState.pos[1]);
        diabloState.trail.push(diabloState.pos);
        updateDungeonHudOnly();
      }, speedFlag ? 45 : 38);
    };

    $("btn-mm-auto").addEventListener("click", () =>
      runAnim(
        maze.mappingPath,
        false,
        "🧭 Авторазведка снимает карту залов, тупиков и обходов...",
        `Карта этажа снята за ${maze.mappingPath.length - 1} ш. разведки! Теперь жми «⚡ Скоростной».`
      )
    );
    $("btn-mm-speed").addEventListener("click", () =>
      runAnim(
        maze.speedPath,
        true,
        "⚡ Чистый скоростной маршрут по открытой карте дистанций!",
        `Кратчайший путь до Ядра ★: ${maze.speedPath.length - 1} ш.${
          diabloState.reachedGoal
            ? ` (твоя разведка в тумане заняла ${diabloState.manualSteps} ш.)`
            : ` против ${maze.mappingPath.length - 1} ш. слепого поиска`
        }.`
      )
    );
  }

  // ==================== MY RHYTHM (HUD, SVG TREND CHART, EBBINGHAUS & SETTINGS) ====================

  function buildSpeedRunTrendSvg(runs) {
    const pts = runs.slice(-10);
    const W = 380;
    const H = 136;
    const padL = 28;
    const padR = 14;
    const padT = 14;
    const padB = 24;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = pts.length;
    const xFor = (i) => (n === 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
    const yAcc = (pct) => padT + plotH * (1 - Math.max(0, Math.min(100, pct)) / 100);
    const maxSec = Math.max(10, ...pts.map((r) => Number(r.avg_sec || 0)));
    const ySec = (s) => padT + plotH * (1 - Math.max(0, Math.min(maxSec, s)) / maxSec);

    const grid = [0, 50, 100]
      .map((v) => {
        const y = yAcc(v).toFixed(1);
        return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="${v === 50 ? "3 3" : "none"}"/>
                <text x="${padL - 5}" y="${(Number(y) + 3.5).toFixed(1)}" text-anchor="end" fill="#8b9bb0" font-size="9.5">${v}%</text>`;
      })
      .join("");

    const accPoly = pts
      .map((r, i) => {
        const pct = Math.round((r.correct / Math.max(1, r.total)) * 100);
        return `${xFor(i).toFixed(1)},${yAcc(pct).toFixed(1)}`;
      })
      .join(" ");

    const secPoly = pts
      .map((r, i) => `${xFor(i).toFixed(1)},${ySec(Number(r.avg_sec || 0)).toFixed(1)}`)
      .join(" ");

    const dots = pts
      .map((r, i) => {
        const x = xFor(i).toFixed(1);
        const pct = Math.round((r.correct / Math.max(1, r.total)) * 100);
        const ya = yAcc(pct).toFixed(1);
        const ys = ySec(Number(r.avg_sec || 0)).toFixed(1);
        return `
          <circle cx="${x}" cy="${ys}" r="3.5" fill="#67b0f0" stroke="#0b0e13" stroke-width="1.2"/>
          <circle cx="${x}" cy="${ya}" r="4.3" fill="#4fd195" stroke="#0b0e13" stroke-width="1.3"/>
          <text x="${x}" y="${H - 6}" text-anchor="middle" fill="#8b9bb0" font-size="9">#${i + 1}</text>
        `;
      })
      .join("");

    return `<div class="svg-frame">
      <svg viewBox="0 0 ${W} ${H}" class="inst-svg" role="img" aria-label="Динамика точности и скорости Speed Run">
        ${grid}
        ${n > 1 ? `<polyline points="${secPoly}" fill="none" stroke="rgba(103,176,240,0.5)" stroke-width="1.6" stroke-dasharray="3 3"/>` : ""}
        ${n > 1 ? `<polyline points="${accPoly}" fill="none" stroke="#4fd195" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
        ${dots}
      </svg>
    </div>`;
  }

  function renderRhythmView() {
    syncSoundUI();
    syncUnlockUI();
    trackScreen("rhythm", "Мой ритм и карта");

    $("rhythm-meta").textContent = `Хранилище: ${
      dashboard.backend === "telegram_cloud" ? "Облако Telegram + устройство" : "Локально на устройстве"
    } · 145 узлов, 401 связь, 204 вопроса.`;

    $("rhythm-stats").innerHTML = `
      <div class="stat-box">
        <div class="stat-num">${dashboard.read_atoms_count}/${dashboard.total_atoms}</div>
        <div class="stat-lbl">Узлов карты</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${dashboard.accuracy_pct != null ? dashboard.accuracy_pct + "%" : "—"}</div>
        <div class="stat-lbl">Точность</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${dashboard.avg_speed_sec != null ? dashboard.avg_speed_sec + "с" : "—"}</div>
        <div class="stat-lbl">Скорость хода</div>
      </div>
    `;

    // Trend SVG chart
    const allRuns = dashboard.quiz_runs || [];
    const trendCard = $("rhythm-trend-card");
    if (allRuns.length > 0) {
      trendCard.classList.remove("hidden");
      $("rhythm-trend-svg").innerHTML = buildSpeedRunTrendSvg(allRuns);
    } else {
      trendCard.classList.add("hidden");
    }

    // Due / Weak atoms card
    const reviewIds = Array.from(new Set([...(dashboard.weak_atom_ids || []), ...(dashboard.due_atom_ids || [])]));
    const dueCard = $("rhythm-due-card");
    if (reviewIds.length > 0) {
      const sampleTitles = reviewIds
        .slice(0, 3)
        .map((id) => engine.atomsById[id]?.title)
        .filter(Boolean)
        .join(" · ");
      dueCard.innerHTML = `
        <div class="card-meta-row">
          <span class="badge-pill sand">Повтор по кривой памяти (${reviewIds.length})</span>
        </div>
        <p class="card-desc" style="margin-bottom:10px;">${esc(sampleTitles)}</p>
        <button type="button" class="btn-primary" id="btn-rhythm-review">↻ Отработать слабые узлы (${Math.min(5, reviewIds.length)})</button>
      `;
      dueCard.classList.remove("hidden");
      $("btn-rhythm-review").addEventListener("click", () => {
        soundTap();
        startSpeedRun({ mode: "review", count: Math.min(5, Math.max(3, reviewIds.length)) });
      });
    } else {
      dueCard.classList.add("hidden");
    }

    $("rhythm-parts").innerHTML = dashboard.part_progress
      .map((pt) => {
        const pct = Math.round((pt.done_atoms / Math.max(1, pt.total_atoms)) * 100);
        const unlocked = isUnlocked(pt.id);
        return `
          <div class="card clickable-card r-part-card${unlocked ? "" : " is-locked"}" data-pid="${pt.id}">
            <div class="card-meta-row">
              <strong>${unlocked ? "" : "🔒 "}Часть ${pt.order} · ${esc(pt.short_title)}</strong>
              <span>${pt.done_atoms}/${pt.total_atoms}</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
        `;
      })
      .join("");
    $("rhythm-parts").querySelectorAll(".r-part-card").forEach((el) => {
      el.addEventListener("click", () => {
        const pid = el.getAttribute("data-pid");
        if (!isUnlocked(pid)) {
          openLockModal(pid, () => {
            activePartId = pid;
            const dr = $("curriculum-drawer");
            if (dr) dr.open = true;
            switchTab("course");
          });
          return;
        }
        soundTap();
        activePartId = pid;
        const dr = $("curriculum-drawer");
        if (dr) dr.open = true;
        switchTab("course");
      });
    });

    const runs = allRuns.slice(-8).reverse();
    $("rhythm-runs").innerHTML = runs.length
      ? runs
          .map(
            (r) =>
              `<div class="card"><div class="card-meta-row"><span>Тренировка (${esc(r.mode)}) · ${esc((r.ts || "").slice(0, 10))}</span><strong>${r.correct}/${r.total} · ${r.avg_sec}с</strong></div></div>`
          )
          .join("")
      : `<div class="card"><p class="muted-small">Пока нет завершённых тренировок Speed Run.</p></div>`;

    const noteEntries = Object.entries(dashboard.case_notes || {}).filter(([, v]) => v && v.text);
    $("rhythm-notes").innerHTML = noteEntries.length
      ? noteEntries
          .map(([pid, v]) => {
            const pt = engine.partsById[pid];
            return `<div class="card"><div class="card-meta-row"><strong>${esc(pt ? pt.harvard_case.title : pid)}</strong><span>${esc((v.ts || "").slice(0, 10))}</span></div><p class="card-desc">${esc(v.text)}</p></div>`;
          })
          .join("")
      : `<div class="card"><p class="muted-small">Здесь сохраняются твои личные разборы Гарвардских кейсов.</p></div>`;
  }

  // ==================== STATIC EVENT WIRING ====================

  function bindStaticEvents() {
    $("brand-home").addEventListener("click", () => switchTab("course"));
    document.querySelectorAll(".btn-go-home").forEach((b) => {
      b.addEventListener("click", () => switchTab("course"));
    });
    const onbTopBtn = $("btn-open-onboarding");
    if (onbTopBtn) {
      onbTopBtn.addEventListener("click", () => {
        soundTap();
        const doneSet = getOnbDoneSet();
        let startIdx = 0;
        if (doneSet.size < 4) {
          for (let i = 0; i < 4; i += 1) {
            if (!doneSet.has(i)) {
              startIdx = i;
              break;
            }
          }
        }
        openOnboardingView(startIdx);
      });
    }
    const onbBackBtn = $("btn-onboarding-back");
    if (onbBackBtn) {
      onbBackBtn.addEventListener("click", () => {
        soundTap();
        switchTab("course");
      });
    }
    $("btn-open-rhythm").addEventListener("click", async () => {
      soundTap();
      await refreshDashboard();
      renderRhythmView();
      showView("view-rhythm");
    });
    $("btn-rhythm-back").addEventListener("click", () => switchTab(lastMainTab));
    $("btn-week-back").addEventListener("click", () => {
      const dr = $("curriculum-drawer");
      if (dr) dr.open = true;
      switchTab("course");
    });

    // 1-Screen Hero Intent Pills & Primary CTA
    document.querySelectorAll(".intent-pill").forEach((b) => {
      b.addEventListener("click", () => {
        soundTap();
        selectedIntent = b.getAttribute("data-intent");
        engine.updatePrefs({ preferred_intent: selectedIntent }).catch(() => {});
        renderTodayHero();
      });
    });

    $("btn-hero-start").addEventListener("click", () => {
      soundTap();
      const cw = dashboard.current_week;
      trackGoal("today_hero_start", { intent: selectedIntent, ab: abVariant, unlock_level: getUnlockLevel() });
      if (selectedIntent === "warmup") {
        startSpeedRun({ mode: "mixed", count: abVariant === "B" ? 5 : 3 });
      } else if (selectedIntent === "course") {
        openWeekDetail(cw.week);
      } else {
        activeLabInst = isUnlocked(cw.instrument_id) ? cw.instrument_id : "euler";
        switchTab("lab");
      }
    });

    // Unlock toggles across tabs & settings
    $("btn-hero-unlock-toggle").addEventListener("click", () => toggleSandboxMode("today_hero"));
    $("btn-lab-unlock-toggle").addEventListener("click", () => toggleSandboxMode("lab_header"));
    $("btn-strat-unlock-toggle").addEventListener("click", () => toggleSandboxMode("strat_header"));
    $("pref-sandbox-btn").addEventListener("click", () => toggleSandboxMode("rhythm_settings"));

    // Sound toggles & diagnostics
    const toggleSound = async (src) => {
      unlockAudio();
      const cur = window.TGSound ? window.TGSound.isEnabled() : true;
      const next = !cur;
      if (window.TGSound) {
        window.TGSound.setEnabled(next);
        if (next) window.TGSound.playTap();
      }
      syncSoundUI();
      trackGoal("sound_toggle", { enabled: next, source: src });
      await engine.updatePrefs({ sound_enabled: next });
    };
    $("btn-top-sound").addEventListener("click", () => toggleSound("topbar"));
    $("pref-sound-btn").addEventListener("click", () => toggleSound("rhythm_settings"));

    $("btn-quiz-sound-help").addEventListener("click", () => {
      if (window.TGSound) {
        window.TGSound.setEnabled(true);
        window.TGSound.playTestTone();
        syncSoundUI();
        const d = window.TGSound.getDiagnostics();
        const tip = $("quiz-sound-tip");
        tip.textContent = `Тестовый тон отправлен · Движок: ${d.ctxState} · Канал: ${d.iosTag}. Если на iPhone тихо — добавь громкость медиа кнопками сбоку.`;
        tip.classList.remove("hidden");
      }
    });

    // Export JSON & Reset All
    $("btn-export-json").addEventListener("click", async () => {
      soundTap();
      const snap = await engine.exportSnapshot();
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thinking-geometry-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      trackGoal("rhythm_export_json");
    });

    $("btn-reset-all").addEventListener("click", async () => {
      if (!window.confirm("Сбросить локальный прогресс, заметки кейсов и матрицу решений?")) return;
      await engine.resetAll();
      trackGoal("rhythm_reset_all");
      await refreshDashboard();
      renderRhythmView();
    });

    // Dual-mode Unlock / Milestone Modal
    $("unlock-modal-backdrop").addEventListener("click", closeUnlockModal);
    $("btn-unlock-close").addEventListener("click", closeUnlockModal);
    $("btn-unlock-primary").addEventListener("click", () => {
      const m = modalMode;
      closeUnlockModal();
      if (m === "lock") {
        startSpeedRun({ mode: "mixed", count: 3 });
      }
    });
    $("btn-unlock-all").addEventListener("click", async () => {
      soundOk();
      const fn = pendingUnlockFn;
      await engine.updatePrefs({ sandbox_unlocked: true });
      trackGoal("sandbox_unlock_toggle", { unlocked: true, source: "lock_modal" });
      await refreshDashboard();
      closeUnlockModal();
      if (typeof fn === "function") fn();
      else switchTab(activeTab);
    });

    // Navigation tabs & strategy subtabs
    document.querySelectorAll("#main-tabs .tab").forEach((b) => {
      b.addEventListener("click", () => {
        soundTap();
        switchTab(b.getAttribute("data-tab"));
      });
    });

    document.querySelectorAll("#view-strategies .subtab").forEach((b) => {
      b.addEventListener("click", () => {
        const sv = b.getAttribute("data-sview");
        if (!isUnlocked(sv)) {
          openLockModal(sv, () => {
            activeStrategyView = sv;
            renderStrategiesTab();
          });
          return;
        }
        soundTap();
        activeStrategyView = sv;
        renderStrategiesTab();
      });
    });

    $("btn-start-speedrun").addEventListener("click", () => {
      soundTap();
      startSpeedRun({ mode: "mixed", count: 5 });
    });
    $("btn-start-procedural").addEventListener("click", () => {
      soundTap();
      startSpeedRun({ mode: "procedural", count: 7 });
    });
    $("btn-start-review").addEventListener("click", () => {
      soundTap();
      startSpeedRun({ mode: "review", count: 5 });
    });
    $("btn-quiz-abort").addEventListener("click", () => switchTab("express"));

    $("btn-tribute-done").addEventListener("click", () => openTribute("quiz_summary"));
    $("btn-tribute-footer").addEventListener("click", () => openTribute("footer"));
    $("btn-unlock-tribute").addEventListener("click", () => openTribute("milestone_modal"));
  }

  async function boot() {
    try {
      const resp = await fetch("./catalog.json?v=410", { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      catalog = await resp.json();
      const kv = window.TGStorage.createKvAdapter(tg, window.localStorage);
      engine = new window.TGStorage.ThinkingGeometryEngine(catalog, kv);

      if (deepLink.unlockAll) {
        await engine.updatePrefs({ sandbox_unlocked: true });
      }
      bindStaticEvents();
      await refreshDashboard();

      if (dashboard.prefs && ["warmup", "course", "lab"].includes(dashboard.prefs.preferred_intent)) {
        selectedIntent = dashboard.prefs.preferred_intent;
      }

      trackGoal("app_open", {
        env: tg && tg.initData ? "tg" : "web",
        src: deepLink.src,
        ab: abVariant,
        unlock_level: getUnlockLevel(),
      });

      // Route Deep-Links cleanly (honoring explicit user/SMM link intent)
      if (deepLink.atomId && engine.atomsById[deepLink.atomId]) {
        const a = engine.atomsById[deepLink.atomId];
        openWeekDetail(a.chapter_num, a.id);
      } else if (deepLink.week && engine.weeksByNum[deepLink.week]) {
        openWeekDetail(deepLink.week);
      } else if (deepLink.lab) {
        await engine.updatePrefs({ sandbox_unlocked: true });
        await refreshDashboard();
        activeLabInst = deepLink.lab;
        switchTab("lab");
      } else if (deepLink.strategy && ["nash", "axelrod", "micromouse"].includes(deepLink.strategy)) {
        await engine.updatePrefs({ sandbox_unlocked: true });
        await refreshDashboard();
        activeStrategyView = deepLink.strategy;
        switchTab("strategies");
      } else if (deepLink.quiz) {
        startSpeedRun({ mode: deepLink.quiz, count: 5 });
      } else if (deepLink.tab && ["course", "express", "lab", "strategies"].includes(deepLink.tab)) {
        switchTab(deepLink.tab);
      } else {
        switchTab("course");
      }
    } catch (err) {
      document.body.innerHTML = `<main class="shell"><div class="card"><h2>Не удалось загрузить каталог</h2><p class="muted-small" style="margin-bottom:12px;">${esc(err && err.message ? err.message : err)}</p><button id="btn-boot-reload" type="button" class="btn-primary">Обновить страницу</button></div></main>`;
      const rb = document.getElementById("btn-boot-reload");
      if (rb) rb.addEventListener("click", () => window.location.reload());
    }
  }

  boot();
})();
