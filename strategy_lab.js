/* Strategy Lab v4.1 — 8-Archetype Axelrod with Live Hypothesis Elimination Matrix,
 * Editable & True-Random Nash 2x2 Mechanism Designer, and Diablo-Style Procedural Dungeon Generator.
 * Pure UMD module (browser + Node.js unit tests).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TGStrategy = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // ==================== 1. ROBERT AXELROD (1980) ENGINE + HYPOTHESIS ELIMINATION ====================
  const PAYOFF = {
    CC: [3, 3],
    CD: [0, 5],
    DC: [5, 0],
    DD: [1, 1],
  };

  function makePayoffTable(custom) {
    if (!custom) return PAYOFF;
    const T = Number(custom.T ?? 5);
    const R = Number(custom.R ?? 3);
    const P = Number(custom.P ?? 1);
    const S = Number(custom.S ?? 0);
    return {
      CC: [R, R],
      CD: [S, T],
      DC: [T, S],
      DD: [P, P],
    };
  }

  const STRATEGIES = [
    {
      id: "tft",
      name: "Око за око (Tit-for-Tat)",
      shortName: "Око за око",
      formula: "Старт C; ход t = твой ход (t−1)",
      tag: "Победитель Аксельрода (1980)",
      desc: "Начинает с доверия (C), затем точно зеркалит твой прошлый шаг: сразу наказывает за D и мгновенно прощает возврат к C.",
      decide: (myHist, oppHist) => (oppHist.length === 0 ? "C" : oppHist[oppHist.length - 1]),
    },
    {
      id: "gtft",
      name: "Великодушное Око за око",
      shortName: "Великодушный",
      formula: "Зеркалит, но прощает каждый 2-й твой D",
      tag: "Гасит спираль мести",
      desc: "На первый твой нажим (D) отвечает твёрдым D, но каждый второй твой D великодушно гасит ходом C, чтобы остановить войну.",
      decide: (myHist, oppHist) => {
        if (oppHist.length === 0) return "C";
        const last = oppHist[oppHist.length - 1];
        if (last === "C") return "C";
        const totalOppD = oppHist.filter((m) => m === "D").length;
        return totalOppD % 2 === 0 ? "C" : "D";
      },
    },
    {
      id: "pavlov",
      name: "Павлов (Win-Stay, Lose-Shift)",
      shortName: "Павлов",
      formula: "Повтор хода при очках ≥ R, смена при провале",
      tag: "Эксплуатирует мягких",
      desc: "Если прошлый раунд принёс хороший результат (CC или DC) — повторяет свой ход! Поэтому после твоего D и возврата к C начинает давить тебя дальше.",
      decide: (myHist, oppHist, _r, payTable) => {
        if (myHist.length === 0) return "C";
        const pay = payTable || PAYOFF;
        const rVal = pay.CC[0];
        const myL = myHist[myHist.length - 1];
        const opL = oppHist[oppHist.length - 1];
        return pay[myL + opL][0] >= rVal ? myL : myL === "C" ? "D" : "C";
      },
    },
    {
      id: "grim",
      name: "Злопамятный (Grim Trigger)",
      shortName: "Злопамятный",
      formula: "C до первого твоего D, затем навсегда D",
      tag: "Вечная месть за 1 срыв",
      desc: "Мирно сотрудничает, но стоит тебе хотя бы один раз нажать D — никогда больше не прощает и до конца бьёт D.",
      decide: (_myHist, oppHist) => (oppHist.includes("D") ? "D" : "C"),
    },
    {
      id: "detective",
      name: "Детектив (Prober C·D·C·C)",
      shortName: "Детектив",
      formula: "Ходы 1–4: C,D,C,C; если ты смолчал — давит D, иначе TFT",
      tag: "Проверяет твои границы",
      desc: "На 2-м ходу специально проверяет тебя уколом D! Если ты за первые 4 хода ни разу не дал сдачи — считает тебя беззащитным и включает вечный D; если дал отпор — уважает и играет Око за око.",
      decide: (_myHist, oppHist) => {
        const opening = ["C", "D", "C", "C"];
        const t = oppHist.length;
        if (t < 4) return opening[t];
        const oppRetaliated = oppHist.slice(0, 4).includes("D");
        if (!oppRetaliated) return "D";
        return oppHist[t - 1];
      },
    },
    {
      id: "alt",
      name: "Маятник (Чередователь C·D)",
      shortName: "Маятник",
      formula: "Нечётные ходы C, чётные ходы D",
      tag: "Механический цикл",
      desc: "Не смотрит на твои действия вовсе: механически чередует уступку (C) и нажим (D) каждый ход.",
      decide: (_myHist, oppHist) => (oppHist.length % 2 === 0 ? "C" : "D"),
    },
    {
      id: "allc",
      name: "Миротворец (All-C)",
      shortName: "Миротворец",
      formula: "Всегда C на любом ходу",
      tag: "Без личных границ",
      desc: "Безусловно выбирает C, даже когда об него вытирают ноги. Даёт максимум в паре с добрыми, но разоряется об хищников.",
      decide: () => "C",
    },
    {
      id: "alld",
      name: "Хищник (All-D)",
      shortName: "Хищник",
      formula: "Всегда D с 1-го хода",
      tag: "Чистая агрессия",
      desc: "С самого первого раунда жмёт только D. Любая твоя попытка договориться (C) отдаёт ему 5 очков, а тебе 0 — против него работает только защита D.",
      decide: () => "D",
    },
  ];

  /* Replays every candidate strategy against player's actual move history so far
   * and eliminates any candidate that contradicts even 1 observed opponent move (Modus Tollens!).
   */
  function evaluateHypothesisCompatibility(myHist, oppHist, customPayoff) {
    const pay = makePayoffTable(customPayoff);
    return STRATEGIES.map((strat) => {
      const simOpp = [];
      const simPlayer = [];
      let eliminatedAt = null;
      for (let r = 0; r < myHist.length; r += 1) {
        const expectedMove = strat.decide(simOpp, simPlayer, r, pay);
        if (expectedMove !== oppHist[r] && eliminatedAt === null) {
          eliminatedAt = r + 1;
        }
        simOpp.push(expectedMove);
        simPlayer.push(myHist[r]);
      }
      const nextMove = strat.decide(simOpp, simPlayer, myHist.length, pay);
      return {
        id: strat.id,
        name: strat.name,
        shortName: strat.shortName,
        formula: strat.formula,
        compatible: eliminatedAt === null,
        eliminatedAt,
        nextMove,
      };
    });
  }

  function suggestDiagnosticMove(compatList, myHist) {
    const alive = compatList.filter((c) => c.compatible);
    if (alive.length <= 1) {
      return alive.length === 1
        ? `Маска математически вскрыта: всем ходам удовлетворяет ровно 1 алгоритм — «${alive[0].shortName}»! Жми его имя ниже.`
        : "Наблюдаемые ходы разошлись со стандартными моделями.";
    }
    if (myHist.length === 0) {
      return "Ход 1: начни с «🤝 Сотрудничать (C)» — это сразу отделит чистого Хищника (All-D) от остальных 7 алгоритмов!";
    }
    const neverPressedD = !myHist.includes("D");
    if (neverPressedD && myHist.length >= 2) {
      return "Важно: пока ты жмёшь только C, все мирные стратегии (Око за око, Великодушный, Павлов, Злопамятный, Миротворец) неотличимы! Сделай 1 диагностический укол «⚡ Проверить (D)», а затем снова C.";
    }
    const ids = new Set(alive.map((x) => x.id));
    if (ids.has("tft") && ids.has("pavlov")) {
      return "Остались Око за око и Павлов: нажми «🤝 Сотрудничать (C)»! Око за око сразу помирится (C), а Павлов после выигрыша на D продолжит давить (D)!";
    }
    if (ids.has("grim") && (ids.has("tft") || ids.has("gtft"))) {
      return "Чтобы отделить Злопамятного от прощающих стратегий, нажми «🤝 Сотрудничать (C)»: Злопамятный останется в вечном D.";
    }
    if (ids.has("tft") && ids.has("gtft")) {
      return "Чтобы развести Око за око и Великодушного, нужен второй проверочный ход «⚡ Проверить (D)» — Великодушный простит 2-й укол и ответит C!";
    }
    return `Подходят ${alive.length} алгоритма (${alive.map((a) => a.shortName).join(", ")}). Чередуй пробный D и примирительный C, чтобы развести их реакции.`;
  }

  function playMatch(stratA, stratB, rounds = 25, customPayoff = null) {
    const pay = makePayoffTable(customPayoff);
    const hA = [];
    const hB = [];
    let sA = 0;
    let sB = 0;
    for (let r = 0; r < rounds; r += 1) {
      const mA = stratA.decide(hA, hB, r, pay);
      const mB = stratB.decide(hB, hA, r, pay);
      const [pA, pB] = pay[mA + mB];
      sA += pA;
      sB += pB;
      hA.push(mA);
      hB.push(mB);
    }
    return { scoreA: sA, scoreB: sB, histA: hA, histB: hB };
  }

  function runRoundRobinTournament(roundsPerMatch = 25, customPayoff = null) {
    const totals = Object.fromEntries(STRATEGIES.map((s) => [s.id, 0]));
    for (let i = 0; i < STRATEGIES.length; i += 1) {
      for (let j = 0; j < STRATEGIES.length; j += 1) {
        const res = playMatch(STRATEGIES[i], STRATEGIES[j], roundsPerMatch, customPayoff);
        totals[STRATEGIES[i].id] += res.scoreA;
      }
    }
    const ranking = STRATEGIES.map((s) => ({
      ...s,
      total: totals[s.id],
      avgPerRound: Number((totals[s.id] / (STRATEGIES.length * roundsPerMatch)).toFixed(2)),
    })).sort((a, b) => b.total - a.total);
    return { ranking, roundsPerMatch };
  }

  // ==================== 2. DYNAMIC NASH EQUILIBRIUM & MECHANISM DESIGNER ====================
  const NASH_TEMPLATES = [
    {
      key: "0",
      shortLabel: "☕ Два кафе",
      title: "Два кафе рядом (Ценовая война)",
      story: "Две кофейни на одной улице. Оба держат честную цену → по 4. Один демпингует → забирает поток (6 против 1). Демпингуют оба → оба теряют маржу (2, 2).",
      rows: ["Держать цену", "Демпинг −30%"],
      cols: ["Держать цену", "Демпинг −30%"],
      cells: [
        [[4, 4], [1, 6]],
        [[6, 1], [2, 2]],
      ],
      bridge: "В (4,4) выгодно обоим, но одиночный соблазн (4→6) утягивает обоих в бедный замок Нэша (2,2). Попробуй нажать «🎛 Менять веса» и добавить штраф за демпинг или бонус лояльности!",
    },
    {
      key: "1",
      shortLabel: "🤝 Контракт",
      title: "Разовая сделка (Доверие vs Халтура)",
      story: "Два партнёра без договора. Оба стараются → по 3. Один схалтурил за счёт другого → 5 против 0. Оба схалтурили → по 1.",
      rows: ["Сделать честно", "Схалтурить"],
      cols: ["Сделать честно", "Схалтурить"],
      cells: [
        [[3, 3], [0, 5]],
        [[5, 0], [1, 1]],
      ],
      bridge: "Без ответственности единственный замок — (1,1). Именно для переноса замка в (3,3) в жизни придуманы залоги, эскроу и репутация!",
    },
    {
      key: "2",
      shortLabel: "🦌 Олень",
      title: "Охота на оленя (Ловушка недоверия)",
      story: "Крупный совместный запуск даёт по 6, но требует вклада обоих. Если партнёр сольётся на мелкую шабашку (3), ты останешься с 0.",
      rows: ["Большой запуск", "Мелкий заказ"],
      cols: ["Большой запуск", "Мелкий заказ"],
      cells: [
        [[6, 6], [0, 3]],
        [[3, 0], [3, 3]],
      ],
      bridge: "Здесь СРАЗУ ДВА замка Нэша: богатый (6,6) и трусливый (3,3)! Чтобы перейти из (3,3) в (6,6), нужна прозрачность шагов и страховка старта.",
    },
    {
      key: "3",
      shortLabel: "🚦 Уступка",
      title: "Узкий мост (Ястребы и Голуби)",
      story: "Два отдела делят общий релизный слот. Если оба упрутся рогом — авария (0,0). Если один уступит — настырный получит 5, уступивший 2. Оба уступили — по 3.",
      rows: ["Уступить", "Продавить"],
      cols: ["Уступить", "Продавить"],
      cells: [
        [[3, 3], [2, 5]],
        [[5, 2], [0, 0]],
      ],
      bridge: "Два асимметричных замка Нэша: (2,5) и (5,2)! Побеждает тот, кто заранее зафиксировал понятное правило приоритета (например, WSJF), чтобы не сталкиваться в (0,0).",
    },
  ];

  function cloneCells(cells) {
    return cells.map((row) => row.map((pair) => [Number(pair[0]), Number(pair[1])]));
  }

  function findPureNashCoords(cells) {
    const eq = [];
    for (let r = 0; r < 2; r += 1) {
      for (let c = 0; c < 2; c += 1) {
        const myPay = cells[r][c][0];
        const altMyPay = cells[1 - r][c][0];
        const oppPay = cells[r][c][1];
        const altOppPay = cells[r][1 - c][1];
        if (myPay >= altMyPay && oppPay >= altOppPay) {
          eq.push(`${r},${c}`);
        }
      }
    }
    return eq;
  }

  function generatePureRandomNashGame(opts = {}) {
    const requirePure = opts.requirePure !== false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const rn = () => Math.floor(Math.random() * 10); // 0..9
      const cells = [
        [[rn(), rn()], [rn(), rn()]],
        [[rn(), rn()], [rn(), rn()]],
      ];
      // Avoid trivial all-equal matrices
      const flat = cells.flat(2);
      if (new Set(flat).size < 3) continue;
      const eq = findPureNashCoords(cells);
      if (!requirePure || eq.length >= 1) {
        return {
          key: "rnd",
          shortLabel: "🎲 Случайная",
          title: `Случайная матрица #${100 + Math.floor(Math.random() * 900)}`,
          story: "Свежая сгенерированная игра: синее число — твой выигрыш (строки ↑↓), золотое — партнёра (столбцы ←→). Проверь, где спрятан замок!",
          rows: ["Стратегия А1", "Стратегия А2"],
          cols: ["Ответ Б1", "Ответ Б2"],
          cells,
          nashCoords: eq,
          bridge:
            eq.length === 0
              ? "Редкий случай: 0 чистых замков (замкнутый круг побегов, как в «Камень-ножницы-бумага» — здесь работает только непредсказуемое смешивание!)."
              : eq.length === 1
              ? `Единственный замок Нэша в клетке (${eq[0].replace(",", ", ")}) — ни одной стороне не выгодно отклоняться в одиночку.`
              : `В этой матрице ${eq.length} устойчивых замка Нэша — исход решает предварительная договорённость и первый сигнал.`,
        };
      }
    }
    const fallbackCells = [
      [[4, 2], [1, 5]],
      [[6, 3], [2, 4]],
    ];
    return {
      key: "rnd",
      shortLabel: "🎲 Случайная",
      title: "Случайная матрица 2×2",
      story: "Проверь каждую клетку на односторонний побег.",
      rows: ["Стратегия А1", "Стратегия А2"],
      cols: ["Ответ Б1", "Ответ Б2"],
      cells: fallbackCells,
      nashCoords: findPureNashCoords(fallbackCells),
      bridge: "Замок Нэша найден по отсутствию выгодного одиночного побега.",
    };
  }

  function generateRandomNashGame(forceTemplateIdx = null) {
    if (typeof forceTemplateIdx === "number" && NASH_TEMPLATES[forceTemplateIdx]) {
      const base = NASH_TEMPLATES[forceTemplateIdx];
      const cells = cloneCells(base.cells);
      return { ...base, cells, nashCoords: findPureNashCoords(cells) };
    }
    return generatePureRandomNashGame({ requirePure: true });
  }

  function bestResponseColForRow(cells, rowIdx) {
    return cells[rowIdx][0][1] >= cells[rowIdx][1][1] ? 0 : 1;
  }

  // ==================== 3. DIABLO-STYLE PROCEDURAL DUNGEON & MICROMOUSE GENERATOR ====================
  /* Generates a procedural dungeon with rectangular stone chambers (rooms), winding corridors,
   * tactical loop passages, dead-end crypts, and Vision Shrines (◈) that pierce Fog of War!
   */
  function buildDiabloDungeon(opts = {}) {
    const N = [7, 9, 11, 13].includes(Number(opts.size)) ? Number(opts.size) : 11;
    const randomize = opts.randomize !== false;
    const initialSeed =
      typeof opts.seed === "number"
        ? opts.seed >>> 0
        : randomize
        ? (Math.floor(Math.random() * 899999) + 100000) >>> 0
        : 421980;
    let s = initialSeed;
    function rnd() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    }
    function rndInt(min, maxIncl) {
      return min + Math.floor(rnd() * (maxIncl - min + 1));
    }

    // Walls bitmask per cell: 1=N, 2=E, 4=S, 8=W (start completely solid)
    const walls = Array.from({ length: N }, () => Array(N).fill(15));
    const roomTile = Array.from({ length: N }, () => Array(N).fill(false));
    const dirs = [
      [-1, 0, 1, 4],
      [0, 1, 2, 8],
      [1, 0, 4, 1],
      [0, -1, 8, 2],
    ];

    function openWall(r1, c1, r2, c2) {
      if (r2 === r1 - 1 && c2 === c1) { walls[r1][c1] &= ~1; walls[r2][c2] &= ~4; }
      else if (r2 === r1 && c2 === c1 + 1) { walls[r1][c1] &= ~2; walls[r2][c2] &= ~8; }
      else if (r2 === r1 + 1 && c2 === c1) { walls[r1][c1] &= ~4; walls[r2][c2] &= ~1; }
      else if (r2 === r1 && c2 === c1 - 1) { walls[r1][c1] &= ~8; walls[r2][c2] &= ~2; }
    }

    // 1. Place Diablo-style Rectangular Chambers (Start Chamber, Sanctum Chamber + 2-3 Side Halls)
    const rooms = [];
    function carveRoom(r0, c0, h, w) {
      for (let r = r0; r < r0 + h; r += 1) {
        for (let c = c0; c < c0 + w; c += 1) {
          roomTile[r][c] = true;
          if (r + 1 < r0 + h) openWall(r, c, r + 1, c);
          if (c + 1 < c0 + w) openWall(r, c, r, c + 1);
        }
      }
      rooms.push({ r0, c0, h, w });
    }

    // Entrance chamber in SW quadrant, Goal Sanctum in NE/Center-North
    if (N >= 9) {
      carveRoom(N - 2, 0, 2, 2);
      const goalR0 = rndInt(1, 2);
      const goalC0 = rndInt(Math.floor(N / 2) - 1, N - 3);
      carveRoom(goalR0, goalC0, 2, 2);

      const extraRoomsTarget = N >= 11 ? 3 : 2;
      for (let att = 0; att < 35 && rooms.length < 2 + extraRoomsTarget; att += 1) {
        const rh = rnd() < 0.45 && N >= 11 ? 3 : 2;
        const rw = rnd() < 0.5 ? 3 : 2;
        const rr = rndInt(1, N - rh - 1);
        const cc = rndInt(1, N - rw - 1);
        let overlap = false;
        for (let r = rr - 1; r <= rr + rh; r += 1) {
          for (let c = cc - 1; c <= cc + rw; c += 1) {
            if (r >= 0 && r < N && c >= 0 && c < N && roomTile[r][c]) overlap = true;
          }
        }
        if (!overlap) carveRoom(rr, cc, rh, rw);
      }
    }

    const start = [N - 1, 0];
    const goal =
      rooms.length >= 2
        ? [rooms[1].r0 + Math.floor(rooms[1].h / 2), rooms[1].c0 + Math.floor(rooms[1].w / 2)]
        : [Math.floor(N / 2), Math.floor(N / 2)];

    // 2. Spanning-tree corridor network connecting ALL rooms and corridors (zero unreachable pockets!)
    const vis = Array.from({ length: N }, () => Array(N).fill(false));
    function markComponentAndCollect(sr, sc, stackRef, dirHint) {
      const st = [[sr, sc]];
      const added = [];
      if (!vis[sr][sc]) {
        vis[sr][sc] = true;
        added.push([sr, sc]);
      }
      while (st.length) {
        const [r, c] = st.pop();
        for (const [dr, dc, bit] of dirs) {
          if ((walls[r][c] & bit) === 0) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && !vis[nr][nc]) {
              vis[nr][nc] = true;
              st.push([nr, nc]);
              added.push([nr, nc]);
            }
          }
        }
      }
      // Shuffle room tiles slightly, keeping the entry tile on top so corridors can exit any wall of a chamber!
      for (let i = added.length - 1; i >= 0; i -= 1) {
        const [ar, ac] = added[i];
        stackRef.push([ar, ac, i === 0 ? dirHint : null]);
      }
    }

    function carveMazeFrom(r, c) {
      const stack = [];
      markComponentAndCollect(r, c, stack, null);
      // Iterative randomized DFS with slight corridor momentum (Diablo hallway feel)
      while (stack.length) {
        const top = stack[stack.length - 1];
        const [cr, cc, lastDir] = top;
        const candidates = [];
        for (let di = 0; di < 4; di += 1) {
          const [dr, dc] = dirs[di];
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && !vis[nr][nc]) {
            candidates.push(di);
          }
        }
        if (!candidates.length) {
          stack.pop();
          continue;
        }
        let chosenDi = candidates[Math.floor(rnd() * candidates.length)];
        if (lastDir !== null && candidates.includes(lastDir) && rnd() < 0.55) {
          chosenDi = lastDir;
        }
        const [dr, dc] = dirs[chosenDi];
        const nr = cr + dr;
        const nc = cc + dc;
        openWall(cr, cc, nr, nc);
        markComponentAndCollect(nr, nc, stack, chosenDi);
      }
    }
    carveMazeFrom(start[0], start[1]);

    // 3. Add Diablo loop doorways & tactical shortcuts (so exploration has real loops vs shortest path)
    const extraDoors = Math.max(5, Math.floor((N * N) / 14));
    for (let k = 0; k < extraDoors; k += 1) {
      const r = rndInt(1, N - 2);
      const c = rndInt(1, N - 2);
      const [dr, dc] = dirs[Math.floor(rnd() * 4)];
      openWall(r, c, r + dr, c + dc);
    }

    // 4. Flood-Fill exact shortest distance map from Goal ★
    const dist = Array.from({ length: N }, () => Array(N).fill(999));
    dist[goal[0]][goal[1]] = 0;
    const q = [goal];
    while (q.length) {
      const [r, c] = q.shift();
      for (const [dr, dc, bit] of dirs) {
        if ((walls[r][c] & bit) === 0) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && dist[nr][nc] > dist[r][c] + 1) {
            dist[nr][nc] = dist[r][c] + 1;
            q.push([nr, nc]);
          }
        }
      }
    }

    // 5. Place 2 Vision Shrines (◈) away from start & goal to reward exploration
    const shrines = [];
    if (N >= 9) {
      const candCells = [];
      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          const dStart = Math.abs(r - start[0]) + Math.abs(c - start[1]);
          const dGoal = Math.abs(r - goal[0]) + Math.abs(c - goal[1]);
          if (dStart >= 3 && dGoal >= 3 && dist[r][c] < 999) {
            candCells.push([r, c]);
          }
        }
      }
      candCells.sort(() => rnd() - 0.5);
      for (const rc of candCells) {
        if (shrines.every(([sr, sc]) => Math.abs(sr - rc[0]) + Math.abs(sc - rc[1]) >= 4)) {
          shrines.push(rc);
          if (shrines.length >= 2) break;
        }
      }
    }

    // 6. DFS exploration trace (Mapping / Fog-of-War discovery)
    const seen = new Set();
    const mappingPath = [];
    function dfs(r, c) {
      seen.add(`${r},${c}`);
      mappingPath.push([r, c]);
      if (r === goal[0] && c === goal[1]) return true;
      // Deliberately explore side branches without oracle knowledge of goal
      const order = dirs.slice().sort(() => rnd() - 0.5);
      for (const [dr, dc, bit] of order) {
        if ((walls[r][c] & bit) === 0) {
          const nr = r + dr;
          const nc = c + dc;
          if (!seen.has(`${nr},${nc}`)) {
            if (dfs(nr, nc)) return true;
            mappingPath.push([r, c]);
          }
        }
      }
      return false;
    }
    dfs(start[0], start[1]);

    // 7. Optimal Speed Run path via exact gradient descent
    const speedPath = [start];
    let [cr, cc] = start;
    let guard = 0;
    while ((cr !== goal[0] || cc !== goal[1]) && guard < N * N * 2) {
      guard += 1;
      let best = null;
      let bestD = dist[cr][cc];
      for (const [dr, dc, bit] of dirs) {
        if ((walls[cr][cc] & bit) === 0) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (dist[nr][nc] < bestD) {
            bestD = dist[nr][nc];
            best = [nr, nc];
          }
        }
      }
      if (!best) break;
      [cr, cc] = best;
      speedPath.push([cr, cc]);
    }

    return {
      N,
      seed: initialSeed,
      walls,
      roomTile,
      rooms,
      shrines,
      start,
      goal,
      dist,
      mappingPath,
      speedPath,
    };
  }

  // Shortest path over currently revealed tiles (enables 1-tap movement on mobile!)
  function shortestKnownPath(maze, fromRC, toRC, exploredSet) {
    const key = (r, c) => `${r},${c}`;
    const targetKey = key(toRC[0], toRC[1]);
    if (!exploredSet.has(targetKey)) return null;
    if (fromRC[0] === toRC[0] && fromRC[1] === toRC[1]) return [];

    const dirs = [
      [-1, 0, 1],
      [0, 1, 2],
      [1, 0, 4],
      [0, -1, 8],
    ];
    const prev = new Map();
    const q = [fromRC];
    prev.set(key(fromRC[0], fromRC[1]), null);

    while (q.length) {
      const [r, c] = q.shift();
      if (r === toRC[0] && c === toRC[1]) break;
      for (const [dr, dc, bit] of dirs) {
        if ((maze.walls[r][c] & bit) === 0) {
          const nr = r + dr;
          const nc = c + dc;
          const nk = key(nr, nc);
          if (nr >= 0 && nr < maze.N && nc >= 0 && nc < maze.N && exploredSet.has(nk) && !prev.has(nk)) {
            prev.set(nk, [r, c]);
            q.push([nr, nc]);
          }
        }
      }
    }

    if (!prev.has(targetKey)) return null;
    const steps = [];
    let cur = toRC;
    while (cur[0] !== fromRC[0] || cur[1] !== fromRC[1]) {
      steps.push(cur);
      cur = prev.get(key(cur[0], cur[1]));
      if (!cur) break;
    }
    return steps.reverse();
  }

  function buildMicromouseMaze(randomize = false, size = 7) {
    return buildDiabloDungeon({ size, randomize });
  }

  return {
    PAYOFF,
    STRATEGIES,
    NASH_TEMPLATES,
    makePayoffTable,
    evaluateHypothesisCompatibility,
    suggestDiagnosticMove,
    playMatch,
    runRoundRobinTournament,
    findPureNashCoords,
    generatePureRandomNashGame,
    generateRandomNashGame,
    bestResponseColForRow,
    buildDiabloDungeon,
    shortestKnownPath,
    buildMicromouseMaze,
  };
});
