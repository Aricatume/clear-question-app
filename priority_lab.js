/* Priority Compass v4.1 — 7 Playable, Custom-Input & Real-Life-Guided Prioritization Optics
 * Smooth zero-DOM-destroy range sliders + explicit active/selected states + TGGuide Passports.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TGPriority = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function guideHtml(key) {
    return root.TGGuide && typeof root.TGGuide.renderGuideBox === "function"
      ? root.TGGuide.renderGuideBox(key)
      : "";
  }
  function bindGuide(container) {
    if (root.TGGuide && typeof root.TGGuide.bindGuideBox === "function") {
      root.TGGuide.bindGuideBox(container);
    }
  }
  function sfxTap() { if (root.TGSound) root.TGSound.playTap(); }
  function sfxOk() { if (root.TGSound) root.TGSound.playCorrect(); }
  function sfxWrong() { if (root.TGSound) root.TGSound.playWrong(); }

  // ---- Pure math helpers (exported for automated Node tests!) ----
  function computeTocThroughput(nodes) {
    return Math.min(...nodes.map((n) => n.cap));
  }

  function computeWsjfOrder(tasks) {
    return tasks
      .map((t) => ({
        ...t,
        wsjf: Number((t.cod / Math.max(0.5, t.dur)).toFixed(2)),
      }))
      .sort((a, b) => b.wsjf - a.wsjf);
  }

  function computeTotalDelayCost(orderedTasks) {
    let elapsed = 0;
    let totalCost = 0;
    for (const t of orderedTasks) {
      elapsed += t.dur;
      totalCost += elapsed * t.cod;
    }
    return Math.round(totalCost);
  }

  function computeRiceScore(item, damped = true) {
    const eff = damped ? Math.pow(Math.max(0.25, item.effort), 0.65) : Math.max(0.25, item.effort);
    return Number(((item.reach * item.impact * (item.conf / 100)) / eff).toFixed(1));
  }

  // ==================== 1. MATRIX 2x2 WORKBENCH ====================
  const QUAD_META = [
    { id: "q1", label: "1 · Срочно + Важно", hint: "Критичный фокус сейчас" },
    { id: "q2", label: "2 · Важно, не срочно ★", hint: "Глубокое обучение и система" },
    { id: "q3", label: "3 · Срочно, не важно", hint: "Сжать или делегировать" },
    { id: "q4", label: "4 · Ни то, ни другое", hint: "Вычесть без вины" },
  ];

  function renderMatrix2x2(slot, ctx) {
    const wbApi = ctx && ctx.wbApi ? ctx.wbApi : null;
    let selectedQuad = "q2";
    function draw() {
      const items = wbApi ? wbApi.getItems() : [];
      const qBtns = QUAD_META.map(
        (q) => `<button type="button" class="wb-qbtn ${selectedQuad === q.id ? "active" : ""}" data-q="${q.id}">${esc(q.label)}</button>`
      ).join("");
      const grid = QUAD_META.map((q) => {
        const list = items.filter((it) => it.quad === q.id);
        const rows = list.length
          ? list.map((it) => `<div class="wb-chip"><span>${esc(it.text)}</span><button type="button" class="wb-del" data-id="${it.id}">×</button></div>`).join("")
          : `<div class="wb-empty">${esc(q.hint)}</div>`;
        return `<div class="wb-quad wb-${q.id} ${selectedQuad === q.id ? "selected-quad" : ""}"><div class="wb-quad-title">${esc(q.label)}</div>${rows}</div>`;
      }).join("");

      slot.innerHTML = `
        ${guideHtml("m2x2")}
        <div class="wb-input-row">
          <input type="text" class="text-input wb-inp" maxlength="90" placeholder="Впиши своё дело и выбери квадрант ниже..." />
          <button type="button" class="btn-add-sm wb-add">Добавить</button>
        </div>
        <div class="wb-qbar">${qBtns}</div>
        <div class="wb-grid">${grid}</div>
      `;
      bindGuide(slot);
      const inp = slot.querySelector(".wb-inp");
      const doAdd = async () => {
        const v = (inp.value || "").trim();
        if (!v || !wbApi) return;
        sfxOk();
        await wbApi.addItem(v, selectedQuad);
        inp.value = "";
        draw();
      };
      slot.querySelector(".wb-add").addEventListener("click", doAdd);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
      slot.querySelectorAll(".wb-qbtn").forEach((b) => b.addEventListener("click", () => { sfxTap(); selectedQuad = b.getAttribute("data-q"); draw(); }));
      slot.querySelectorAll(".wb-del").forEach((b) => b.addEventListener("click", async () => { if (!wbApi) return; sfxTap(); await wbApi.removeItem(b.getAttribute("data-id")); draw(); }));
    }
    draw();
  }

  // ==================== 2. TOC PLAYABLE 5-ROUND FLOW GAME + CUSTOM NODES ====================
  function renderToc(slot) {
    let nodes = [
      { name: "Приём", cap: 75 },
      { name: "Сборка", cap: 50 },
      { name: "Проверка", cap: 18 },
      { name: "Выплата", cap: 65 },
    ];
    let botNodes = nodes.map((n) => ({ ...n }));
    let round = 1;
    const maxRounds = 5;
    let myTotalFlow = 0;
    let botTotalFlow = 0;
    let lastChosenIdx = null;
    let eventLog = "Раунд 1/5: выбери 1 узел для инвестиции (+22 мощности). Бот размазывает ресурс по очереди — обгони его по общему потоку!";

    function newRandomPipeline() {
      const names = pick([
        ["Лиды", "Звонок", "Оффер", "Оплата"],
        ["Идея", "Код", "Ревью", "Релиз"],
        ["Заявка", "Проверка", "Одобрение", "Выплата"],
        ["Сбор", "Очистка", "Модель", "Вывод"],
      ]);
      const caps = [
        45 + Math.floor(Math.random() * 45),
        40 + Math.floor(Math.random() * 45),
        40 + Math.floor(Math.random() * 45),
        45 + Math.floor(Math.random() * 45),
      ];
      const botIdx = Math.floor(Math.random() * 4);
      caps[botIdx] = 10 + Math.floor(Math.random() * 14);
      nodes = names.map((nm, i) => ({ name: nm, cap: caps[i] }));
      botNodes = nodes.map((n) => ({ ...n }));
      round = 1;
      myTotalFlow = 0;
      botTotalFlow = 0;
      lastChosenIdx = null;
      eventLog = "Новый случайный конвейер! Бей точно в красное узкое горлышко.";
      draw();
    }

    function playRound(chosenIdx) {
      if (round > maxRounds) return;
      lastChosenIdx = chosenIdx;
      const beforeTp = computeTocThroughput(nodes);
      const wasBottleneck = nodes[chosenIdx].cap === beforeTp;
      nodes[chosenIdx].cap += 22;
      botNodes[(round - 1) % botNodes.length].cap += 22;

      const shockIdx = Math.floor(Math.random() * nodes.length);
      const shockDelta = Math.random() < 0.55 ? -10 : 18;
      nodes[shockIdx].cap = Math.max(6, nodes[shockIdx].cap + shockDelta);
      botNodes[shockIdx].cap = Math.max(6, botNodes[shockIdx].cap + shockDelta);

      const myTp = computeTocThroughput(nodes);
      const botTp = computeTocThroughput(botNodes);
      myTotalFlow += myTp;
      botTotalFlow += botTp;
      if (wasBottleneck) sfxOk(); else sfxWrong();

      const shockTxt = shockDelta < 0 ? `Событие: «${nodes[shockIdx].name}» просел (${shockDelta}).` : `Событие: «${nodes[shockIdx].name}» ускорился (+${shockDelta}).`;
      const myFeedback = wasBottleneck ? `Точно в горлышко → поток ${myTp}!` : `Мимо горлышка → поток ${myTp}.`;
      eventLog = `Раунд ${round}: ты усилил «${nodes[chosenIdx].name}». ${myFeedback} ${shockTxt}`;
      round += 1;
      draw();
    }

    function draw() {
      const tp = computeTocThroughput(nodes);
      const finished = round > maxRounds;
      const colW = Math.floor(372 / Math.max(2, nodes.length));
      const boxW = Math.max(58, colW - 12);

      const svgNodes = nodes
        .map((n, i) => {
          const x = 14 + i * colW;
          const isBot = n.cap === tp;
          const stroke = isBot ? "#ea756d" : "#67b0f0";
          const fill = isBot ? "rgba(234,117,109,0.22)" : "rgba(103,176,240,0.12)";
          const arrow = i < nodes.length - 1 ? `<line x1="${x + boxW}" y1="62" x2="${x + colW}" y2="62" stroke="#8b9bb0" stroke-width="2"/>` : "";
          return `${arrow}
            <rect x="${x}" y="26" width="${boxW}" height="72" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="${isBot ? 2.2 : 1.5}"/>
            <text x="${x + boxW / 2}" y="47" text-anchor="middle" fill="#c8d4e3" font-size="9.5" font-weight="600">${esc(n.name.slice(0, 10))}</text>
            <text x="${x + boxW / 2}" y="74" text-anchor="middle" fill="${isBot ? "#fcdbd8" : "#ffffff"}" font-size="16" font-weight="700">${n.cap}</text>
            <text x="${x + boxW / 2}" y="90" text-anchor="middle" fill="${isBot ? "#ea756d" : "#8b9bb0"}" font-size="8" font-weight="700">${isBot ? "ГОРЛЫШКО" : "запас"}</text>`;
        })
        .join("");

      const actionBtns = nodes
        .map((n, i) => {
          const isBot = n.cap === tp;
          const selStyle = lastChosenIdx === i ? "border-color:var(--accent);" : isBot ? "border-color:rgba(234,117,109,0.5);" : "";
          return `<button type="button" class="btn-secondary toc-play" data-ni="${i}" style="${selStyle}" ${finished ? "disabled" : ""}>⚡ +22 → ${esc(n.name)} (${n.cap})</button>`;
        })
        .join("");

      slot.innerHTML = `
        ${guideHtml("toc")}
        <div class="card-meta-row" style="margin-bottom:6px;">
          <span class="badge-pill">Раунд ${Math.min(round, maxRounds)} / ${maxRounds}</span>
          <span>Твой поток: <strong style="color:var(--accent);">${myTotalFlow}</strong> · Бот: <strong>${botTotalFlow}</strong></span>
        </div>
        <div class="svg-frame" style="margin-bottom:10px;">
          <svg viewBox="0 0 400 124" class="inst-svg" role="img" aria-label="Игровой конвейер TOC">
            ${svgNodes}
            <text x="200" y="116" text-anchor="middle" fill="#4fd195" font-size="10.5" font-weight="700">Текущий выход цепи = min = ${tp} ед./ход</text>
          </svg>
        </div>
        ${
          finished
            ? `<div class="quiz-explain" style="margin-bottom:10px;">
                 <strong style="color:${myTotalFlow >= botTotalFlow ? "var(--accent)" : "var(--sand)"};">
                   ${myTotalFlow >= botTotalFlow ? `Победа над распылением! Ты ${myTotalFlow} : ${botTotalFlow} Бот ✓` : `Матч завершён: Ты ${myTotalFlow} : ${botTotalFlow} Бот`}
                 </strong> — концентрация ресурса строго в узком звене обгоняет равномерное улучшение всего подряд.
               </div>
               <button type="button" class="btn-primary" id="btn-toc-new">🎲 Новая партия (случайный конвейер)</button>`
            : `<div class="two-col" style="margin-bottom:8px;">${actionBtns}</div>
               <div class="quiz-explain" style="margin-bottom:8px;">${esc(eventLog)}</div>
               <div class="wb-input-row">
                 <input type="text" class="text-input" id="toc-add-inp" maxlength="16" placeholder="Добавить свой этап в цепь..." />
                 <button type="button" class="btn-add-sm" id="btn-toc-add">+ Этап</button>
                 <button type="button" class="btn-secondary" style="width:auto;padding:0 10px;" id="btn-toc-new" title="Случайная карта">🎲</button>
               </div>`
        }
      `;
      bindGuide(slot);

      slot.querySelectorAll(".toc-play").forEach((b) => b.addEventListener("click", () => playRound(Number(b.getAttribute("data-ni")))));
      const bn = slot.querySelector("#btn-toc-new");
      if (bn) bn.addEventListener("click", () => { sfxTap(); newRandomPipeline(); });
      const bAdd = slot.querySelector("#btn-toc-add");
      const inp = slot.querySelector("#toc-add-inp");
      if (bAdd && inp) {
        const doAdd = () => {
          const v = inp.value.trim();
          if (!v || nodes.length >= 6) return;
          sfxTap();
          const cap = 15 + Math.floor(Math.random() * 45);
          nodes.push({ name: v, cap });
          botNodes.push({ name: v, cap });
          draw();
        };
        bAdd.addEventListener("click", doAdd);
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
      }
    }
    draw();
  }

  // ==================== 3. WSJF WITH ZERO-FLICKER SMOOTH RANGE SLIDERS ====================
  function renderWsjf(slot, ctx) {
    const customApi = ctx && ctx.customApi ? ctx.customApi : null;
    const saved = customApi ? customApi.getList("wsjf") : null;
    let tasks =
      saved && saved.length
        ? saved.map((x) => ({ ...x }))
        : [
            { id: "w1", name: "Фикс платёжного шлюза", cod: 10, dur: 1 },
            { id: "w2", name: "Большой редизайн кабинета", cod: 9, dur: 10 },
            { id: "w3", name: "Подготовка к сезонному пику", cod: 8, dur: 3 },
          ];

    function persist() {
      if (customApi) customApi.saveList("wsjf", tasks);
    }

    function updateRankingOnly() {
      const optOrder = computeWsjfOrder(tasks);
      const worstOrder = optOrder.slice().reverse();
      const costOpt = computeTotalDelayCost(optOrder);
      const costWorst = computeTotalDelayCost(worstOrder);
      const savedCost = costWorst - costOpt;

      const capEl = slot.querySelector("#wsjf-summary-cap");
      if (capEl) {
        capEl.innerHTML = `<strong>WSJF = Цена задержки / Срок.</strong> Потери ожидания: <strong>${costOpt}</strong> (оптимум) vs <strong>${costWorst}</strong> (обратно) → экономия <strong style="color:var(--accent);">${savedCost} ед.</strong>`;
      }
      const rankHost = slot.querySelector("#wsjf-rank-host");
      if (rankHost) {
        rankHost.innerHTML = tasks.length
          ? optOrder
              .map(
                (t, i) => `
                  <div class="rank-row ${i === 0 ? "top" : ""}">
                    <div style="flex:1;">
                      <strong style="font-size:13px;">${i + 1}. ${esc(t.name)}</strong>
                      <div class="muted-small">Задержка: ${t.cod}/нед · Срок: ${t.dur} нед</div>
                    </div>
                    <strong style="color:var(--accent);font-size:15px;margin-right:6px;">${t.wsjf}</strong>
                    <button type="button" class="wb-del wsjf-del" data-id="${esc(t.id)}" title="Удалить">×</button>
                  </div>
                `
              )
              .join("")
          : `<p class="muted-small">Добавь 2–3 задачи сверху, чтобы рассчитать очередь.</p>`;
        rankHost.querySelectorAll(".wsjf-del").forEach((b) => {
          b.addEventListener("click", () => {
            sfxTap();
            tasks = tasks.filter((x) => x.id !== b.getAttribute("data-id"));
            persist();
            drawFull();
          });
        });
      }
    }

    function drawFull() {
      const slidersHtml = tasks
        .map(
          (t, idx) => `
            <div class="atom-box" style="margin-bottom:6px;">
              <strong style="color:var(--text);text-transform:none;font-size:12.5px;">${esc(t.name)}</strong>
              <div class="two-col" style="margin-top:4px;">
                <label class="muted-small">Цена задержки (<span id="wsjf-cod-lbl-${idx}">${t.cod}</span>)<input type="range" min="1" max="10" value="${t.cod}" class="apple-range wsjf-cod" data-idx="${idx}"/></label>
                <label class="muted-small">Срок в нед. (<span id="wsjf-dur-lbl-${idx}">${t.dur}</span>)<input type="range" min="1" max="12" value="${t.dur}" class="apple-range wsjf-dur" data-idx="${idx}"/></label>
              </div>
            </div>
          `
        )
        .join("");

      slot.innerHTML = `
        ${guideHtml("wsjf")}
        <div class="wb-input-row" style="margin-bottom:10px;">
          <input type="text" class="text-input" id="wsjf-inp" maxlength="70" placeholder="Добавить свою задачу в очередь WSJF..." />
          <button type="button" class="btn-add-sm" id="btn-wsjf-add">Добавить</button>
        </div>
        <p class="inst-caption" id="wsjf-summary-cap" style="margin-top:0;margin-bottom:8px;"></p>
        <div class="card-stack" id="wsjf-rank-host" style="margin-bottom:10px;"></div>
        <div class="field-label">Крути веса своих задач (живой пересчёт)</div>
        ${slidersHtml}
      `;
      bindGuide(slot);
      updateRankingOnly();

      const inp = slot.querySelector("#wsjf-inp");
      const doAdd = () => {
        const v = inp.value.trim();
        if (!v) return;
        sfxOk();
        tasks.push({ id: `w_${Date.now().toString(36)}`, name: v, cod: 6, dur: 2 });
        inp.value = "";
        persist();
        drawFull();
      };
      slot.querySelector("#btn-wsjf-add").addEventListener("click", doAdd);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });

      slot.querySelectorAll(".wsjf-cod").forEach((el) => {
        el.addEventListener("input", () => {
          const idx = Number(el.getAttribute("data-idx"));
          tasks[idx].cod = Number(el.value);
          const lbl = slot.querySelector(`#wsjf-cod-lbl-${idx}`);
          if (lbl) lbl.textContent = String(tasks[idx].cod);
          persist();
          updateRankingOnly();
        });
      });
      slot.querySelectorAll(".wsjf-dur").forEach((el) => {
        el.addEventListener("input", () => {
          const idx = Number(el.getAttribute("data-idx"));
          tasks[idx].dur = Number(el.value);
          const lbl = slot.querySelector(`#wsjf-dur-lbl-${idx}`);
          if (lbl) lbl.textContent = String(tasks[idx].dur);
          persist();
          updateRankingOnly();
        });
      });
    }
    drawFull();
  }

  // ==================== 4. 1-WAY VS 2-WAY DOORS RACE ====================
  function renderDoors(slot, ctx) {
    const atoms = (ctx && ctx.catalog && ctx.catalog.atoms) || [];
    let cur = null;
    let guess = null;
    let streak = 0;
    let solved = 0;
    let startMs = Date.now();
    let elapsed = 0;

    function nextDoorAtom() {
      const pool = atoms.filter((a) => (a.anti_example || "").length >= 24);
      const a = pick(pool.length ? pool : atoms);
      const isOneWay = a.atom_type === "fallacy" || a.atom_type === "law";
      cur = {
        atom: a,
        door: isOneWay ? "one" : "two",
        reason: isOneWay
          ? `Жёсткий структурный слом (${a.atom_type === "fallacy" ? "логическая ошибка" : "фундаментальный закон"}, Гл. ${a.chapter_num}): если пропустить его в доказательство или архитектуру, вся цепочка рушится необратимо.`
          : `Обратимая модельная граница (Гл. ${a.chapter_num}): здесь можно поставить быструю пробу, посмотреть на данные и уточнить правило на ходу.`,
      };
      guess = null;
      startMs = Date.now();
      draw();
    }

    function draw() {
      if (!cur) {
        nextDoorAtom();
        return;
      }
      const a = cur.atom;
      const twoCls = guess === null ? "quiz-opt door-pick" : cur.door === "two" ? "quiz-opt door-pick correct" : guess === "two" ? "quiz-opt door-pick wrong" : "quiz-opt door-pick";
      const oneCls = guess === null ? "quiz-opt door-pick" : cur.door === "one" ? "quiz-opt door-pick correct" : guess === "one" ? "quiz-opt door-pick wrong" : "quiz-opt door-pick";

      slot.innerHTML = `
        ${guideHtml("doors")}
        <div class="card-meta-row" style="margin-bottom:8px;">
          <span class="badge-pill sky">Гонка по 145 узлам · Неделя ${a.chapter_num}</span>
          <span>Серия: <strong>${streak}</strong> · Решено: <strong>${solved}</strong></span>
        </div>
        <div class="atom-box anti" style="margin-bottom:8px;">
          <strong>Ситуация / Поломка</strong>
          «${esc(a.anti_example || a.core_thesis)}»
        </div>
        <div class="atom-box bound" style="margin-bottom:10px;">
          <strong>Граница правила</strong>
          ${esc(a.epistemic_boundary || a.core_thesis)}
        </div>
        <div class="two-col">
          <button type="button" class="${twoCls}" data-d="two" style="text-align:center;font-weight:700;">↔ Дверь 2-стор. (проба)</button>
          <button type="button" class="${oneCls}" data-d="one" style="text-align:center;font-weight:700;">→ Дверь 1-стор. (слом)</button>
        </div>
        ${
          guess !== null
            ? `<div class="quiz-explain" style="margin-top:10px;">
                 <strong style="display:block;margin-bottom:3px;color:${guess === cur.door ? "var(--accent)" : "var(--sand)"};">
                   ${guess === cur.door ? `Точно за ${elapsed} с ✓` : `Смотри тип риска (${elapsed} с)`} · «${esc(a.title)}»
                 </strong>
                 ${esc(cur.reason)}
               </div>
               <div class="two-col" style="margin-top:10px;">
                 <button type="button" class="btn-primary" id="btn-door-next">⚡ Следующий узел →</button>
                 <button type="button" class="btn-secondary" id="btn-door-open">Открыть в Курсе</button>
               </div>`
            : ""
        }
      `;
      bindGuide(slot);
      slot.querySelectorAll(".door-pick").forEach((b) => {
        b.addEventListener("click", () => {
          if (guess !== null) return;
          guess = b.getAttribute("data-d");
          elapsed = Number(((Date.now() - startMs) / 1000).toFixed(1));
          solved += 1;
          if (guess === cur.door) { sfxOk(); streak += 1; } else { sfxWrong(); streak = 0; }
          draw();
        });
      });
      const bn = slot.querySelector("#btn-door-next");
      const bo = slot.querySelector("#btn-door-open");
      if (bn) bn.addEventListener("click", () => { sfxTap(); nextDoorAtom(); });
      if (bo && ctx && typeof ctx.onJumpAtom === "function") bo.addEventListener("click", () => { sfxTap(); ctx.onJumpAtom(a.chapter_num, a.id); });
    }
    nextDoorAtom();
  }

  // ==================== 5. DE-RISKING / EVPI PLAYABLE FOG-OF-WAR GAME ====================
  function renderDerisk(slot) {
    let coins = 100;
    let cards = [];
    let launched = false;
    let outcome = "";

    function newGame() {
      coins = 100;
      launched = false;
      outcome = "";
      const names = pick([
        ["Спрос клиентов", "Юридический допуск", "Нагрузка API", "Цвет обложки"],
        ["Права доступа (Tenant)", "Лимиты внешнего API", "Скорость поиска", "Иконка в меню"],
        ["Готовность платить", "Доступ к шлюзу", "Удержание D7", "Шрифт заголовка"],
      ]);
      const severities = ["fatal", "major", "safe", "safe"].sort(() => Math.random() - 0.5);
      cards = names.map((nm, i) => ({
        id: i,
        name: nm,
        sev: severities[i],
        probed: false,
        fixed: false,
      }));
      draw();
    }

    function draw() {
      const hiddenCount = cards.filter((c) => !c.probed).length;
      const entropy = Math.round((hiddenCount / 4) * 100);
      const cardsHtml = cards
        .map((c) => {
          let stateBadge = "🌫 В тумане";
          let cls = "";
          if (c.probed) {
            if (c.fixed) { stateBadge = "✓ Обезврежен"; cls = "top"; }
            else if (c.sev === "fatal") stateBadge = "☠ ФАТАЛЬНЫЙ БЛОКЕР";
            else if (c.sev === "major") stateBadge = "⚠ Средний риск (−35)";
            else stateBadge = "✓ Безопасно";
          }
          const actionBtn = !launched
            ? !c.probed
              ? `<button type="button" class="btn-chip dr-probe" data-i="${c.id}" ${coins < 12 ? "disabled" : ""}>Зонд (−12)</button>`
              : !c.fixed && c.sev !== "safe"
              ? `<button type="button" class="btn-chip dr-fix" data-i="${c.id}" style="border-color:var(--sand);color:#fae6c3;" ${coins < 20 ? "disabled" : ""}>Закрыть (−20)</button>`
              : `<span class="muted-small" style="color:var(--accent);">✓ Чисто</span>`
            : `<span class="muted-small">${c.sev === "fatal" ? "☠ Блокер" : c.sev === "major" ? "⚠ Риск" : "✓ Ок"}</span>`;

          return `<div class="rank-row ${cls}">
            <div>
              <strong style="font-size:13px;">${esc(c.name)}</strong>
              <div class="muted-small">${stateBadge}</div>
            </div>
            ${actionBtn}
          </div>`;
        })
        .join("");

      slot.innerHTML = `
        ${guideHtml("derisk")}
        <div class="card-meta-row" style="margin-bottom:6px;">
          <span class="badge-pill sand">Бюджет: <strong>${coins}</strong> монет</span>
          <span>Туман неизвестности: <strong>${entropy}%</strong></span>
        </div>
        <div class="progress-track" style="margin-top:0;margin-bottom:10px;"><div class="progress-fill" style="width:${entropy}%;background:${entropy <= 25 ? "var(--accent)" : "var(--rose)"};"></div></div>
        <div class="card-stack" style="margin-bottom:10px;">${cardsHtml}</div>
        ${
          !launched
            ? `<div class="two-col">
                 <button type="button" class="btn-primary" id="btn-dr-launch">🚀 Запустить в прод (+120)</button>
                 <button type="button" class="btn-secondary" id="btn-dr-new">🎲 Новая карта</button>
               </div>`
            : `<div class="quiz-explain" style="margin-bottom:10px;">${esc(outcome)}</div>
               <button type="button" class="btn-primary" id="btn-dr-new">🎲 Сыграть ещё раз</button>`
        }
      `;
      bindGuide(slot);

      slot.querySelectorAll(".dr-probe").forEach((b) => {
        b.addEventListener("click", () => {
          if (coins < 12) return;
          sfxTap();
          coins -= 12;
          cards[Number(b.getAttribute("data-i"))].probed = true;
          draw();
        });
      });
      slot.querySelectorAll(".dr-fix").forEach((b) => {
        b.addEventListener("click", () => {
          if (coins < 20) return;
          sfxOk();
          coins -= 20;
          cards[Number(b.getAttribute("data-i"))].fixed = true;
          draw();
        });
      });
      const bL = slot.querySelector("#btn-dr-launch");
      if (bL) {
        bL.addEventListener("click", () => {
          launched = true;
          cards.forEach((c) => { c.probed = true; });
          const fatalAlive = cards.some((c) => c.sev === "fatal" && !c.fixed);
          const majorAlive = cards.some((c) => c.sev === "major" && !c.fixed);
          if (fatalAlive) {
            sfxWrong();
            outcome = `Провал релиза! Скрытый фатальный блокер обнулил выручку (остаток: ${coins}). Дешёвая проверка за 12 монет спасла бы весь запуск!`;
          } else {
            sfxOk();
            const reward = 120 - (majorAlive ? 35 : 0);
            coins += reward;
            outcome = `Успешный релиз! Выручка +${reward} → итоговый капитал: ${coins} монет${majorAlive ? " (средний риск съел 35, но фатальный блокер ты обезвредил!)" : " (чистое снятие рисков!)"}.`;
          }
          draw();
        });
      }
      const bN = slot.querySelector("#btn-dr-new");
      if (bN) bN.addEventListener("click", () => { sfxTap(); newGame(); });
    }
    newGame();
  }

  // ==================== 6. RICE + CONFIDENCE WITH ZERO-FLICKER SMOOTH SLIDERS ====================
  function renderRice(slot, ctx) {
    const customApi = ctx && ctx.customApi ? ctx.customApi : null;
    const saved = customApi ? customApi.getList("rice") : null;
    let damped = true;
    let items =
      saved && saved.length
        ? saved.map((x) => ({ ...x }))
        : [
            { id: "r1", name: "Яркая гипотеза (без данных)", reach: 100, impact: 3.0, conf: 20, effort: 4.0 },
            { id: "r2", name: "Доказанное узкое место (факт)", reach: 80, impact: 2.0, conf: 90, effort: 3.0 },
            { id: "r3", name: "Мелкая косметика кнопки", reach: 40, impact: 0.5, conf: 95, effort: 0.3 },
          ];

    function persist() {
      if (customApi) customApi.saveList("rice", items);
    }

    function updateRiceRankingOnly() {
      const scored = items.map((it) => ({ ...it, score: computeRiceScore(it, damped) })).sort((a, b) => b.score - a.score);
      const rankHost = slot.querySelector("#rice-rank-host");
      if (rankHost) {
        rankHost.innerHTML = scored
          .map(
            (it, pos) => `
              <div class="rank-row ${pos === 0 ? "top" : ""}">
                <div style="flex:1;">
                  <strong style="font-size:13px;">${pos + 1}. ${esc(it.name)}</strong>
                  <div class="muted-small">Охват ${it.reach} · Влияние ${it.impact} · Увер. ${it.conf}% · Усилия ${it.effort}</div>
                </div>
                <strong style="color:var(--accent);font-size:15px;margin-right:6px;">${it.score}</strong>
                <button type="button" class="wb-del rice-del" data-id="${esc(it.id)}">×</button>
              </div>
            `
          )
          .join("");
        rankHost.querySelectorAll(".rice-del").forEach((b) => {
          b.addEventListener("click", () => {
            sfxTap();
            items = items.filter((x) => x.id !== b.getAttribute("data-id"));
            persist();
            drawFull();
          });
        });
      }
    }

    function drawFull() {
      const ctrlHtml = items
        .map(
          (it, i) => `
            <div class="atom-box" style="margin-bottom:6px;">
              <strong style="color:var(--text);text-transform:none;font-size:12.5px;">${esc(it.name)}</strong>
              <div class="two-col" style="margin-top:4px;">
                <label class="muted-small">Влияние (<span id="rice-imp-lbl-${i}">${it.impact}</span>)<input type="range" min="0.5" max="3" step="0.5" value="${it.impact}" class="apple-range rice-imp" data-i="${i}"/></label>
                <label class="muted-small">Уверенность (<span id="rice-conf-lbl-${i}">${it.conf}</span>%)<input type="range" min="10" max="100" step="10" value="${it.conf}" class="apple-range rice-conf" data-i="${i}"/></label>
              </div>
              <div class="two-col" style="margin-top:4px;">
                <label class="muted-small">Охват (<span id="rice-rch-lbl-${i}">${it.reach}</span>)<input type="range" min="10" max="100" step="10" value="${it.reach}" class="apple-range rice-rch" data-i="${i}"/></label>
                <label class="muted-small">Усилия (<span id="rice-eff-lbl-${i}">${it.effort}</span>)<input type="range" min="0.3" max="8" step="0.3" value="${it.effort}" class="apple-range rice-eff" data-i="${i}"/></label>
              </div>
            </div>
          `
        )
        .join("");

      slot.innerHTML = `
        ${guideHtml("rice")}
        <div class="wb-input-row" style="margin-bottom:8px;">
          <input type="text" class="text-input" id="rice-inp" maxlength="70" placeholder="Добавить свою идею для скоринга RICE..." />
          <button type="button" class="btn-add-sm" id="btn-rice-add">Добавить</button>
        </div>
        <div class="inst-pills">
          <button type="button" class="inst-pill ${damped ? "active" : ""}" id="btn-rice-damp">Честный Effort^0.65</button>
          <button type="button" class="inst-pill ${!damped ? "active" : ""}" id="btn-rice-raw">Обычный / Effort</button>
        </div>
        <div class="card-stack" id="rice-rank-host" style="margin-bottom:10px;"></div>
        ${ctrlHtml}
      `;
      bindGuide(slot);
      updateRiceRankingOnly();

      const inp = slot.querySelector("#rice-inp");
      const doAdd = () => {
        const v = inp.value.trim();
        if (!v) return;
        sfxOk();
        items.push({ id: `r_${Date.now().toString(36)}`, name: v, reach: 60, impact: 2.0, conf: 70, effort: 2.0 });
        inp.value = "";
        persist();
        drawFull();
      };
      slot.querySelector("#btn-rice-add").addEventListener("click", doAdd);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
      slot.querySelector("#btn-rice-damp").addEventListener("click", () => { sfxTap(); damped = true; drawFull(); });
      slot.querySelector("#btn-rice-raw").addEventListener("click", () => { sfxTap(); damped = false; drawFull(); });

      const bindSlider = (cls, prop, lblPrefix) => {
        slot.querySelectorAll(cls).forEach((el) => {
          el.addEventListener("input", () => {
            const i = Number(el.getAttribute("data-i"));
            items[i][prop] = Number(el.value);
            const lbl = slot.querySelector(`#${lblPrefix}-${i}`);
            if (lbl) lbl.textContent = String(items[i][prop]);
            persist();
            updateRiceRankingOnly();
          });
        });
      };
      bindSlider(".rice-imp", "impact", "rice-imp-lbl");
      bindSlider(".rice-conf", "conf", "rice-conf-lbl");
      bindSlider(".rice-rch", "reach", "rice-rch-lbl");
      bindSlider(".rice-eff", "effort", "rice-eff-lbl");
    }
    drawFull();
  }

  // ==================== 7. KANO LIVE SVG CURVES + EXPLICIT BUCKET HIGHLIGHTS ====================
  function renderKanoMoscow(slot, ctx) {
    const customApi = ctx && ctx.customApi ? ctx.customApi : null;
    const saved = customApi ? customApi.getList("kano") : null;
    let features =
      saved && saved.length
        ? saved.map((x) => ({ ...x }))
        : [
            { id: "k1", name: "Идемпотентность и отсутствие утечек данных", kano: "must", bucket: "must" },
            { id: "k2", name: "Сохранение прогресса в CloudStorage", kano: "must", bucket: "must" },
            { id: "k3", name: "Скорость ответа < 1 сек", kano: "linear", bucket: "should" },
            { id: "k4", name: "Живой турнир Аксельрода и подземелье", kano: "delight", bucket: "should" },
            { id: "k5", name: "3D-аватары и звуки конфетти", kano: "noise", bucket: "wont" },
          ];
    const KANOS = ["must", "linear", "delight", "noise"];
    const KLBL = { must: "Гигиена", linear: "Линейная", delight: "Восторг", noise: "Шум" };
    const BUCKETS = ["must", "should", "wont"];
    const BLBL = { must: "● MUST (в 1-ю версию)", should: "◐ SHOULD (потом)", wont: "✕ WON'T (отсечено)" };

    function persist() {
      if (customApi) customApi.saveList("kano", features);
    }

    function dotCoords(kType, idx) {
      const shift = (idx % 4) * 26;
      if (kType === "delight") return [250 + shift, 52 - (idx % 4) * 8, "#4fd195"];
      if (kType === "linear") return [220 + shift, 74 - (idx % 4) * 10, "#67b0f0"];
      if (kType === "must") return [230 + shift, 96, "#ea756d"];
      return [110 + shift, 84, "#8b9bb0"];
    }

    function bucketStyle(b) {
      if (b === "must") return "background:rgba(79,209,149,0.2);border-color:var(--accent);color:#dcfaec;";
      if (b === "should") return "background:rgba(103,176,240,0.16);border-color:var(--sky);color:#d4ebfc;";
      return "background:rgba(234,117,109,0.16);border-color:var(--rose);color:#fcdbd8;";
    }

    function draw() {
      const mustCount = features.filter((f) => f.bucket === "must").length;
      const wontCount = features.filter((f) => f.bucket === "wont").length;
      const healthy = mustCount <= 3 && wontCount >= Math.min(2, Math.max(1, Math.floor(features.length / 3)));

      const dotsSvg = features
        .map((f, i) => {
          const [cx, cy, col] = dotCoords(f.kano, i);
          return `<circle cx="${cx}" cy="${cy}" r="10" fill="${col}" stroke="#0b0e13" stroke-width="1.8"/>
                  <text x="${cx}" y="${cy + 3.5}" text-anchor="middle" fill="#0b0e13" font-size="9.5" font-weight="800">${i + 1}</text>`;
        })
        .join("");

      const rows = features
        .map(
          (f, i) => `
            <div class="rank-row ${f.bucket === "must" ? "top" : ""}">
              <div style="flex:1;">
                <strong style="font-size:12.5px;">${i + 1}. ${esc(f.name)}</strong>
                <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">
                  <button type="button" class="btn-chip kano-type" data-i="${i}" style="font-size:10.5px;">Кривая: ${KLBL[f.kano]} ↻</button>
                  <button type="button" class="btn-chip kano-cyc" data-i="${i}" style="font-size:10.5px;${bucketStyle(f.bucket)}">${BLBL[f.bucket]}</button>
                </div>
              </div>
              <button type="button" class="wb-del kano-del" data-id="${esc(f.id)}">×</button>
            </div>
          `
        )
        .join("");

      slot.innerHTML = `
        ${guideHtml("kano")}
        <div class="wb-input-row" style="margin-bottom:8px;">
          <input type="text" class="text-input" id="kano-inp" maxlength="70" placeholder="Добавить свою фичу на кривые Кано..." />
          <button type="button" class="btn-add-sm" id="btn-kano-add">Добавить</button>
        </div>
        <div class="svg-frame" style="margin-bottom:10px;">
          <svg viewBox="0 0 400 156" class="inst-svg" role="img" aria-label="Живая карта Кано">
            <line x1="24" y1="84" x2="380" y2="84" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>
            <line x1="204" y1="14" x2="204" y2="142" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>
            <path d="M40 76 Q200 72 360 22" fill="none" stroke="#4fd195" stroke-width="2.2"/>
            <line x1="48" y1="132" x2="360" y2="36" stroke="#67b0f0" stroke-width="1.8" stroke-dasharray="5 4"/>
            <path d="M44 140 Q190 92 364 90" fill="none" stroke="#ea756d" stroke-width="2.2"/>
            ${dotsSvg}
            <text x="58" y="24" fill="#bdf4d6" font-size="9.5" font-weight="700">● Восторг</text>
            <text x="128" y="24" fill="#b7daf5" font-size="9.5" font-weight="700">● Линейная</text>
            <text x="296" y="132" fill="#fcdbd8" font-size="9.5" font-weight="700">● Гигиена</text>
          </svg>
        </div>
        <div class="card-meta-row" style="margin-bottom:6px;">
          <span>MUST: <strong>${mustCount}</strong> (лимит ≤3)</span>
          <span>WON'T (вычтено): <strong style="color:${healthy ? "var(--accent)" : "var(--rose)"};">${wontCount}</strong></span>
        </div>
        <div class="card-stack" style="margin-bottom:8px;">${rows}</div>
        <div class="quiz-explain">${
          healthy
            ? "Чистый фокус первой версии ✓: базовая надёжность в MUST, а лишнее честно вычтено в WON'T."
            : "Перегруз релиза! Нажимай на цветные метки корзин, чтобы оставить ≤3 в MUST и вычеркнуть лишнее в WON'T."
        }</div>
      `;
      bindGuide(slot);

      const inp = slot.querySelector("#kano-inp");
      const doAdd = () => {
        const v = inp.value.trim();
        if (!v) return;
        sfxOk();
        features.push({ id: `k_${Date.now().toString(36)}`, name: v, kano: "linear", bucket: "should" });
        inp.value = "";
        persist();
        draw();
      };
      slot.querySelector("#btn-kano-add").addEventListener("click", doAdd);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
      slot.querySelectorAll(".kano-type").forEach((b) => {
        b.addEventListener("click", () => {
          sfxTap();
          const i = Number(b.getAttribute("data-i"));
          features[i].kano = KANOS[(KANOS.indexOf(features[i].kano) + 1) % KANOS.length];
          persist();
          draw();
        });
      });
      slot.querySelectorAll(".kano-cyc").forEach((b) => {
        b.addEventListener("click", () => {
          sfxTap();
          const i = Number(b.getAttribute("data-i"));
          features[i].bucket = BUCKETS[(BUCKETS.indexOf(features[i].bucket) + 1) % BUCKETS.length];
          persist();
          draw();
        });
      });
      slot.querySelectorAll(".kano-del").forEach((b) => {
        b.addEventListener("click", () => {
          sfxTap();
          features = features.filter((x) => x.id !== b.getAttribute("data-id"));
          persist();
          draw();
        });
      });
    }
    draw();
  }

  // ==================== UNIFIED 7-OPTIC PRIORITY COMPASS ====================
  const PRIORITY_MODELS = [
    { id: "m2x2", label: "2×2 Оси", render: renderMatrix2x2 },
    { id: "toc", label: "TOC Игра", render: renderToc },
    { id: "wsjf", label: "WSJF Свои", render: renderWsjf },
    { id: "doors", label: "Двери·145", render: renderDoors },
    { id: "derisk", label: "Туман EVPI", render: renderDerisk },
    { id: "rice", label: "RICE Свои", render: renderRice },
    { id: "kano", label: "Кано·Won't", render: renderKanoMoscow },
  ];

  function mountPriorityCompass(container, ctx) {
    let activeModel = "m2x2";

    function draw() {
      const pills = PRIORITY_MODELS.map(
        (m) => `<button type="button" class="inst-pill ${m.id === activeModel ? "active" : ""}" data-pm="${m.id}">${esc(m.label)}</button>`
      ).join("");
      container.innerHTML = `
        ${guideHtml("matrix")}
        <div class="chip-scroll-wrap" style="margin-bottom:8px;">
          <div class="chip-scroll-row">${pills}</div>
        </div>
        <div id="priority-stage-slot"></div>
      `;
      bindGuide(container);
      container.querySelectorAll("[data-pm]").forEach((b) => {
        b.addEventListener("click", () => {
          sfxTap();
          activeModel = b.getAttribute("data-pm");
          draw();
        });
      });
      const mod = PRIORITY_MODELS.find((m) => m.id === activeModel) || PRIORITY_MODELS[0];
      mod.render(container.querySelector("#priority-stage-slot"), ctx);
    }
    draw();
  }

  return {
    PRIORITY_MODELS,
    mountPriorityCompass,
    computeTocThroughput,
    computeWsjfOrder,
    computeTotalDelayCost,
    computeRiceScore,
  };
});
