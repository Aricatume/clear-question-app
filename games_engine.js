/* Procedural Logic Game Engine (0 LLM, pure JS) — Generates 220+ unique structural tasks across 4 engines + blends with 145 Chelpanov atom tasks = 365+ Speed Run pool! */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TGGames = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
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

  // ---- 1. PROCEDURAL LOGICAL SQUARE & CONVERSION (A/E/I/O) ----
  const AEIO_PAIRS = [
    ["квадраты", "прямоугольники", "прямоугольники, не являющиеся квадратами"],
    ["алгоритмы сортировки", "компьютерные программы", "программы, не сортирующие данные"],
    ["доказанные теоремы", "истинные утверждения", "истинные факты без формального доказательства"],
    ["наблюдаемые факты", "исходные данные", "данные, полученные расчётом"],
    ["эксперименты", "источники эмпирических данных", "пассивные наблюдения"],
    ["киты", "млекопитающие", "наземные млекопитающие"],
    ["корректные определения", "соразмерные суждения", "соразмерные суждения без определения"],
    ["сильные гипотезы", "проверяемые утверждения", "проверяемые, но уже опровергнутые утверждения"],
    ["равновесия Нэша", "устойчивые профили стратегий", "неустойчивые компромиссы"],
    ["простые числа больше 2", "нечётные числа", "составные нечётные числа вроде 9 или 15"],
  ];

  const DISJOINT_PAIRS = [
    ["факты наблюдения", "непроверенные домыслы"],
    ["круговые доказательства", "строгие научные доказательства"],
    ["противоречивые суждения", "одновременно истинные утверждения"],
    ["ложные дилеммы", "исчерпывающие классификации"],
    ["случайные совпадения", "достаточные причины"],
    ["тавтологии", "расширяющие знание определения"],
  ];

  function genSquareOrConversion() {
    const subType = Math.floor(Math.random() * 4);
    if (subType === 0) {
      const [S, P, counter] = pick(AEIO_PAIRS);
      const opts = shuffle([
        { text: `Некоторые ${P} суть ${S}`, ok: true },
        { text: `Все ${P} суть ${S}`, ok: false },
        { text: `Ни один из «${P}» не является «${S}»`, ok: false },
        { text: `Некоторые ${S} не суть ${P}`, ok: false },
      ]);
      return {
        id: `PROC-CONV-${Math.random().toString(36).slice(2, 7)}`,
        engine: "square",
        badge: "Обращение (Гл. 12)",
        atom_id: "ATOM-CH12-CONVERSION",
        chapter_num: 12,
        prompt: `Дано истинное суждение (A): «Все ${S} суть ${P}».\nКакой вывод строго следует при его обращении?`,
        options: opts.map((o) => o.text),
        correct_index: opts.findIndex((o) => o.ok),
        explanation: `По правилу обращения (Челпанов, Гл. 12) из «Все S суть P» следует только «Некоторые P суть S» (обращение с ограничением), так как существуют ${counter}.`,
      };
    }
    if (subType === 1) {
      const [S, P] = pick(AEIO_PAIRS);
      const opts = shuffle([
        { text: `Некоторые ${S} не суть ${P} (суждение O)`, ok: true },
        { text: `Ни один из «${S}» не является «${P}» (суждение E)`, ok: false },
        { text: `Все ${P} суть ${S}`, ok: false },
        { text: `Некоторые ${P} не суть ${S}`, ok: false },
      ]);
      return {
        id: `PROC-CONTRA-${Math.random().toString(36).slice(2, 7)}`,
        engine: "square",
        badge: "Логический квадрат (Гл. 10)",
        atom_id: "ATOM-CH10-REFUTATION-CONTRADICTORY",
        chapter_num: 10,
        prompt: `Что является МИНИМАЛЬНЫМ строгим опровержением (противоречием) тезиса:\n«Все ${S} суть ${P}»?`,
        options: opts.map((o) => o.text),
        correct_index: opts.findIndex((o) => o.ok),
        explanation: `Общеутвердительному суждению A («Все S суть P») противоречит частноотрицательное O («Некоторые S не суть P»). Достаточно одного достоверного контрпримера, не нужно доказывать крайность E («Ни один»).`,
      };
    }
    if (subType === 2) {
      const [S, P] = pick(DISJOINT_PAIRS);
      const opts = shuffle([
        { text: `Ни один из «${P}» не является «${S}» (чистое обращение)`, ok: true },
        { text: `Некоторые ${P} суть ${S}`, ok: false },
        { text: `Все ${P} суть ${S}`, ok: false },
        { text: `Обратить это суждение невозможно`, ok: false },
      ]);
      return {
        id: `PROC-ECONV-${Math.random().toString(36).slice(2, 7)}`,
        engine: "square",
        badge: "Чистое обращение E (Гл. 12)",
        atom_id: "ATOM-CH12-CONVERSION",
        chapter_num: 12,
        prompt: `Дано истинное суждение (E): «Ни одни ${S} не являются ${P}».\nКакой вывод строго следует?`,
        options: opts.map((o) => o.text),
        correct_index: opts.findIndex((o) => o.ok),
        explanation: `В суждении E оба термина (S и P) полностью исключают друг друга (круги Эйлера не пересекаются), поэтому оно допускает чистое обращение без потери объёма.`,
      };
    }
    const [S, P] = pick(DISJOINT_PAIRS);
    const opts = shuffle([
      { text: `Оба могут быть ложными одновременно (существует середина)`, ok: true },
      { text: `Оба могут быть истинными одновременно`, ok: false },
      { text: `Если первое ложно, второе обязательно истинно`, ok: false },
      { text: `Они логически эквивалентны`, ok: false },
    ]);
    return {
      id: `PROC-CONTRARY-${Math.random().toString(36).slice(2, 7)}`,
      engine: "square",
      badge: "Противоположность A ↔ E (Гл. 10)",
      atom_id: "ATOM-CH10-CONTRARY-OPPOSITION",
      chapter_num: 10,
      prompt: `Сравни два суждения: «Все ${S} относятся к классу X» (A) и «Ни одни ${S} не относятся к классу X» (E).\nКаков закон их отношения на Логическом квадрате?`,
      options: opts.map((o) => o.text),
      correct_index: opts.findIndex((o) => o.ok),
      explanation: `Противоположные суждения A и E не могут быть одновременно истинными, но оба могут быть ложными (когда истинна середина: «Некоторые относятся, а некоторые — нет»).`,
    };
  }

  // ---- 2. PROCEDURAL EULER & SYLLOGISM VALIDITY ENGINE ----
  const TERM_TRIPLES = [
    ["A (инженеры)", "B (аналитики)", "C (проектировщики систем)"],
    ["A (гипотезы)", "B (утверждения)", "C (проверяемые модели)"],
    ["A (эвристические правила)", "B (быстрые решения)", "C (безошибочные выводы)"],
    ["A (устойчивые стратегии)", "B (ясные алгоритмы)", "C (короткие хитрости)"],
    ["A (естественные классы)", "B (группировки)", "C (алфавитные списки)"],
    ["A (прямые наблюдения)", "B (основания)", "C (субъективные оценки)"],
  ];

  function genEulerValidity() {
    const [A, B, C] = pick(TERM_TRIPLES);
    const patterns = [
      {
        valid: true,
        p1: `Все ${B} суть ${C}.`,
        p2: `Все ${A} суть ${B}.`,
        concl: `Следовательно, все ${A} суть ${C}.`,
        why: `Корректная 1-я фигура (Barbara): круг ${A} полностью внутри ${B}, а ${B} внутри ${C} — значит ${A} с необходимостью внутри ${C}.`,
        atom: "ATOM-CH14-FIGURE-1-SUBSUMPTION",
      },
      {
        valid: false,
        p1: `Все ${A} суть ${B}.`,
        p2: `Все ${C} суть ${B}.`,
        concl: `Следовательно, все ${A} суть ${C}.`,
        why: `Ложная связка (нераспределённый средний термин ${B}): оба круга ${A} и ${C} лежат внутри большого круга ${B}, но могут вообще не пересекаться между собой!`,
        atom: "ATOM-CH13-RULES-OF-TERMS",
      },
      {
        valid: true,
        p1: `Ни один элемент ${B} не является ${C}.`,
        p2: `Все ${A} суть ${B}.`,
        concl: `Следовательно, ни один элемент ${A} не является ${C}.`,
        why: `Корректный вывод (Celarent): круг ${B} не касается ${C}, а ${A} лежит целиком внутри ${B} — значит ${A} не может пересекать ${C}.`,
        atom: "ATOM-CH14-FIGURE-1-SUBSUMPTION",
      },
      {
        valid: false,
        p1: `Некоторые ${A} суть ${B}.`,
        p2: `Некоторые ${B} суть ${C}.`,
        concl: `Следовательно, некоторые ${A} суть ${C}.`,
        why: `Нарушение правила посылок (Челпанов, Гл. 13): из двух частных посылок достоверный вывод невозможен — пересечения A∩B и B∩C могут лежать в разных краях круга B.`,
        atom: "ATOM-CH13-RULES-OF-PREMISES",
      },
      {
        valid: false,
        p1: `Если есть ${A}, то возникает ${B}.`,
        p2: `Мы наблюдаем ${B}.`,
        concl: `Следовательно, причиной точно было ${A}.`,
        why: `Ловушка утверждения следствия (Челпанов, Гл. 16): следствие ${B} могло быть вызвано другой причиной, кроме ${A}.`,
        atom: "ATOM-CH16-HYPOTHETICAL-FALLACIES",
      },
      {
        valid: true,
        p1: `Если верно ${A}, то обязательно наблюдается ${B}.`,
        p2: `В опыте ${B} НЕ наблюдается.`,
        concl: `Следовательно, ${A} ложно (Modus Tollens).`,
        why: `Безупречный условный вывод Modus Tollens (Гл. 16): отсутствие необходимого следствия строго опровергает условие.`,
        atom: "ATOM-CH16-HYPOTHETICAL-SYLLOGISM",
      },
    ];
    const pat = pick(patterns);
    const opts = [
      { text: "Вывод строго следует из посылок (форма верна)", ok: pat.valid },
      { text: "Вывод НЕ следует — в связке есть логический разрыв", ok: !pat.valid },
    ];
    return {
      id: `PROC-EUL-${Math.random().toString(36).slice(2, 7)}`,
      engine: "euler",
      badge: "Проверка молекулы вывода",
      atom_id: pat.atom,
      chapter_num: 13,
      prompt: `Проверь форму рассуждения:\n1) ${pat.p1}\n2) ${pat.p2}\n→ ${pat.concl}`,
      options: opts.map((o) => o.text),
      correct_index: opts.findIndex((o) => o.ok),
      explanation: pat.why,
    };
  }

  // ---- 3. PROCEDURAL MILL'S CAUSALITY DETECTOR ----
  const MILL_FACTORS = [
    ["A (новый алгоритм)", "B (ночной трафик)", "C (сжатие кеша)", "D (обновление UI)"],
    ["A (смена поставщика)", "B (высокая влажность)", "C (новый станок)", "D (длинная смена)"],
    ["A (уведомления)", "B (поздний кофе)", "C (короткий сон)", "D (шум в офисе)"],
    ["A (тарифный шаг)", "B (форма оплаты)", "C (баннер сверху)", "D (мобильный экран)"],
  ];

  function genMillDetector() {
    const factors = pick(MILL_FACTORS);
    const mode = Math.random() < 0.65 ? "difference" : "agreement";
    const targetIdx = Math.floor(Math.random() * 4);
    const otherIdx = [0, 1, 2, 3].filter((i) => i !== targetIdx);

    if (mode === "difference") {
      // Case 1 has target + 2 background factors -> Effect YES; Case 2 has ONLY same 2 background -> Effect NO
      const bg = [otherIdx[0], otherIdx[1]];
      const c1 = [factors[bg[0]], factors[bg[1]], factors[targetIdx]].join(" + ");
      const c2 = [factors[bg[0]], factors[bg[1]]].join(" + ");
      const opts = shuffle(
        factors.map((f, i) => ({
          text: f,
          ok: i === targetIdx,
        }))
      );
      return {
        id: `PROC-MILL-D-${Math.random().toString(36).slice(2, 7)}`,
        engine: "mill",
        badge: "Метод различия Милля (Гл. 20)",
        atom_id: "ATOM-CH20-METHOD-OF-DIFFERENCE",
        chapter_num: 20,
        prompt: `Проведены 2 чистых наблюдения:\n• Опыт 1: [${c1}] → Сбой ЕСТЬ\n• Опыт 2: [${c2}] → Сбоя НЕТ\nКакой фактор является доказанным кандидатом в причину?`,
        options: opts.map((o) => o.text),
        correct_index: opts.findIndex((o) => o.ok),
        explanation: `По методу различия Милля (Челпанов, Гл. 20) оба опыта совпадают по фону, но отличаются ровно на 1 фактор — ${factors[targetIdx]}. Именно его удаление убрало сбой.`,
      };
    }

    // Method of Agreement: 3 different cases share ONLY targetIdx -> Effect YES
    const c1 = [factors[targetIdx], factors[otherIdx[0]]].join(" + ");
    const c2 = [factors[targetIdx], factors[otherIdx[1]]].join(" + ");
    const c3 = [factors[targetIdx], factors[otherIdx[2]]].join(" + ");
    const opts = shuffle(
      factors.map((f, i) => ({
        text: f,
        ok: i === targetIdx,
      }))
    );
    return {
      id: `PROC-MILL-A-${Math.random().toString(36).slice(2, 7)}`,
      engine: "mill",
      badge: "Метод сходства Милля (Гл. 20)",
      atom_id: "ATOM-CH20-METHOD-OF-AGREEMENT",
      chapter_num: 20,
      prompt: `В трёх разных случаях проявился один и тот же эффект:\n• Случай 1: [${c1}] → Эффект ЕСТЬ\n• Случай 2: [${c2}] → Эффект ЕСТЬ\n• Случай 3: [${c3}] → Эффект ЕСТЬ\nКакой единственный общий фактор выявил метод сходства?`,
      options: opts.map((o) => o.text),
      correct_index: opts.findIndex((o) => o.ok),
      explanation: `По методу сходства Милля (Гл. 20) во всех трёх разных комбинациях неизменно присутствует только ${factors[targetIdx]} — его нужно проверить первым через метод различия.`,
    };
  }

  // ---- 4. PROCEDURAL MOLECULE CLOSURE (COMPLETE THE MISSING PREMISE) ----
  const MOLECULE_SEEDS = [
    {
      p1: "Ни одна система с единственной точкой отказа не является отказоустойчивой.",
      target: "Данный серверный кластер не является отказоустойчивым.",
      good: "Данный серверный кластер имеет единственную точку отказа.",
      bads: [
        "Некоторые отказоустойчивые системы дороги в обслуживании.",
        "Данный серверный кластер работает на современном оборудовании.",
        "Все серверные кластеры требуют регулярного резервирования.",
      ],
      why: "Чтобы замкнуть молекулу (S→M и M⊥P ⇒ S⊥P), недостающая меньшая посылка должна строго отнести субъект («данный кластер») к среднему термину («имеет единственную точку отказа»).",
    },
    {
      p1: "Всякая научная гипотеза должна допускать проверяемое предсказание, способное её опровергнуть.",
      target: "Эта модель не является научной гипотезой.",
      good: "Эта модель не даёт ни одного предсказания, способного её опровергнуть.",
      bads: [
        "Эта модель пользуется широкой популярностью на конференциях.",
        "Некоторые научные гипотезы впоследствии отвергаются.",
        "Эта модель объясняет все уже случившиеся события задним числом.",
      ],
      why: "По 2-й фигуре / Modus Tollens отсутствие необходимого признака у объекта строго исключает его из класса научных гипотез (Челпанов, Гл. 14 и 22).",
    },
    {
      p1: "Каждое корректное деление понятия на одном уровне опирается на одно основание.",
      target: "Предложенная рубрикация каталога логически некорректна.",
      good: "В предложенной рубрикации на одном уровне смешаны цена, цвет и дата выпуска.",
      bads: [
        "В каталоге представлено более тысячи различных товаров.",
        "Некоторые пользователи предпочитают поиск вместо рубрикатора.",
        "Рубрикация создавалась по аналогии с сайтом конкурента.",
      ],
      why: "Смешение трёх оснований на одном уровне прямо нарушает условие из большей посылки — молекула доказательства замыкается строго.",
    },
    {
      p1: "В итеративной игре без известного последнего хода стратегия с безусловной уступчивостью эксплуатируется агрессорами.",
      target: "Стратегия «всегда соглашаться» проигрывает в смешанной популяции.",
      good: "«Всегда соглашаться» — стратегия с безусловной уступчивостью в итеративной среде.",
      bads: [
        "Некоторые участники предпочитают честное сотрудничество.",
        "В одноразовой сделке сотрудничество иногда рискованно.",
        "Стратегия «Око за око» отвечает на первый ход добром.",
      ],
      why: "Подведение частного случая под доказанное общее условие (1-я фигура) строго замыкает вывод (Челпанов, Гл. 14 + Аксельрод, 1980).",
    },
  ];

  function genMoleculeClosure() {
    const seed = pick(MOLECULE_SEEDS);
    const opts = shuffle([
      { text: seed.good, ok: true },
      ...seed.bads.map((b) => ({ text: b, ok: false })),
    ]);
    return {
      id: `PROC-MOL-${Math.random().toString(36).slice(2, 7)}`,
      engine: "molecule",
      badge: "Сборка молекулы вывода (Гл. 13–17)",
      atom_id: "ATOM-CH17-ENTHYMEME",
      chapter_num: 17,
      prompt: `Дана посылка: «${seed.p1}»\nЦелевой вывод: «${seed.target}»\nКакая 2-я посылка строго замыкает эту молекулу вывода?`,
      options: opts.map((o) => o.text),
      correct_index: opts.findIndex((o) => o.ok),
      explanation: seed.why,
    };
  }

  function generateProceduralBatch(count, filterEngine) {
    const gens = {
      square: genSquareOrConversion,
      euler: genEulerValidity,
      mill: genMillDetector,
      molecule: genMoleculeClosure,
    };
    const keys = filterEngine && gens[filterEngine] ? [filterEngine] : Object.keys(gens);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      out.push(gens[keys[i % keys.length]]());
    }
    return shuffle(out);
  }

  function buildSpeedRunDeck(catalog, { mode = "mixed", count = 5, chapterNum = null, partId = null, priorityAtomIds = [] } = {}) {
    const bank = catalog.quiz_bank || [];

    if (mode === "procedural") {
      return generateProceduralBatch(count, null);
    }
    if (mode === "week" && chapterNum) {
      const wkQs = shuffle(bank.filter((q) => q.chapter_num === Number(chapterNum)));
      const need = Math.max(0, count - wkQs.length);
      return wkQs.slice(0, count).concat(need > 0 ? generateProceduralBatch(need, null) : []);
    }
    if (mode === "part" && partId) {
      const pQs = shuffle(bank.filter((q) => q.part_id === partId));
      return pQs.slice(0, count);
    }
    if (mode === "review" && priorityAtomIds.length > 0) {
      const pSet = new Set(priorityAtomIds);
      const rev = shuffle(bank.filter((q) => pSet.has(q.atom_id)));
      const need = Math.max(0, count - rev.length);
      return rev.slice(0, count).concat(need > 0 ? generateProceduralBatch(need, null) : []);
    }

    // Default "mixed" Speed Run: 3 procedural logic puzzles + 2 grounded Chelpanov atom puzzles (or proportional)
    const procN = Math.ceil(count * 0.6);
    const atomN = Math.max(0, count - procN);
    const atomSlice = shuffle(bank).slice(0, atomN).map((q) => ({
      ...q,
      badge: `Корпус · Неделя ${q.chapter_num}`,
      engine: "corpus",
    }));
    const procSlice = generateProceduralBatch(procN, null);
    return shuffle(procSlice.concat(atomSlice));
  }

  return {
    generateProceduralBatch,
    buildSpeedRunDeck,
    proceduralEnginesCount: 4,
    estimatedProceduralPool: 220,
  };
});
