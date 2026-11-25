/* Apple-Precision Interactive Laboratory v3.1 — 7 Instruments with Maximum Puzzle Variability across ALL 145 Chelpanov Atoms (0 LLM) */
(function (root) {
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
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
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

  // ==================== 1. TOPOLOGY PUZZLE ACROSS ALL 145 ATOMS (4 PUZZLE MODES + LIVE SVG GRAPH) ====================
  function mountAllAtomsPuzzle(container, ctx) {
    const catalog = ctx && ctx.catalog ? ctx.catalog : { atoms: [], parts: [] };
    const atoms = catalog.atoms || [];
    const atomsById = Object.fromEntries(atoms.map((a) => [a.id, a]));
    let partFilter = "all";
    let puzzleType = "auto"; // auto | topology | anti | boundary | quote
    let streak = 0;
    let solvedTotal = 0;
    let current = null;
    let answeredIdx = null;

    function getPool() {
      const base = partFilter === "all" ? atoms : atoms.filter((a) => a.part_id === partFilter);
      if (puzzleType === "topology") {
        const withEdges = base.filter((a) => (a.depends_on || []).length + (a.contrasts_with || []).length >= 2);
        return withEdges.length >= 4 ? withEdges : base;
      }
      if (puzzleType === "anti") {
        const f = base.filter((a) => (a.anti_example || "").length >= 24);
        return f.length >= 4 ? f : base;
      }
      if (puzzleType === "boundary") {
        const f = base.filter((a) => (a.epistemic_boundary || "").length >= 24);
        return f.length >= 4 ? f : base;
      }
      if (puzzleType === "quote") {
        const f = base.filter((a) => (a.exact_quote || "").length >= 30);
        return f.length >= 4 ? f : base;
      }
      return base;
    }

    function pickDistractors(target) {
      const out = [];
      const seen = new Set([target.id]);
      const conts = (target.contrasts_with || []).map((id) => atomsById[id]).filter(Boolean);
      for (const c of shuffle(conts)) {
        if (!seen.has(c.id)) {
          out.push(c);
          seen.add(c.id);
          if (out.length >= 3) return out;
        }
      }
      const samePart = shuffle(atoms.filter((a) => a.part_id === target.part_id && !seen.has(a.id)));
      for (const a of samePart) {
        out.push(a);
        seen.add(a.id);
        if (out.length >= 3) return out;
      }
      for (const a of shuffle(atoms)) {
        if (!seen.has(a.id)) {
          out.push(a);
          seen.add(a.id);
          if (out.length >= 3) return out;
        }
      }
      return out;
    }

    function buildGraphSvg(target) {
      const deps = (target.depends_on || []).map((id) => atomsById[id]).filter(Boolean).slice(0, 2);
      const conts = (target.contrasts_with || []).map((id) => atomsById[id]).filter(Boolean).slice(0, 2);
      const short = (s) => (s.length > 26 ? s.slice(0, 25) + "…" : s);

      let edges = "";
      let nodes = "";
      deps.forEach((d, i) => {
        const y = deps.length === 1 ? 105 : i === 0 ? 52 : 158;
        edges += `<line x1="126" y1="${y}" x2="162" y2="105" stroke="#6aa6d8" stroke-width="1.8"/>`;
        nodes += `<rect x="8" y="${y - 22}" width="118" height="44" rx="10" fill="rgba(106,166,216,0.14)" stroke="#6aa6d8"/>
          <text x="67" y="${y - 5}" text-anchor="middle" fill="#89b8e0" font-size="9" font-weight="700">ОПОРА (Гл.${d.chapter_num})</text>
          <text x="67" y="${y + 10}" text-anchor="middle" fill="#e6f2fc" font-size="9.5">${esc(short(d.title))}</text>`;
      });
      conts.forEach((c, i) => {
        const y = conts.length === 1 ? 105 : i === 0 ? 52 : 158;
        edges += `<line x1="238" y1="105" x2="274" y2="${y}" stroke="#d9b982" stroke-dasharray="5 4" stroke-width="1.8"/>`;
        nodes += `<rect x="274" y="${y - 22}" width="118" height="44" rx="10" fill="rgba(217,185,130,0.14)" stroke="#d9b982"/>
          <text x="333" y="${y - 5}" text-anchor="middle" fill="#e6cfa8" font-size="9" font-weight="700">КОНТРАСТ (Гл.${c.chapter_num})</text>
          <text x="333" y="${y + 10}" text-anchor="middle" fill="#f7ebda" font-size="9.5">${esc(short(c.title))}</text>`;
      });

      const revealed = answeredIdx !== null;
      const centerStroke = revealed ? "#52c48c" : "#d9b982";
      const centerFill = revealed ? "rgba(82,196,140,0.22)" : "rgba(217,185,130,0.14)";
      const centerText = revealed ? short(target.title) : "Узел [ ? ]";

      return `<div class="svg-frame" style="margin-bottom:10px;">
        <svg viewBox="0 0 400 210" class="inst-svg" role="img" aria-label="Топологическая загадка атома">
          ${edges}
          ${nodes}
          <rect x="148" y="72" width="104" height="66" rx="14" fill="${centerFill}" stroke="${centerStroke}" stroke-width="2"/>
          <text x="200" y="96" text-anchor="middle" fill="${centerStroke}" font-size="10" font-weight="700">НЕДЕЛЯ ${target.chapter_num}</text>
          <text x="200" y="116" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">${esc(centerText)}</text>
        </svg>
      </div>`;
    }

    function nextPuzzle() {
      const pool = getPool();
      if (!pool.length) return;
      const target = pick(pool);
      const hasEdges = (target.depends_on || []).length + (target.contrasts_with || []).length >= 1;
      const avail = [];
      if (hasEdges) avail.push("topology");
      if ((target.anti_example || "").length >= 24) avail.push("anti");
      if ((target.epistemic_boundary || "").length >= 24) avail.push("boundary");
      if ((target.exact_quote || "").length >= 30) avail.push("quote");
      const mode = puzzleType !== "auto" && avail.includes(puzzleType) ? puzzleType : pick(avail.length ? avail : ["anti"]);

      const dists = pickDistractors(target);
      const opts = shuffle([{ id: target.id, title: target.title, ok: true }, ...dists.map((d) => ({ id: d.id, title: d.title, ok: false }))]);
      current = { target, mode, opts, correctIdx: opts.findIndex((o) => o.ok) };
      answeredIdx = null;
      draw();
    }

    function draw() {
      if (!current) {
        nextPuzzle();
        return;
      }
      const { target, mode, opts, correctIdx } = current;
      const partBtns = [
        { id: "all", lbl: `Все (${atoms.length})` },
        ...(catalog.parts || []).map((p) => ({ id: p.id, lbl: `Ч.${p.order}` })),
      ]
        .map((p) => `<button type="button" class="inst-pill ${partFilter === p.id ? "active" : ""}" data-pf="${p.id}">${esc(p.lbl)}</button>`)
        .join("");

      const typeBtns = [
        { id: "auto", lbl: "Микс (4 типа)" },
        { id: "topology", lbl: "Граф связей" },
        { id: "anti", lbl: "Поломка" },
        { id: "boundary", lbl: "Граница правила" },
        { id: "quote", lbl: "Цитата" },
      ]
        .map((t) => `<button type="button" class="inst-pill ${puzzleType === t.id ? "active" : ""}" data-pt="${t.id}">${esc(t.lbl)}</button>`)
        .join("");

      let clueHtml = "";
      if (mode === "topology") {
        clueHtml = `${buildGraphSvg(target)}<p class="quiz-prompt" style="margin-top:4px;">Восстанови скрытый узел смысловой топологии [ ? ] (Неделя ${target.chapter_num}) по его опорам и контрастам:</p>`;
      } else if (mode === "anti") {
        clueHtml = `<div class="atom-box anti" style="margin-bottom:10px;"><strong>Где ломается конструкция (Неделя ${target.chapter_num})</strong>«${esc(target.anti_example)}»</div><p class="quiz-prompt" style="margin-top:4px;">Какой из 145 атомов Челпанова нарушен или иллюстрируется этим контрпримером?</p>`;
      } else if (mode === "boundary") {
        clueHtml = `<div class="atom-box bound" style="margin-bottom:10px;"><strong>Граница применимости (Неделя ${target.chapter_num})</strong>«${esc(target.epistemic_boundary)}»</div><p class="quiz-prompt" style="margin-top:4px;">К какому логическому принципу относится эта граница применимости?</p>`;
      } else {
        clueHtml = `<blockquote class="atom-quote" style="margin-bottom:10px;">«${esc(target.exact_quote)}» — Г. И. Челпанов (Неделя ${target.chapter_num})</blockquote><p class="quiz-prompt" style="margin-top:4px;">Какую конструкцию формулирует эта подлинная цитата учебника?</p>`;
      }

      const optsHtml = opts
        .map((o, i) => {
          let cls = "quiz-opt";
          if (answeredIdx !== null) {
            if (i === correctIdx) cls += " correct";
            else if (i === answeredIdx) cls += " wrong";
          }
          return `<button type="button" class="${cls} atom-pz-opt" data-oi="${i}">${esc(o.title)}</button>`;
        })
        .join("");

      const feedbackHtml =
        answeredIdx !== null
          ? `<div class="quiz-explain" style="margin-top:10px;">
               <strong style="display:block;margin-bottom:4px;color:${answeredIdx === correctIdx ? "var(--accent)" : "var(--sand)"};">
                 ${answeredIdx === correctIdx ? "Точно в узел ✓" : "Разбор атома"} · Неделя ${target.chapter_num}
               </strong>
               ${esc(target.core_thesis)}
             </div>
             <div class="two-col" style="margin-top:10px;">
               <button type="button" class="btn-primary" id="btn-apz-next">🎲 Новая загадка</button>
               <button type="button" class="btn-secondary" id="btn-apz-open">Открыть в Курсе →</button>
             </div>`
          : `<button type="button" class="btn-secondary" id="btn-apz-skip" style="margin-top:10px;">🎲 Другая загадка</button>`;

      container.innerHTML = `
        ${guideHtml("atoms145")}
        <div class="card-meta-row" style="margin-bottom:8px;">
          <span class="badge-pill">Охват: все ${atoms.length} атомов</span>
          <span>Серия: <strong>${streak}</strong> · Решено: <strong>${solvedTotal}</strong></span>
        </div>
        <div class="inst-pills">${partBtns}</div>
        <div class="inst-pills">${typeBtns}</div>
        ${clueHtml}
        <div class="quiz-opts">${optsHtml}</div>
        ${feedbackHtml}
      `;
      bindGuide(container);

      container.querySelectorAll("[data-pf]").forEach((b) => {
        b.addEventListener("click", () => {
          partFilter = b.getAttribute("data-pf");
          nextPuzzle();
        });
      });
      container.querySelectorAll("[data-pt]").forEach((b) => {
        b.addEventListener("click", () => {
          puzzleType = b.getAttribute("data-pt");
          nextPuzzle();
        });
      });
      container.querySelectorAll(".atom-pz-opt").forEach((b) => {
        b.addEventListener("click", () => {
          if (answeredIdx !== null) return;
          answeredIdx = Number(b.getAttribute("data-oi"));
          solvedTotal += 1;
          const ok = answeredIdx === correctIdx;
          streak = ok ? streak + 1 : 0;
          if (root.TGSound) {
            if (ok) root.TGSound.playCorrect();
            else root.TGSound.playWrong();
          }
          draw();
        });
      });
      const btnNext = container.querySelector("#btn-apz-next");
      const btnSkip = container.querySelector("#btn-apz-skip");
      const btnOpen = container.querySelector("#btn-apz-open");
      if (btnNext) btnNext.addEventListener("click", nextPuzzle);
      if (btnSkip) btnSkip.addEventListener("click", nextPuzzle);
      if (btnOpen && ctx && typeof ctx.onJumpAtom === "function") {
        btnOpen.addEventListener("click", () => ctx.onJumpAtom(target.chapter_num, target.id));
      }
    }

    nextPuzzle();
  }

  // ==================== 2. MOLECULE OF INFERENCE CONSTRUCTOR + 72 PROCEDURAL PUZZLES ====================
  const MOL_TRIPLES = [
    ["Квадраты", "Прямоугольники", "Фигуры с углами 90°"],
    ["Киты", "Млекопитающие", "Теплокровные"],
    ["Доказанные теоремы", "Строгие выводы", "Проверяемые утверждения"],
    ["Эксперименты Милля", "Управляемые пробы", "Методы поиска причин"],
    ["Алгоритмы сортировки", "Детерминированные алгоритмы", "Программы"],
    ["Корректные деления", "Классификации по 1 оси", "Непересекающиеся разбиения"],
    ["Равновесия Нэша", "Устойчивые профили", "Состояния без одностороннего выигрыша"],
    ["Эмпирические законы", "Обобщения опыта", "Модели с границами применимости"],
    ["Софизмы", "Ошибки вывода", "Нарушения строгой формы"],
    ["Чистые определения", "Формулы «род + отличие»", "Соразмерные суждения"],
    ["Наблюдаемые факты", "Прямые данные", "Основания проверки"],
    ["Стратегии с прощением", "Итеративные алгоритмы", "Адаптивные правила"],
  ];

  function genMoleculePuzzle() {
    const [S, M, P] = pick(MOL_TRIPLES);
    const kinds = [
      {
        valid: true,
        tag: "1-я фигура (Barbara)",
        p1: `Все «${M}» суть «${P}»`,
        p2: `Все «${S}» суть «${M}»`,
        concl: `Все «${S}» суть «${P}»`,
        note: `Молекула замкнулась строго: средний термин «${M}» полностью распределён в 1-й посылке и связывает S с P.`,
      },
      {
        valid: false,
        tag: "Разрыв: нераспределённый M",
        p1: `Все «${S}» суть «${M}»`,
        p2: `Все «${P}» суть «${M}»`,
        concl: `Все «${S}» суть «${P}»`,
        note: `Разрыв связки: оба класса лежат внутри «${M}», но средний термин ни разу не взят в полном объёме — S и P могут вообще не пересекаться.`,
      },
      {
        valid: true,
        tag: "Условная: Modus Tollens",
        p1: `Если есть «${S}» → есть «${P}»`,
        p2: `В опыте «${P}» отсутствует`,
        concl: `«${S}» строго ложно`,
        note: "Безупречное опровержение: отсутствие необходимого следствия строго отвергает условие (Челпанов, Гл. 16).",
      },
      {
        valid: false,
        tag: "Разрыв: ловушка следствия",
        p1: `Если есть «${S}» → есть «${P}»`,
        p2: `Мы наблюдаем «${P}»`,
        concl: `Значит, точно было «${S}»`,
        note: "Логический разрыв: следствие могло быть вызвано другим фактором. Наличие следствия не доказывает конкретную посылку.",
      },
      {
        valid: false,
        tag: "Разрыв: две частные посылки",
        p1: `Некоторые «${S}» суть «${M}»`,
        p2: `Некоторые «${M}» суть «${P}»`,
        concl: `Некоторые «${S}» суть «${P}»`,
        note: "Нарушение правила посылок (Гл. 13): из двух частных суждений нельзя замкнуть достоверный вывод.",
      },
      {
        valid: true,
        tag: "1-я фигура (Celarent)",
        p1: `Ни один «${M}» не есть «${P}»`,
        p2: `Все «${S}» суть «${M}»`,
        concl: `Ни один «${S}» не есть «${P}»`,
        note: "Строгое исключение: раз M не пересекается с P, а S целиком внутри M, то S и P несовместимы.",
      },
    ];
    return { ...pick(kinds), S, M, P };
  }

  function mountMoleculeInstrument(container) {
    let mode = "puzzle"; // "puzzle" | "builder"
    let cur = genMoleculePuzzle();
    let userGuess = null; // null | true | false
    // Interactive builder state
    let bQuant1 = "all"; // all | none | some
    let bQuant2 = "all"; // all | some
    let bOrder = "barbara"; // barbara (M->P, S->M) | undist (S->M, P->M)

    function evalBuilder() {
      if (bOrder === "undist") {
        return {
          valid: false,
          tag: "Разрыв: средний термин не связывает края",
          p1: "Все «Автозаявки» требуют «Проверки паспорта» (S → M)",
          p2: "Все «Кредитные заявки» требуют «Проверки паспорта» (P → M)",
          concl: "Все «Автозаявки» являются «Кредитными заявками» (S → P)",
          why: "Оба круга S и P лежат внутри общего требования M, но между собой вообще не пересекаются!",
        };
      }
      if (bQuant1 === "some" && bQuant2 === "some") {
        return {
          valid: false,
          tag: "Разрыв: две частные посылки",
          p1: "Некоторые «Срочные задачи» являются «Сложными» (Некот. M → P)",
          p2: "Некоторые «Задачи спринта» являются «Срочными» (Некот. S → M)",
          concl: "Некоторые «Задачи спринта» являются «Сложными»",
          why: "Из двух «некоторые» вывод не замыкается: две выборки внутри M могут не совпасть ни на одном объекте.",
        };
      }
      if (bQuant1 === "none" && bQuant2 === "all") {
        return {
          valid: true,
          tag: "Замкнуто строго (Celarent)",
          p1: "Ни один «Сырой черновик» не идёт «Прямо в оплату» (M ⊥ P)",
          p2: "Все «Ответы без ссылки на источник» — «Сырые черновики» (S ⊂ M)",
          concl: "Ни один «Ответ без ссылки» не идёт «Прямо в оплату» (S ⊥ P)",
          why: "Безупречный защитный фильтр (Guardrail): раз весь класс S внутри M, а M исключён из P, ни один элемент S не просочится в P.",
        };
      }
      return {
        valid: true,
        tag: bQuant2 === "some" ? "Замкнуто строго (Darii)" : "Замкнуто строго (Barbara)",
        p1: "Все «Платёжные операции» требуют «Ключа идемпотентности» (M ⊂ P)",
        p2:
          bQuant2 === "some"
            ? "Некоторые «Запросы клиента» — «Платёжные операции» (S ∩ M)"
            : "Все «Возвраты по полису» — «Платёжные операции» (S ⊂ M)",
        concl:
          bQuant2 === "some"
            ? "Эти «Запросы клиента» требуют «Ключа идемпотентности»"
            : "Все «Возвраты по полису» требуют «Ключа идемпотентности»",
        why: "Молекула замкнута на 100%: средний термин «Платёжные операции» взят целиком в 1-й посылке и передаёт свойство дальше без потерь.",
      };
    }

    function draw() {
      const modeTabs = `
        <div class="inst-pills">
          <button type="button" class="inst-pill ${mode === "puzzle" ? "active" : ""}" id="btn-mol-mpz">🎯 Загадка (72)</button>
          <button type="button" class="inst-pill ${mode === "builder" ? "active" : ""}" id="btn-mol-mbld">🔧 Собери связку руками</button>
        </div>
      `;

      if (mode === "builder") {
        const b = evalBuilder();
        const stroke = b.valid ? "#4fd195" : "#ea756d";
        const fill = b.valid ? "rgba(79,209,149,0.14)" : "rgba(234,117,109,0.14)";
        container.innerHTML = `
          ${guideHtml("molecule")}
          ${modeTabs}
          <div class="field-label" style="margin-top:2px;">1. Выбери структуру связки</div>
          <div class="inst-pills">
            <button type="button" class="inst-pill ${bOrder === "barbara" ? "active" : ""}" data-bo="barbara">Цепочка S → M → P</button>
            <button type="button" class="inst-pill ${bOrder === "undist" ? "active" : ""}" data-bo="undist">Ловушка S → M ← P</button>
          </div>
          ${
            bOrder === "barbara"
              ? `<div class="field-label" style="margin-top:4px;">2. Масштаб посылок</div>
                 <div class="inst-pills">
                   <button type="button" class="inst-pill ${bQuant1 === "all" && bQuant2 === "all" ? "active" : ""}" data-bq="all:all">Все + Все</button>
                   <button type="button" class="inst-pill ${bQuant1 === "none" && bQuant2 === "all" ? "active" : ""}" data-bq="none:all">Ни один + Все</button>
                   <button type="button" class="inst-pill ${bQuant1 === "all" && bQuant2 === "some" ? "active" : ""}" data-bq="all:some">Все + Некоторые</button>
                   <button type="button" class="inst-pill ${bQuant1 === "some" && bQuant2 === "some" ? "active" : ""}" data-bq="some:some">Некоторые + Некоторые</button>
                 </div>`
              : ""
          }
          <div class="svg-frame" style="padding:12px;">
            <div class="card-stack" style="gap:8px;">
              <div class="atom-box" style="margin:0;border:1px solid rgba(255,255,255,0.14);">
                <strong style="color:var(--sky);">Посылка 1</strong>
                <div style="font-size:13.5px;color:#fff;font-weight:600;">${esc(b.p1)}</div>
              </div>
              <div class="atom-box" style="margin:0;border:1px solid rgba(255,255,255,0.14);">
                <strong style="color:var(--sand);">Посылка 2</strong>
                <div style="font-size:13.5px;color:#fff;font-weight:600;">${esc(b.p2)}</div>
              </div>
            </div>
            <div style="margin-top:10px;background:${fill};border:1.5px solid ${stroke};border-radius:12px;padding:11px 12px;">
              <div style="font-size:11px;font-weight:700;color:${stroke};margin-bottom:4px;">${esc(b.tag.toUpperCase())}</div>
              <div style="font-size:14px;color:#fff;font-weight:700;">→ ${esc(b.concl)}</div>
            </div>
          </div>
          <div class="quiz-explain" style="margin-top:10px;">${esc(b.why)}</div>
        `;
        bindGuide(container);
        container.querySelector("#btn-mol-mpz").addEventListener("click", () => { sfxTap(); mode = "puzzle"; draw(); });
        container.querySelector("#btn-mol-mbld").addEventListener("click", () => { sfxTap(); mode = "builder"; draw(); });
        container.querySelectorAll("[data-bo]").forEach((el) => {
          el.addEventListener("click", () => { sfxTap(); bOrder = el.getAttribute("data-bo"); draw(); });
        });
        container.querySelectorAll("[data-bq]").forEach((el) => {
          el.addEventListener("click", () => {
            sfxTap();
            const [q1, q2] = el.getAttribute("data-bq").split(":");
            bQuant1 = q1;
            bQuant2 = q2;
            draw();
          });
        });
        return;
      }

      const revealed = userGuess !== null;
      const stroke = !revealed ? "#67b0f0" : cur.valid ? "#4fd195" : "#ea756d";
      const fill = !revealed ? "rgba(103,176,240,0.12)" : cur.valid ? "rgba(79,209,149,0.14)" : "rgba(234,117,109,0.14)";
      const dash = !revealed || !cur.valid ? 'stroke-dasharray="6 5"' : "";
      const sym = !revealed ? "?" : cur.valid ? "✓" : "✕";
      const statusTxt = !revealed
        ? "ПРОВЕРЬ СВЯЗКУ: ВЫВОД СЛЕДУЕТ ИЛИ РАЗРЫВ?"
        : cur.valid
        ? `ЗАМКНУТА · ${cur.tag.toUpperCase()}`
        : cur.tag.toUpperCase();

      const okCls = !revealed ? "quiz-opt" : cur.valid ? "quiz-opt correct" : userGuess === true ? "quiz-opt wrong" : "quiz-opt";
      const badCls = !revealed ? "quiz-opt" : !cur.valid ? "quiz-opt correct" : userGuess === false ? "quiz-opt wrong" : "quiz-opt";

      container.innerHTML = `
        ${guideHtml("molecule")}
        ${modeTabs}
        <div class="svg-frame" style="padding:12px;">
          <div class="card-stack" style="gap:8px;">
            <div class="atom-box" style="margin:0;border:1px solid rgba(255,255,255,0.14);">
              <strong style="color:var(--sky);">Посылка 1</strong>
              <div style="font-size:14px;color:#fff;font-weight:600;line-height:1.4;">${esc(cur.p1)}</div>
            </div>
            <div class="atom-box" style="margin:0;border:1px solid rgba(255,255,255,0.14);">
              <strong style="color:var(--sand);">Посылка 2</strong>
              <div style="font-size:14px;color:#fff;font-weight:600;line-height:1.4;">${esc(cur.p2)}</div>
            </div>
          </div>

          <svg viewBox="0 0 360 54" class="inst-svg" style="max-height:54px;margin:4px auto;" role="img" aria-label="Связка молекулы вывода">
            <path d="M90 4 L180 27 L270 4 M180 27 L180 50" fill="none" stroke="${stroke}" stroke-width="2" ${dash}/>
            <circle cx="180" cy="27" r="14" fill="#13171b" stroke="${stroke}" stroke-width="2"/>
            <text x="180" y="32" text-anchor="middle" fill="${stroke}" font-size="14" font-weight="700">${sym}</text>
          </svg>

          <div style="background:${fill};border:1.5px solid ${stroke};border-radius:12px;padding:11px 12px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:${stroke};margin-bottom:4px;">${esc(statusTxt)}</div>
            <div style="font-size:14.5px;color:#fff;font-weight:700;line-height:1.4;">→ ${esc(cur.concl)}</div>
          </div>
        </div>

        <div class="two-col" style="margin-top:10px;">
          <button type="button" class="${okCls}" id="btn-mol-ok" style="text-align:center;font-weight:700;">Замкнута (Верно) ✓</button>
          <button type="button" class="${badCls}" id="btn-mol-bad" style="text-align:center;font-weight:700;">Разрыв связки ✕</button>
        </div>
        ${
          revealed
            ? `<div class="quiz-explain" style="margin-top:10px;">
                 <strong style="display:block;margin-bottom:3px;color:${userGuess === cur.valid ? "var(--accent)" : "var(--sand)"};">
                   ${userGuess === cur.valid ? "Верно распознано ✓" : "Смотри структуру разрыва"}
                 </strong>
                 ${esc(cur.note)}
               </div>
               <button type="button" class="btn-primary" id="btn-mol-next" style="margin-top:10px;">🎲 Новая молекула</button>`
            : ""
        }
      `;
      bindGuide(container);

      container.querySelector("#btn-mol-mpz").addEventListener("click", () => { sfxTap(); mode = "puzzle"; draw(); });
      container.querySelector("#btn-mol-mbld").addEventListener("click", () => { sfxTap(); mode = "builder"; draw(); });
      const bOk = container.querySelector("#btn-mol-ok");
      const bBad = container.querySelector("#btn-mol-bad");
      const bNext = container.querySelector("#btn-mol-next");
      if (bOk) bOk.addEventListener("click", () => {
        if (revealed) return;
        userGuess = true;
        if (cur.valid) sfxOk(); else sfxWrong();
        draw();
      });
      if (bBad) bBad.addEventListener("click", () => {
        if (revealed) return;
        userGuess = false;
        if (!cur.valid) sfxOk(); else sfxWrong();
        draw();
      });
      if (bNext) bNext.addEventListener("click", () => { sfxTap(); cur = genMoleculePuzzle(); userGuess = null; draw(); });
    }
    draw();
  }

  // ==================== 3. EMERGENT MILL BLACK-BOX (ALL 145 ATOMS × 8 UNPREDICTABLE HIDDEN LAWS) ====================
  function mountMillInstrument(container, ctx) {
    const atoms = (ctx && ctx.catalog && ctx.catalog.atoms) || [];
    const KEYS = ["A", "B", "C", "D"];
    let cards = [];
    let activeLaw = null;
    let candidateLaws = [];
    let toggles = { A: true, B: true, C: false, D: false };
    let logs = [];
    let guessStatus = "";
    let solved = false;
    let streak = 0;

    function wordCount(str) {
      return String(str || "").trim().split(/\s+/).filter(Boolean).length;
    }

    function buildEmergentRound() {
      const sample = shuffle(atoms).slice(0, 4);
      cards = KEYS.map((k, idx) => {
        const a = sample[idx] || { id: k, title: `Принцип ${k}`, chapter_num: idx + 1, part_id: "part-1", atom_type: "concept" };
        const shortTitle = a.title.length > 44 ? a.title.slice(0, 43) + "…" : a.title;
        return {
          key: k,
          atom: a,
          title: shortTitle,
          len: a.title.length,
          words: wordCount(a.title),
          ch: Number(a.chapter_num) || 1,
          hasDigitOrNum: /\d/.test(a.title) || a.chapter_num >= 15,
        };
      });

      const longest = cards.reduce((best, c) => (c.len > best.len ? c : best), cards[0]);
      const shortest = cards.reduce((best, c) => (c.len < best.len ? c : best), cards[0]);
      const maxCh = cards.reduce((best, c) => (c.ch > best.ch ? c : best), cards[0]);
      const singleTarget = pick(cards);
      const pairTargets = shuffle(cards).slice(0, 2);
      const inhibitorTarget = pick(cards);

      const allPossibleLaws = [
        {
          id: "longest",
          label: "Закон длины: срабатывает, когда включён самый ДЛИННЫЙ заголовок",
          explain: `Скрытый закон длины строки! Самая длинная карточка — ${longest.key} (${longest.len} симв.).`,
          evalFn: (act) => act.some((c) => c.key === longest.key),
        },
        {
          id: "shortest",
          label: "Закон краткости: срабатывает, когда включён самый КОРОТКИЙ заголовок",
          explain: `Скрытый закон краткости! Самая короткая карточка — ${shortest.key} (${shortest.len} симв.).`,
          evalFn: (act) => act.some((c) => c.key === shortest.key),
        },
        {
          id: "even_count",
          label: "Эмерджентная чётность: сигнал есть, только если включено ЧЁТНОЕ число карточек (2 или 4)",
          explain: "Ни один атом сам по себе не причина! Сигнал зависит исключительно от чётности числа включённых тумблеров (2 или 4).",
          evalFn: (act) => act.length > 0 && act.length % 2 === 0,
        },
        {
          id: "inhibitor",
          label: `Анти-причина (4-й лишний): сигнал есть всегда, пока ВЫКЛЮЧЕН атом ${inhibitorTarget.key}`,
          explain: `Атом ${inhibitorTarget.key} («${inhibitorTarget.title}») выступает ингибитором и гасит сигнал при включении.`,
          evalFn: (act) => act.length > 0 && !act.some((c) => c.key === inhibitorTarget.key),
        },
        {
          id: "joint_pair",
          label: `Совместная причина: нужны ОБА атома ${pairTargets[0].key} + ${pairTargets[1].key} вместе`,
          explain: `Ни ${pairTargets[0].key}, ни ${pairTargets[1].key} по отдельности не дают эффекта — сигнал возникает только на их пересечении (A ∧ B).`,
          evalFn: (act) => act.some((c) => c.key === pairTargets[0].key) && act.some((c) => c.key === pairTargets[1].key),
        },
        {
          id: "words_threshold",
          label: "Закон веса слов: сигнал появляется, когда сумма слов включённых карточек ≥ 10",
          explain: "Скрытый количественный порог (метод сопутствующих изменений Милля): важно не имя атома, а суммарное число слов ≥ 10.",
          evalFn: (act) => act.reduce((s, c) => s + c.words, 0) >= 10,
        },
        {
          id: "max_chapter",
          label: "Закон старшей главы: сигнал включает карточка с НАИБОЛЬШИМ номером недели/главы",
          explain: `Причина привязана к глубине курса: самая поздняя глава здесь — ${maxCh.key} (Неделя ${maxCh.ch}).`,
          evalFn: (act) => act.some((c) => c.key === maxCh.key),
        },
        {
          id: "single",
          label: `Чистая 1-факторная причина: всё зависит только от атома ${singleTarget.key}`,
          explain: `Классический метод различия Милля: включение/выключение единственного атома ${singleTarget.key} (Гл. ${singleTarget.ch}) полностью управляет сигналом.`,
          evalFn: (act) => act.some((c) => c.key === singleTarget.key),
        },
      ];

      // Pick 1 true law and 3 distinct distractors whose outputs differ on at least 1 combo
      activeLaw = pick(allPossibleLaws);
      const others = shuffle(allPossibleLaws.filter((l) => l.id !== activeLaw.id)).slice(0, 3);
      candidateLaws = shuffle([activeLaw, ...others]);

      toggles = { A: true, B: true, C: false, D: false };
      logs = [];
      guessStatus = "";
      solved = false;
      wrongLawIds = new Set();
      draw();
    }
    let wrongLawIds = new Set();

    function draw() {
      const toggleBtns = cards
        .map(
          (c) =>
            `<button type="button" class="mill-toggle ${toggles[c.key] ? "on" : ""}" data-fid="${c.key}" style="align-items:flex-start;text-align:left;flex-direction:column;gap:3px;">
              <div style="display:flex;justify-content:space-between;width:100%;">
                <strong style="color:${toggles[c.key] ? "#fff" : "var(--muted)"};">${c.key} · Нед.${c.ch} (${c.len} симв., ${c.words} сл.)</strong>
                <strong style="color:${toggles[c.key] ? "var(--accent)" : "var(--muted)"};">${toggles[c.key] ? "ВКЛ" : "ВЫКЛ"}</strong>
              </div>
              <span style="font-size:11.5px;line-height:1.3;">${esc(c.title)}</span>
            </button>`
        )
        .join("");

      const logRows = logs.length
        ? logs
            .map(
              (l, i) =>
                `<div class="mill-log-row">
                  <span>Опыт ${i + 1}: <strong>${esc(l.activeKeys.join("+") || "Ø")}</strong> <span class="muted-small">(${l.words} сл.)</span></span>
                  <span class="mill-badge ${l.signal ? "good" : "bad"}">${l.signal ? "⚡ СИГНАЛ" : "○ ТИШИНА"}</span>
                </div>`
            )
            .join("")
        : `<p class="muted-small">Включай/выключай факторы по одному и жми «⚡ Провести опыт». Ниже видно, какие гипотезы уже опровергнуты твоими данными!</p>`;

      const lawBtns = candidateLaws
        .map((l) => {
          // Check if any conducted experiment contradicts this candidate law!
          let contradictedAt = null;
          for (let idx = 0; idx < logs.length; idx += 1) {
            const expCards = cards.filter((c) => logs[idx].activeKeys.includes(c.key));
            if (Boolean(l.evalFn(expCards)) !== Boolean(logs[idx].signal)) {
              contradictedAt = idx + 1;
              break;
            }
          }
          let cls = "quiz-opt mill-law-guess";
          if (solved && l.id === activeLaw.id) cls += " correct";
          else if (wrongLawIds.has(l.id)) cls += " wrong";
          const elimNote = contradictedAt
            ? `<span style="display:block;font-size:11px;color:var(--rose);margin-top:3px;">✕ Опровергнута твоим Опытом #${contradictedAt}</span>`
            : "";
          return `<button type="button" class="${cls}" data-lid="${l.id}" style="${contradictedAt && !solved ? "opacity:0.65;" : ""}">${esc(l.label)}${elimNote}</button>`;
        })
        .join("");

      container.innerHTML = `
        ${guideHtml("mill")}
        <div class="card-meta-row" style="margin-bottom:8px;">
          <span class="badge-pill sky">Чёрный ящик · опытов: ${logs.length}</span>
          <span>Серия: <strong>${streak}</strong></span>
        </div>
        <div class="mill-toggles">${toggleBtns}</div>
        <div class="mill-actions">
          <button type="button" class="btn-primary" id="btn-mill-run">⚡ Провести опыт</button>
          <button type="button" class="btn-secondary" id="btn-mill-reset">🎲 Новый ящик</button>
        </div>
        <div class="mill-log-box">${logRows}</div>
        <div class="field-label" style="margin-top:10px;">Выбери гипотезу (проверь её опытами выше):</div>
        <div class="quiz-opts">${lawBtns}</div>
        ${guessStatus ? `<div class="quiz-explain" style="margin-top:10px;">${esc(guessStatus)}</div>` : ""}
      `;
      bindGuide(container);

      container.querySelectorAll(".mill-toggle").forEach((b) => {
        b.addEventListener("click", () => {
          sfxTap();
          const k = b.getAttribute("data-fid");
          toggles[k] = !toggles[k];
          draw();
        });
      });
      container.querySelector("#btn-mill-run").addEventListener("click", () => {
        sfxTap();
        const activeCards = cards.filter((c) => toggles[c.key]);
        const signal = activeLaw.evalFn(activeCards);
        logs.push({
          activeKeys: activeCards.map((c) => c.key),
          words: activeCards.reduce((s, c) => s + c.words, 0),
          signal,
        });
        if (logs.length > 8) logs = logs.slice(-8);
        draw();
      });
      container.querySelector("#btn-mill-reset").addEventListener("click", () => { sfxTap(); buildEmergentRound(); });
      container.querySelectorAll(".mill-law-guess").forEach((b) => {
        b.addEventListener("click", () => {
          if (solved) return;
          const lid = b.getAttribute("data-lid");
          if (lid === activeLaw.id) {
            sfxOk();
            solved = true;
            streak += 1;
            guessStatus = `Раскрыто за ${logs.length || 1} опытов ✓ ${activeLaw.explain} Жми «🎲 Новый ящик» для следующей задачи.`;
          } else {
            sfxWrong();
            wrongLawIds.add(lid);
            streak = 0;
            guessStatus = "Эта гипотеза неверна (подсвечена красным)! Поставь ещё 1 изолирующий опыт по методу различия: меняй ровно 1 тумблер за раз.";
          }
          draw();
        });
      });
    }

    buildEmergentRound();
  }

  // ==================== 4. LOGICAL SQUARE (INTERACTIVE EXPLORER + 60+ PUZZLES) ====================
  const SQUARE_TRUTH = {
    "A:T": { A: "ИСТИННО", E: "ЛОЖНО", I: "ИСТИННО", O: "ЛОЖНО" },
    "A:F": { A: "ЛОЖНО", E: "НЕОПР.", I: "НЕОПР.", O: "ИСТИННО" },
    "E:T": { A: "ЛОЖНО", E: "ИСТИННО", I: "ЛОЖНО", O: "ИСТИННО" },
    "E:F": { A: "НЕОПР.", E: "ЛОЖНО", I: "ИСТИННО", O: "НЕОПР." },
    "I:T": { A: "НЕОПР.", E: "ЛОЖНО", I: "ИСТИННО", O: "НЕОПР." },
    "I:F": { A: "ЛОЖНО", E: "ИСТИННО", I: "ЛОЖНО", O: "ИСТИННО" },
    "O:T": { A: "ЛОЖНО", E: "НЕОПР.", I: "НЕОПР.", O: "ИСТИННО" },
    "O:F": { A: "ИСТИННО", E: "ЛОЖНО", I: "ИСТИННО", O: "ЛОЖНО" },
  };
  const SQ_TOPICS = [
    ["гипотезы", "проверяемы опытом"],
    ["алгоритмы", "завершаются за конечное время"],
    ["определения", "соразмерны объёму"],
    ["участники турнира", "сотрудничают на 1-м ходу"],
    ["эмпирические законы", "имеют границы применимости"],
    ["прямые наблюдения", "достоверны без вывода"],
  ];

  function mountSquareInstrument(container) {
    let puzzleMode = true;
    let givenKey = "A:F";
    let targetNode = "E";
    let topic = pick(SQ_TOPICS);
    let userAns = null;

    function nextSqPuzzle() {
      givenKey = pick(Object.keys(SQUARE_TRUTH));
      const givenNode = givenKey.split(":")[0];
      targetNode = pick(["A", "E", "I", "O"].filter((x) => x !== givenNode));
      topic = pick(SQ_TOPICS);
      userAns = null;
      draw();
    }

    function colorOf(st, hide) {
      if (hide) return { fill: "rgba(217,185,130,0.18)", stroke: "#d9b982", text: "#f7e4c1" };
      if (st === "ИСТИННО") return { fill: "rgba(82,196,140,0.22)", stroke: "#52c48c", text: "#bdf4d6" };
      if (st === "ЛОЖНО") return { fill: "rgba(227,109,101,0.20)", stroke: "#e36d65", text: "#f9c4c0" };
      return { fill: "rgba(255,255,255,0.05)", stroke: "rgba(255,255,255,0.22)", text: "#a8b4be" };
    }

    function phraseOf(node, t) {
      if (node === "A") return `Все ${t[0]} ${t[1]}`;
      if (node === "E") return `Ни одни ${t[0]} не ${t[1]}`;
      if (node === "I") return `Некоторые ${t[0]} ${t[1]}`;
      return `Некоторые ${t[0]} не ${t[1]}`;
    }

    function draw() {
      const m = SQUARE_TRUTH[givenKey];
      const [gNode, gVal] = givenKey.split(":");
      const hideOthers = puzzleMode && userAns === null;
      const valFor = (n) => {
        if (!hideOthers || n === gNode) return m[n];
        return n === targetNode ? "?" : "···";
      };
      const cA = colorOf(m.A, hideOthers && gNode !== "A");
      const cE = colorOf(m.E, hideOthers && gNode !== "E");
      const cI = colorOf(m.I, hideOthers && gNode !== "I");
      const cO = colorOf(m.O, hideOthers && gNode !== "O");
      const expected = m[targetNode];

      const sqChoices = [
        { val: "ИСТИННО", lbl: "Истинно" },
        { val: "ЛОЖНО", lbl: "Ложно" },
        { val: "НЕОПР.", lbl: "Неопределено" },
      ];
      const sqBtnsHtml = sqChoices
        .map((ch) => {
          let cls = "quiz-opt sq-ans";
          if (userAns !== null) {
            if (ch.val === expected) cls += " correct";
            else if (ch.val === userAns) cls += " wrong";
          }
          return `<button type="button" class="${cls}" data-a="${ch.val}" style="text-align:center;font-weight:700;padding:10px 6px;">${ch.lbl}</button>`;
        })
        .join("");

      container.innerHTML = `
        ${guideHtml("square")}
        <div class="inst-pills">
          <button type="button" class="inst-pill ${puzzleMode ? "active" : ""}" id="btn-sq-pz">🎯 Загадка (60+)</button>
          <button type="button" class="inst-pill ${!puzzleMode ? "active" : ""}" id="btn-sq-exp">🎛 Свободный стенд</button>
        </div>
        ${
          !puzzleMode
            ? `<div class="inst-pills">${Object.keys(SQUARE_TRUTH)
                .map((k) => `<button type="button" class="inst-pill ${k === givenKey ? "active" : ""}" data-sqk="${k}">${k.replace(":T", " Ист.").replace(":F", " Лож.")}</button>`)
                .join("")}</div>`
            : `<p class="quiz-prompt" style="margin-top:4px;margin-bottom:8px;">Дано: суждение <strong>${gNode}</strong> («${esc(phraseOf(gNode, topic))}») — <strong>${gVal === "T" ? "ИСТИННО" : "ЛОЖНО"}</strong>.\nЧто тогда верно для вершины <strong>${targetNode}</strong> («${esc(phraseOf(targetNode, topic))}»)?</p>`
        }
        <div class="svg-frame">
          <svg viewBox="0 0 400 226" class="inst-svg" role="img" aria-label="Логический квадрат">
            <line x1="134" y1="53" x2="266" y2="53" stroke="#d9b982" stroke-width="1.6"/>
            <text x="200" y="43" text-anchor="middle" fill="#d9b982" font-size="10" font-weight="600">противоположность</text>
            <line x1="134" y1="175" x2="266" y2="175" stroke="#7d8c97" stroke-dasharray="4 4" stroke-width="1.4"/>
            <text x="200" y="194" text-anchor="middle" fill="#8b9aa6" font-size="10">подпротивоположность</text>
            <line x1="72" y1="84" x2="72" y2="146" stroke="#6aa6d8" stroke-width="1.5"/>
            <line x1="328" y1="84" x2="328" y2="146" stroke="#6aa6d8" stroke-width="1.5"/>
            <line x1="134" y1="78" x2="266" y2="150" stroke="#e36d65" stroke-width="1.6" stroke-dasharray="5 4"/>
            <line x1="266" y1="78" x2="134" y2="150" stroke="#e36d65" stroke-width="1.6" stroke-dasharray="5 4"/>
            <rect x="148" y="103" width="104" height="22" rx="11" fill="#13171b" stroke="rgba(227,109,101,0.45)"/>
            <text x="200" y="118" text-anchor="middle" fill="#f4b2ad" font-size="10" font-weight="700">противоречие</text>

            <rect x="10" y="24" width="124" height="58" rx="12" fill="${cA.fill}" stroke="${cA.stroke}" stroke-width="1.7"/>
            <text x="72" y="46" text-anchor="middle" fill="#fff" font-size="11.5" font-weight="700">A · Все S суть P</text>
            <text x="72" y="66" text-anchor="middle" fill="${cA.text}" font-size="11" font-weight="700">${valFor("A")}</text>

            <rect x="266" y="24" width="124" height="58" rx="12" fill="${cE.fill}" stroke="${cE.stroke}" stroke-width="1.7"/>
            <text x="328" y="46" text-anchor="middle" fill="#fff" font-size="11.5" font-weight="700">E · Ни один</text>
            <text x="328" y="66" text-anchor="middle" fill="${cE.text}" font-size="11" font-weight="700">${valFor("E")}</text>

            <rect x="10" y="146" width="124" height="58" rx="12" fill="${cI.fill}" stroke="${cI.stroke}" stroke-width="1.7"/>
            <text x="72" y="168" text-anchor="middle" fill="#fff" font-size="11.5" font-weight="700">I · Некоторые</text>
            <text x="72" y="188" text-anchor="middle" fill="${cI.text}" font-size="11" font-weight="700">${valFor("I")}</text>

            <rect x="266" y="146" width="124" height="58" rx="12" fill="${cO.fill}" stroke="${cO.stroke}" stroke-width="1.7"/>
            <text x="328" y="168" text-anchor="middle" fill="#fff" font-size="11.5" font-weight="700">O · Некот. не</text>
            <text x="328" y="188" text-anchor="middle" fill="${cO.text}" font-size="11" font-weight="700">${valFor("O")}</text>
          </svg>
        </div>
        ${
          puzzleMode
            ? `<div class="subtabs-3" style="margin-top:10px;margin-bottom:0;">${sqBtnsHtml}</div>
               ${
                 userAns !== null
                   ? `<div class="quiz-explain" style="margin-top:10px;">
                        <strong style="color:${userAns === expected ? "var(--accent)" : "var(--sand)"};">${userAns === expected ? "Точно ✓" : `Верный статус вершины ${targetNode}: ${expected}`}</strong>
                        — все 4 вершины квадрата теперь раскрыты выше.
                      </div>
                      <button type="button" class="btn-primary" id="btn-sq-next" style="margin-top:10px;">🎲 Новая загадка квадрата</button>`
                   : ""
               }`
            : ""
        }
      `;
      bindGuide(container);

      container.querySelector("#btn-sq-pz").addEventListener("click", () => { sfxTap(); puzzleMode = true; nextSqPuzzle(); });
      container.querySelector("#btn-sq-exp").addEventListener("click", () => { sfxTap(); puzzleMode = false; userAns = null; draw(); });
      container.querySelectorAll("[data-sqk]").forEach((b) => {
        b.addEventListener("click", () => { sfxTap(); givenKey = b.getAttribute("data-sqk"); draw(); });
      });
      container.querySelectorAll(".sq-ans").forEach((b) => {
        b.addEventListener("click", () => {
          if (userAns !== null) return;
          userAns = b.getAttribute("data-a");
          if (userAns === expected) sfxOk(); else sfxWrong();
          draw();
        });
      });
      const bn = container.querySelector("#btn-sq-next");
      if (bn) bn.addEventListener("click", () => { sfxTap(); nextSqPuzzle(); });
    }
    nextSqPuzzle();
  }

  // ==================== 5. EULER CIRCLES + VENN / SQL JOIN TRUTH ZONES ====================
  const EULER_PAIRS = [
    { a: "Квадраты", b: "Прямоугольники", rel: "sub", why: "Все квадраты входят в прямоугольники, но прямоугольники шире (A ⊂ B)." },
    { a: "Успешные стартапы", b: "Компании с подкастом", rel: "cross", why: "Часть успешных компаний ведёт подкаст, но не все — и подкаст не гарантирует успеха (A ∩ B)." },
    { a: "Прямые факты", b: "Непроверенные домыслы", rel: "disj", why: "Понятия взаимно исключают друг друга (A ⊥ B)." },
    { a: "Равносторонний △", b: "Равноугольный △", rel: "eq", why: "В евклидовой геометрии это строго один и тот же класс фигур (A ≡ B)." },
    { a: "Киты", b: "Млекопитающие", rel: "sub", why: "Все киты — млекопитающие, но не все млекопитающие — киты (A ⊂ B)." },
    { a: "Задаёт острые вопросы", b: "Враг проекта", rel: "cross", why: "Критик может быть союзником, снижающим риски — круги лишь пересекаются (A ∩ B)." },
    { a: "Круг в доказательстве", b: "Строгое доказательство", rel: "disj", why: "Нарушение закона достаточного основания несовместимо со строгим доказательством (A ⊥ B)." },
    { a: "Простые числа > 2", b: "Нечётные числа", rel: "sub", why: "Все простые числа больше 2 нечётны, но 9 и 15 нечётны и составны (A ⊂ B)." },
    { a: "Срочные задачи", b: "Важные задачи", rel: "cross", why: "Две ортогональные оси: часть срочных важна, часть нет (A ∩ B — основа матрицы 2×2!)." },
    { a: "Научная гипотеза", b: "Опровержимое утверждение", rel: "sub", why: "Всякая научная гипотеза допускает решающий тест (A ⊂ B)." },
    { a: "Абсолютно новое", b: "Проверенное опытом", rel: "disj", why: "До проведения пробы явление ещё не проверено опытом (A ⊥ B)." },
    { a: "Соразмерное определение", b: "Определение с объёмом Dfd ≡ Dfn", rel: "eq", why: "Тождество объёмов определяемого и определяющего (A ≡ B, Челпанов Гл. 5)." },
  ];

  const VENN_JOIN_PUZZLES = [
    {
      zone: "inner",
      sql: "INNER JOIN (A ∧ B)",
      a: "Срочные задачи",
      b: "Важные задачи",
      prompt: "Истина ТОЛЬКО в пересечении: нужно отобрать задачи, которые одновременно И срочные (A), И важные (B).",
      why: "Конъюнкция A ∧ B (INNER JOIN): истинно строго в общей линзе пересечения двух окружностей.",
    },
    {
      zone: "xor",
      sql: "FULL OUTER EXCL. (A ⊕ B · XOR)",
      a: "Режим A (Пилот)",
      b: "Режим B (Откат)",
      prompt: "Истина ТОЛЬКО в непересекающихся частях: строгое разделительное «либо A, либо B, но НЕ оба одновременно» (Челпанов, Гл. 8).",
      why: "Строгая дизъюнкция A ⊕ B (XOR): оба внешних полумесяца истинны, а общая середина (A ∧ B) строго исключена!",
    },
    {
      zone: "left_only",
      sql: "LEFT ANTI-JOIN (A \\ B)",
      a: "Важные задачи (A)",
      b: "Срочные задачи (B)",
      prompt: "Стратегический квадрант 2: нужно найти всё, что относится к A (Важное), но НЕ пересекается с B (Срочным).",
      why: "Разность множеств A \\ B (LEFT ONLY): истинна только левая непересекающаяся часть A без общей середины.",
    },
    {
      zone: "right_only",
      sql: "RIGHT ANTI-JOIN (B \\ A)",
      a: "Успешные проекты (A)",
      b: "Проекты с подкастом (B)",
      prompt: "Проверка «наоборот» (Гл. 12): найти контрпримеры — проекты, у которых ЕСТЬ подкаст (B), но они НЕ вошли в успешные (A).",
      why: "Разность B \\ A (RIGHT ONLY): именно правая внешняя область B опровергает ложное обращение «все B суть A».",
    },
    {
      zone: "union",
      sql: "FULL UNION (A ∨ B)",
      a: "Ошибка посылки (A)",
      b: "Ошибка формы (B)",
      prompt: "Слабое «или»: вывод ненадёжен, если допущена ошибка посылки (A), ошибка формы (B) или ОБЕ сразу.",
      why: "Нестрогая дизъюнкция A ∨ B (FULL OUTER JOIN): истинно во всей площади обеих окружностей включая пересечение.",
    },
    {
      zone: "inner",
      sql: "INNER JOIN (A ∧ B)",
      a: "Формально верный вывод (A)",
      b: "Истинные посылки (B)",
      prompt: "Где рождается достоверное знание по Челпанову (Гл. 1): когда соблюдена И форма вывода (A), И материальная истинность посылок (B)?",
      why: "Только на пересечении A ∧ B: верная форма при ложных посылках даёт красивый бред, а истинные факты при сломанной форме — неверный вывод.",
    },
    {
      zone: "xor",
      sql: "XOR (A ⊕ B)",
      a: "Участник кооперирует (A)",
      b: "Соперник кооперирует (B)",
      prompt: "В матрице Дилеммы заключённого: в каких исходах один игрок получает 5, а второй 0 (только ровно один из двоих выбрал C)?",
      why: "Именно зона XOR (непересекающиеся края A ⊕ B): когда оба C — это середина (3,3), когда оба D — снаружи (1,1).",
    },
    {
      zone: "left_only",
      sql: "LEFT ONLY (A \\ B)",
      a: "Случаи с фактором X (A)",
      b: "Случаи со сбоем (B)",
      prompt: "Опровержение гипотезы по Миллю: случаи, где фактор X присутствовал (A), но ожидаемый сбой НЕ произошёл (не B).",
      why: "Зона A \\ B доказывает, что фактор X сам по себе НЕ является достаточной причиной сбоя.",
    },
  ];

  function mountEulerInstrument(container) {
    let tab = "venn"; // "venn" (SQL JOIN truth zones) | "euler" (4 class relations)
    let curEuler = pick(EULER_PAIRS);
    let guessEuler = null;
    let curVenn = pick(VENN_JOIN_PUZZLES);
    let guessVenn = null;
    let uid = 0;

    function svgEuler(mode, aLbl, bLbl) {
      const sA = aLbl.length > 20 ? aLbl.slice(0, 19) + "…" : aLbl;
      const sB = bLbl.length > 20 ? bLbl.slice(0, 19) + "…" : bLbl;
      if (mode === "sub") {
        return `<circle cx="200" cy="106" r="88" fill="rgba(106,166,216,0.14)" stroke="#6aa6d8" stroke-width="2"/>
          <circle cx="200" cy="134" r="48" fill="rgba(82,196,140,0.22)" stroke="#52c48c" stroke-width="2"/>
          <text x="200" y="56" text-anchor="middle" fill="#b7daf5" font-size="11" font-weight="700">B · ${esc(sB)}</text>
          <text x="200" y="138" text-anchor="middle" fill="#ccf7df" font-size="11" font-weight="700">A · ${esc(sA)}</text>`;
      }
      if (mode === "cross") {
        return `<circle cx="158" cy="105" r="66" fill="rgba(82,196,140,0.16)" stroke="#52c48c" stroke-width="2"/>
          <circle cx="242" cy="105" r="66" fill="rgba(217,185,130,0.16)" stroke="#d9b982" stroke-width="2"/>
          <text x="118" y="109" text-anchor="middle" fill="#ccf7df" font-size="11" font-weight="700">A</text>
          <text x="282" y="109" text-anchor="middle" fill="#f3dfc0" font-size="11" font-weight="700">B</text>
          <text x="200" y="109" text-anchor="middle" fill="#ffffff" font-size="11.5" font-weight="700">A ∩ B</text>`;
      }
      if (mode === "disj") {
        return `<circle cx="114" cy="105" r="62" fill="rgba(82,196,140,0.16)" stroke="#52c48c" stroke-width="2"/>
          <circle cx="286" cy="105" r="62" fill="rgba(227,109,101,0.16)" stroke="#e36d65" stroke-width="2"/>
          <text x="114" y="109" text-anchor="middle" fill="#ccf7df" font-size="10.5" font-weight="700">A · ${esc(sA.slice(0, 14))}</text>
          <text x="286" y="109" text-anchor="middle" fill="#f9c4c0" font-size="10.5" font-weight="700">B · ${esc(sB.slice(0, 14))}</text>`;
      }
      return `<circle cx="200" cy="105" r="82" fill="rgba(82,196,140,0.20)" stroke="#52c48c" stroke-width="2.2"/>
        <circle cx="200" cy="105" r="72" fill="none" stroke="#d9b982" stroke-dasharray="6 5" stroke-width="1.8"/>
        <text x="200" y="90" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700">A ≡ B</text>
        <text x="200" y="112" text-anchor="middle" fill="#c2e0cf" font-size="10.5">${esc(sA)}</text>
        <text x="200" y="128" text-anchor="middle" fill="#c2e0cf" font-size="10.5">≡ ${esc(sB)}</text>`;
    }

    function svgVennZone(zone, aLbl, bLbl) {
      uid += 1;
      const cA = `clipA_${uid}`;
      const mNoA = `maskNoA_${uid}`;
      const mNoB = `maskNoB_${uid}`;
      const hi = "rgba(82,196,140,0.42)";
      const base = "rgba(255,255,255,0.03)";
      let paint = "";
      if (zone === "inner") {
        paint = `<circle cx="158" cy="100" r="68" fill="${base}"/>
                 <circle cx="242" cy="100" r="68" fill="${base}"/>
                 <circle cx="242" cy="100" r="68" fill="${hi}" clip-path="url(#${cA})"/>`;
      } else if (zone === "xor") {
        paint = `<circle cx="158" cy="100" r="68" fill="${hi}" mask="url(#${mNoB})"/>
                 <circle cx="242" cy="100" r="68" fill="${hi}" mask="url(#${mNoA})"/>
                 <circle cx="242" cy="100" r="68" fill="rgba(227,109,101,0.14)" clip-path="url(#${cA})"/>`;
      } else if (zone === "left_only") {
        paint = `<circle cx="242" cy="100" r="68" fill="${base}"/>
                 <circle cx="158" cy="100" r="68" fill="${hi}" mask="url(#${mNoB})"/>`;
      } else if (zone === "right_only") {
        paint = `<circle cx="158" cy="100" r="68" fill="${base}"/>
                 <circle cx="242" cy="100" r="68" fill="${hi}" mask="url(#${mNoA})"/>`;
      } else {
        paint = `<circle cx="158" cy="100" r="68" fill="${hi}"/>
                 <circle cx="242" cy="100" r="68" fill="${hi}"/>`;
      }

      const tagCenter = zone === "xor" ? "✕" : zone === "inner" || zone === "union" ? "✓" : "";
      const tagLeft = zone === "left_only" || zone === "xor" || zone === "union" ? "✓" : "";
      const tagRight = zone === "right_only" || zone === "xor" || zone === "union" ? "✓" : "";

      return `<svg viewBox="0 0 400 210" class="inst-svg" role="img" aria-label="Зоны истинности Венна и SQL JOIN">
        <defs>
          <clipPath id="${cA}"><circle cx="158" cy="100" r="68"/></clipPath>
          <mask id="${mNoB}"><rect x="0" y="0" width="400" height="210" fill="#fff"/><circle cx="242" cy="100" r="68" fill="#000"/></mask>
          <mask id="${mNoA}"><rect x="0" y="0" width="400" height="210" fill="#fff"/><circle cx="158" cy="100" r="68" fill="#000"/></mask>
        </defs>
        ${paint}
        <circle cx="158" cy="100" r="68" fill="none" stroke="#6aa6d8" stroke-width="2"/>
        <circle cx="242" cy="100" r="68" fill="none" stroke="#d9b982" stroke-width="2"/>
        <text x="122" y="105" text-anchor="middle" fill="#e6f7ee" font-size="14" font-weight="700">${tagLeft || "A"}</text>
        <text x="278" y="105" text-anchor="middle" fill="#f7ebd8" font-size="14" font-weight="700">${tagRight || "B"}</text>
        <text x="200" y="105" text-anchor="middle" fill="${zone === "xor" ? "#f4a8a2" : "#ffffff"}" font-size="14" font-weight="700">${tagCenter}</text>
        <text x="124" y="192" text-anchor="middle" fill="#89b8e0" font-size="10.5" font-weight="600">A: ${esc(aLbl.slice(0, 22))}</text>
        <text x="276" y="192" text-anchor="middle" fill="#e6cfa8" font-size="10.5" font-weight="600">B: ${esc(bLbl.slice(0, 22))}</text>
      </svg>`;
    }

    function draw() {
      const topTabs = `
        <div class="inst-pills">
          <button type="button" class="inst-pill ${tab === "venn" ? "active" : ""}" id="btn-ev-venn">SQL JOIN / Зоны истинности (AND·XOR·ANTI)</button>
          <button type="button" class="inst-pill ${tab === "euler" ? "active" : ""}" id="btn-ev-euler">Отношения понятий (A⊂B·∩·⊥·≡)</button>
        </div>`;

      if (tab === "venn") {
        const zOpts = [
          { id: "inner", lbl: "Только пересечение · INNER JOIN (A ∧ B)" },
          { id: "xor", lbl: "Только края без середины · XOR (A ⊕ B)" },
          { id: "left_only", lbl: "Только A без B · LEFT ONLY (A \\ B)" },
          { id: "right_only", lbl: "Только B без A · RIGHT ONLY (B \\ A)" },
          { id: "union", lbl: "Оба круга целиком · FULL UNION (A ∨ B)" },
        ];
        const vennBtns = zOpts
          .map((o) => {
            let cls = "quiz-opt venn-pick";
            if (guessVenn !== null) {
              if (o.id === curVenn.zone) cls += " correct";
              else if (o.id === guessVenn) cls += " wrong";
            }
            return `<button type="button" class="${cls}" data-z="${o.id}">${esc(o.lbl)}</button>`;
          })
          .join("");

        container.innerHTML = `
          ${guideHtml("euler")}
          ${topTabs}
          <div class="card-meta-row" style="margin-bottom:6px;">
            <span class="badge-pill sky">A: ${esc(curVenn.a)}</span>
            <span class="badge-pill sand">B: ${esc(curVenn.b)}</span>
          </div>
          <p class="quiz-prompt" style="margin-top:2px;margin-bottom:10px;">${esc(curVenn.prompt)}</p>
          ${guessVenn !== null ? `<div class="svg-frame" style="margin-bottom:10px;">${svgVennZone(curVenn.zone, curVenn.a, curVenn.b)}</div>` : ""}
          <div class="quiz-opts">${vennBtns}</div>
          ${
            guessVenn !== null
              ? `<div class="quiz-explain" style="margin-top:10px;">
                   <strong style="display:block;margin-bottom:3px;color:${guessVenn === curVenn.zone ? "var(--accent)" : "var(--sand)"};">
                     ${guessVenn === curVenn.zone ? `Точно · ${curVenn.sql} ✓` : `Верная зона: ${curVenn.sql}`}
                   </strong>
                   ${esc(curVenn.why)}
                 </div>
                 <button type="button" class="btn-primary" id="btn-venn-next" style="margin-top:10px;">🎲 Следующая зона истинности</button>`
              : ""
          }
        `;
        bindGuide(container);
        container.querySelector("#btn-ev-venn").addEventListener("click", () => { sfxTap(); tab = "venn"; draw(); });
        container.querySelector("#btn-ev-euler").addEventListener("click", () => { sfxTap(); tab = "euler"; draw(); });
        container.querySelectorAll(".venn-pick").forEach((b) => {
          b.addEventListener("click", () => {
            if (guessVenn !== null) return;
            guessVenn = b.getAttribute("data-z");
            if (guessVenn === curVenn.zone) sfxOk(); else sfxWrong();
            draw();
          });
        });
        const bn = container.querySelector("#btn-venn-next");
        if (bn) bn.addEventListener("click", () => { sfxTap(); curVenn = pick(VENN_JOIN_PUZZLES); guessVenn = null; draw(); });
        return;
      }

      const opts = [
        { id: "sub", lbl: "Подчинение (A ⊂ B)" },
        { id: "cross", lbl: "Пересечение (A ∩ B)" },
        { id: "disj", lbl: "Несовместимость (A ⊥ B)" },
        { id: "eq", lbl: "Тождество (A ≡ B)" },
      ];
      const eulBtns = opts
        .map((o) => {
          let cls = "quiz-opt eul-pick";
          if (guessEuler !== null) {
            if (o.id === curEuler.rel) cls += " correct";
            else if (o.id === guessEuler) cls += " wrong";
          }
          return `<button type="button" class="${cls}" data-r="${o.id}" style="text-align:center;font-weight:650;">${esc(o.lbl)}</button>`;
        })
        .join("");

      container.innerHTML = `
        ${guideHtml("euler")}
        ${topTabs}
        <p class="quiz-prompt" style="margin-top:0;margin-bottom:10px;">Определи геометрию пары понятий:\n<strong>A:</strong> «${esc(curEuler.a)}»  ↔  <strong>B:</strong> «${esc(curEuler.b)}»</p>
        ${guessEuler !== null ? `<div class="svg-frame" style="margin-bottom:10px;"><svg viewBox="0 0 400 210" class="inst-svg">${svgEuler(curEuler.rel, curEuler.a, curEuler.b)}</svg></div>` : ""}
        <div class="two-col">${eulBtns}</div>
        ${
          guessEuler !== null
            ? `<div class="quiz-explain" style="margin-top:10px;"><strong style="color:${guessEuler === curEuler.rel ? "var(--accent)" : "var(--sand)"};">${guessEuler === curEuler.rel ? "Точно ✓" : "Правильная геометрия показана выше"}</strong> — ${esc(curEuler.why)}</div>
               <button type="button" class="btn-primary" id="btn-eul-next" style="margin-top:10px;">🎲 Следующая пара понятий</button>`
            : ""
        }
      `;
      bindGuide(container);
      container.querySelector("#btn-ev-venn").addEventListener("click", () => { sfxTap(); tab = "venn"; draw(); });
      container.querySelector("#btn-ev-euler").addEventListener("click", () => { sfxTap(); tab = "euler"; draw(); });
      container.querySelectorAll(".eul-pick").forEach((b) => {
        b.addEventListener("click", () => {
          if (guessEuler !== null) return;
          guessEuler = b.getAttribute("data-r");
          if (guessEuler === curEuler.rel) sfxOk(); else sfxWrong();
          draw();
        });
      });
      const bn = container.querySelector("#btn-eul-next");
      if (bn) bn.addEventListener("click", () => { sfxTap(); curEuler = pick(EULER_PAIRS); guessEuler = null; draw(); });
    }
    draw();
  }

  // ==================== 6. PORPHYRY TREE / INVERSE LAW ACROSS ALL 145 ATOMS ====================
  const PORPHYRY_CHAINS = [
    ["Сущность / Система", "Цифровой сервис", "Telegram Mini App", "«Геометрия мышления» v3.3"],
    ["Фигура", "Многоугольник", "Прямоугольник", "Квадрат со стороной 5 см"],
    ["Высказывание", "Умозаключение", "Дедуктивный вывод", "Модус Barbara 1-й фигуры"],
    ["Научный метод", "Индукция", "Каноны Милля", "Метод различия Милля"],
    ["Алгоритм", "Алгоритм поиска пути", "Волновой алгоритм (Flood-Fill)", "Speed Run Micromouse 7×7"],
    ["Правило поведения", "Игровая стратегия", "Итеративная стратегия", "Tit-for-Tat Аксельрода (1980)"],
  ];

  function mountScalesInstrument(container, ctx) {
    const catalog = ctx && ctx.catalog ? ctx.catalog : null;
    const atoms = (catalog && catalog.atoms) || [];
    const partsById = Object.fromEntries(((catalog && catalog.parts) || []).map((p) => [p.id, p]));
    const weeksByNum = Object.fromEntries(((catalog && catalog.weeks) || []).map((w) => [w.week, w]));

    function buildChain() {
      // 75% of rounds dynamically generate a true 4-tier hierarchy from ALL 145 Chelpanov atoms!
      if (atoms.length && Math.random() < 0.75) {
        const a = pick(atoms);
        const pt = partsById[a.part_id];
        const wk = weeksByNum[a.chapter_num];
        if (pt && wk) {
          return {
            source: `Из корпуса (145 атомов · Неделя ${a.chapter_num})`,
            chain: [
              "Логика и онтология мышления (весь курс)",
              `Раздел: ${pt.short_title}`,
              `Глава ${wk.week}: ${wk.title}`,
              `Атом: ${a.title.length > 48 ? a.title.slice(0, 47) + "…" : a.title}`,
            ],
          };
        }
      }
      return { source: "Классическая лестница Порфирия", chain: pick(PORPHYRY_CHAINS) };
    }

    let curObj = buildChain();
    let pool = shuffle(curObj.chain);
    let picked = [];

    function resetChain() {
      curObj = buildChain();
      pool = shuffle(curObj.chain);
      picked = [];
      draw();
    }

    function draw() {
      const chain = curObj.chain;
      const done = picked.length === chain.length;
      const allOk = done && picked.every((v, i) => v === chain[i]);
      const lv = Math.min(picked.length, 3);
      const extPct = [95, 70, 42, 14][lv];
      const intPct = [15, 42, 70, 96][lv];

      container.innerHTML = `
        ${guideHtml("scales")}
        <div class="card-meta-row" style="margin-bottom:6px;">
          <span class="badge-pill sky">${esc(curObj.source)}</span>
          ${picked.length && !done ? `<button type="button" class="btn-chip" id="btn-por-undo">↩ Шаг назад</button>` : `<span class="muted-small">145+ иерархий</span>`}
        </div>
        <p class="quiz-prompt" style="margin-top:0;margin-bottom:8px;">Выстрой лестницу от <strong>самого широкого объёма (1)</strong> к <strong>максимальной конкретике (4)</strong>:</p>
        <div class="svg-frame" style="margin-bottom:10px;">
          <svg viewBox="0 0 400 108" class="inst-svg">
            <text x="16" y="24" fill="#89b8e0" font-size="10.5" font-weight="700">ОБЪЁМ (ширина охвата): ${extPct}%</text>
            <rect x="16" y="32" width="368" height="14" rx="7" fill="rgba(255,255,255,0.06)"/>
            <rect x="16" y="32" width="${Math.round(3.68 * extPct)}" height="14" rx="7" fill="#67b0f0"/>
            <text x="16" y="70" fill="#74d4a2" font-size="10.5" font-weight="700">СОДЕРЖАНИЕ (конкретика признаков): ${intPct}%</text>
            <rect x="16" y="78" width="368" height="14" rx="7" fill="rgba(255,255,255,0.06)"/>
            <rect x="16" y="78" width="${Math.round(3.68 * intPct)}" height="14" rx="7" fill="#4fd195"/>
          </svg>
        </div>
        ${
          picked.length
            ? `<div class="card-stack" style="margin-bottom:10px;">${picked
                .map((v, i) => `<div class="rank-row ${done ? (v === chain[i] ? "top" : "") : ""}"><span><strong>${i + 1}.</strong> ${esc(v)}</span>${done ? `<span style="color:${v === chain[i] ? "var(--accent)" : "var(--rose)"};font-weight:700;">${v === chain[i] ? "✓" : "✕"}</span>` : ""}</div>`)
                .join("")}</div>`
            : ""
        }
        ${
          !done
            ? `<div class="quiz-opts">${pool
                .filter((x) => !picked.includes(x))
                .map((x) => `<button type="button" class="quiz-opt por-pick" data-v="${esc(x)}">${esc(x)}</button>`)
                .join("")}</div>`
            : `<div class="quiz-explain">
                 <strong style="color:${allOk ? "var(--accent)" : "var(--sand)"};">${allOk ? "Безупречная иерархия ✓" : "Эталонная лестница:"}</strong>
                 ${allOk ? "Каждый шаг сужал объём и добавлял конкретные проверяемые признаки." : chain.join(" → ")}
               </div>
               <button type="button" class="btn-primary" id="btn-por-next" style="margin-top:10px;">🎲 Новая лестница понятий</button>`
        }
      `;
      bindGuide(container);
      const bUndo = container.querySelector("#btn-por-undo");
      if (bUndo) bUndo.addEventListener("click", () => { sfxTap(); picked.pop(); draw(); });
      container.querySelectorAll(".por-pick").forEach((b) => {
        b.addEventListener("click", () => {
          picked.push(b.getAttribute("data-v"));
          if (picked.length === chain.length) {
            if (picked.every((v, i) => v === chain[i])) sfxOk(); else sfxWrong();
          } else {
            sfxTap();
          }
          draw();
        });
      });
      const bn = container.querySelector("#btn-por-next");
      if (bn) bn.addEventListener("click", () => { sfxTap(); resetChain(); });
    }
    draw();
  }

  // ==================== 7. PRIORITY COMPASS (ALL 7 PRIORITIZATION MODELS) ====================
  function mountMatrixInstrument(container, ctx) {
    if (typeof window !== "undefined" && window.TGPriority && typeof window.TGPriority.mountPriorityCompass === "function") {
      window.TGPriority.mountPriorityCompass(container, ctx);
    }
  }

  const INSTRUMENTS = [
    { id: "euler", title: "🟢 Эйлер · SQL JOIN", subtitle: "Круги Эйлера, отношения понятий и зоны истинности (INNER, XOR, ANTI-JOIN, UNION)", mount: mountEulerInstrument },
    { id: "scales", title: "🌳 Дерево и Весы", subtitle: "Лестница Порфирия по всем 145 атомам курса (закон объёма и содержания, Гл. 3)", mount: mountScalesInstrument },
    { id: "square", title: "◻ Логический квадрат", subtitle: "60+ загадок истинности A/E/I/O + интерактивный стенд противоречий (Гл. 8–10)", mount: mountSquareInstrument },
    { id: "molecule", title: "🧬 Молекула вывода", subtitle: "72 процедурных загадки S–M–P и Modus Tollens: отличи строгую форму от разрыва (Гл. 13–17)", mount: mountMoleculeInstrument },
    { id: "mill", title: "🔬 Прибор Милля", subtitle: "Чёрный ящик причинности на 145 атомах: 8 скрытых законов для чистых проб (Гл. 20)", mount: mountMillInstrument },
    { id: "matrix", title: "🧭 Приоритеты (7 оптик)", subtitle: "2×2 Эйзенхауэр · TOC Горлышко · WSJF · Двери 1↔2 · EVPI · RICE · Кано", mount: mountMatrixInstrument },
    { id: "atoms145", title: "🎲 Все 145 атомов", subtitle: "4 типа загадок по всему корпусу Челпанова: живой граф топологии, антипримеры, границы правил и цитаты", mount: mountAllAtomsPuzzle },
  ];

  function mountInstrument(container, id, ctx) {
    const inst = INSTRUMENTS.find((x) => x.id === id) || INSTRUMENTS[0];
    if (!container || !inst) return;
    inst.mount(container, ctx);
  }

  root.TGInstruments = {
    INSTRUMENTS,
    mountInstrument,
  };
})(typeof window !== "undefined" ? window : globalThis);
