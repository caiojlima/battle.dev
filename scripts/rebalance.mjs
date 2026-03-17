import { LANGUAGES, QUESTIONS, QUESTION_WEIGHTS } from "../game/constants.js"
import { computeWeightedScore } from "../game/scoring.js"

function parseArgs(argv) {
  const args = {
    top: 10,
    eps: 1e-9,
    suggest: false,
    steps: 250,
    stepSize: 1,
    l2: 0.15,
    seed: null,
    format: "text", // text | json
    objective: "reduce-dominance", // reduce-dominance | uniform
    mutable: "winners", // winners | all
    mutableTop: null, // include top-N by avg score (in addition to `mutable` filter)
    maxDelta: 6, // limite absoluto por stat vs original (preserva "realidade")
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--suggest") args.suggest = true
    else if (a === "--json") args.format = "json"
    else if (a === "--top") args.top = Number(argv[++i] ?? args.top)
    else if (a === "--eps") args.eps = Number(argv[++i] ?? args.eps)
    else if (a === "--steps") args.steps = Number(argv[++i] ?? args.steps)
    else if (a === "--step") args.stepSize = Number(argv[++i] ?? args.stepSize)
    else if (a === "--l2") args.l2 = Number(argv[++i] ?? args.l2)
    else if (a === "--seed") args.seed = Number(argv[++i] ?? 1)
    else if (a === "--objective") args.objective = String(argv[++i] ?? args.objective)
    else if (a === "--mutable") args.mutable = String(argv[++i] ?? args.mutable)
    else if (a === "--mutable-top") args.mutableTop = Number(argv[++i] ?? args.mutableTop)
    else if (a === "--max-delta") args.maxDelta = Number(argv[++i] ?? args.maxDelta)
  }

  return args
}

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function clamp01(n) {
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function scoreMatrix(languages, questions) {
  const matrix = []
  for (const q of questions) {
    const weights = QUESTION_WEIGHTS[q]
    if (!weights) throw new Error(`Pergunta sem pesos: ${q}`)

    const row = languages.map((lang) => {
      return {
        name: lang.name,
        score: computeWeightedScore(lang.stats, weights),
      }
    })
    row.sort((a, b) => b.score - a.score)

    // margem entre 1o e 2o (para enxergar perguntas decididas por pouco)
    const margin = row.length >= 2 ? row[0].score - row[1].score : 0
    matrix.push({ question: q, weights, ranking: row, margin })
  }
  return matrix
}

function winShares(matrix, eps) {
  const shares = new Map() // name -> fractional wins
  const perQuestion = []

  for (const row of matrix) {
    const top = row.ranking[0]?.score ?? -Infinity
    const winners = row.ranking.filter((x) => Math.abs(x.score - top) < eps).map((x) => x.name)
    const share = winners.length > 0 ? 1 / winners.length : 0

    for (const w of winners) shares.set(w, (shares.get(w) || 0) + share)
    perQuestion.push({ question: row.question, winners, margin: row.margin, topScore: top })
  }

  return { shares, perQuestion }
}

function mean(values) {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function std(values) {
  const m = mean(values)
  const v = mean(values.map((x) => (x - m) ** 2))
  return Math.sqrt(v)
}

function objectiveValue({ matrix, eps, objective }) {
  const { shares } = winShares(matrix, eps)
  const names = Array.from(shares.keys())
  const totals = names.map((n) => shares.get(n))

  const m = mean(totals)

  if (objective === "uniform") {
    // minimiza desvio quadrÃ¡tico do uniform (todos com mesma fraÃ§Ã£o de vitÃ³rias)
    return mean(totals.map((t) => (t - m) ** 2))
  }

  // reduce-dominance: penaliza especialmente o "top 1" (evita um campeÃ£o sempre)
  const max = Math.max(...totals)
  return (max - m) ** 2 + mean(totals.map((t) => (t - m) ** 2)) * 0.35
}

function statKeysFromWeights() {
  const keys = new Set()
  for (const w of Object.values(QUESTION_WEIGHTS)) {
    for (const k of Object.keys(w)) keys.add(k)
  }
  return Array.from(keys)
}

function proposeRebalance({ seed, steps, stepSize, l2, eps, objective }) {
  const rand = seed == null ? Math.random : mulberry32(seed)

  const original = deepClone(LANGUAGES)
  const current = deepClone(LANGUAGES)
  const keys = statKeysFromWeights()

  const baseMatrix = scoreMatrix(current, QUESTIONS)
  let bestObj = objectiveValue({ matrix: baseMatrix, eps, objective })
  let best = deepClone(current)

  for (let i = 0; i < steps; i++) {
    const langIdx = Math.floor(rand() * current.length)
    const lang = current[langIdx]
    const key = keys[Math.floor(rand() * keys.length)]

    const dir = rand() < 0.5 ? -1 : 1
    const old = Number(lang.stats[key] ?? 0)
    const next = clamp01(old + dir * stepSize)
    if (next === old) continue

    lang.stats[key] = next

    const matrix = scoreMatrix(current, QUESTIONS)
    const obj = objectiveValue({ matrix, eps, objective })

    // regulariza: nÃ£o deixa "viajar" muito longe do original (preserva fidelidade)
    let reg = 0
    for (let j = 0; j < current.length; j++) {
      for (const k of keys) {
        const d = (current[j].stats[k] ?? 0) - (original[j].stats[k] ?? 0)
        reg += d * d
      }
    }
    const total = obj + (l2 * reg) / (current.length * keys.length * 100)

    // aceita se melhor, ou com chance pequena (simulated annealing leve)
    const temperature = Math.max(0.02, 1 - i / steps)
    const accept = total <= bestObj || rand() < Math.exp((bestObj - total) / temperature)

    if (!accept) {
      lang.stats[key] = old
      continue
    }

    if (total < bestObj) {
      bestObj = total
      best = deepClone(current)
    }
  }

  return { best, bestObj }
}

function avgScoresByLanguage(matrix) {
  const sums = new Map()
  const counts = new Map()
  for (const row of matrix) {
    for (const r of row.ranking) {
      sums.set(r.name, (sums.get(r.name) || 0) + r.score)
      counts.set(r.name, (counts.get(r.name) || 0) + 1)
    }
  }
  const out = []
  for (const [name, sum] of sums) {
    out.push({ name, avg: sum / (counts.get(name) || 1) })
  }
  out.sort((a, b) => b.avg - a.avg)
  return out
}

function buildMutableSet({ baseMatrix, eps, mutable, mutableTop }) {
  if (mutable === "all") return new Set(LANGUAGES.map((l) => l.name))

  const base = winShares(baseMatrix, eps).shares
  const set = new Set()
  for (const [name, wins] of base.entries()) {
    if (wins > 0) set.add(name)
  }

  if (Number.isFinite(mutableTop) && mutableTop > 0) {
    const ranked = avgScoresByLanguage(baseMatrix).slice(0, mutableTop)
    for (const r of ranked) set.add(r.name)
  }

  return set
}

function proposeRebalanceConstrained({ seed, steps, stepSize, l2, eps, objective, mutable, mutableTop, maxDelta }) {
  const rand = seed == null ? Math.random : mulberry32(seed)

  const original = deepClone(LANGUAGES)
  const current = deepClone(LANGUAGES)
  const keys = statKeysFromWeights()

  const baseMatrix = scoreMatrix(current, QUESTIONS)
  const mutableSet = buildMutableSet({ baseMatrix, eps, mutable, mutableTop })
  const mutableIndices = current
    .map((l, idx) => ({ idx, name: l.name }))
    .filter((x) => mutableSet.has(x.name))
    .map((x) => x.idx)

  if (mutableIndices.length === 0) {
    throw new Error("Nenhuma linguagem elegÃ­vel para mutaÃ§Ã£o (mutableSet vazio).")
  }

  let bestObj = objectiveValue({ matrix: baseMatrix, eps, objective })
  let best = deepClone(current)

  for (let i = 0; i < steps; i++) {
    const langIdx = mutableIndices[Math.floor(rand() * mutableIndices.length)]
    const lang = current[langIdx]
    const key = keys[Math.floor(rand() * keys.length)]

    const dir = rand() < 0.5 ? -1 : 1
    const old = Number(lang.stats[key] ?? 0)
    const next = clamp01(old + dir * stepSize)
    if (next === old) continue

    const orig = Number(original[langIdx].stats[key] ?? 0)
    if (Number.isFinite(maxDelta) && Math.abs(next - orig) > maxDelta) continue

    lang.stats[key] = next

    const matrix = scoreMatrix(current, QUESTIONS)
    const obj = objectiveValue({ matrix, eps, objective })

    let reg = 0
    for (let j = 0; j < current.length; j++) {
      for (const k of keys) {
        const d = (current[j].stats[k] ?? 0) - (original[j].stats[k] ?? 0)
        reg += d * d
      }
    }
    const total = obj + (l2 * reg) / (current.length * keys.length * 100)

    const temperature = Math.max(0.02, 1 - i / steps)
    const accept = total <= bestObj || rand() < Math.exp((bestObj - total) / temperature)

    if (!accept) {
      lang.stats[key] = old
      continue
    }

    if (total < bestObj) {
      bestObj = total
      best = deepClone(current)
    }
  }

  return { best, bestObj, mutable: Array.from(mutableSet) }
}

function topWinnersReport({ matrix, eps, top }) {
  const { shares } = winShares(matrix, eps)
  const entries = Array.from(shares.entries()).sort((a, b) => b[1] - a[1])
  const totalQuestions = QUESTIONS.length

  return entries.slice(0, top).map(([name, wins]) => ({
    name,
    wins,
    winPct: (wins / totalQuestions) * 100,
  }))
}

function perQuestionReport({ matrix, eps, top }) {
  const rows = matrix
    .map((r) => {
      const topScore = r.ranking[0]?.score ?? 0
      const winners = r.ranking.filter((x) => Math.abs(x.score - topScore) < eps).map((x) => x.name)
      return {
        question: r.question,
        winners,
        margin: r.margin,
        top3: r.ranking.slice(0, 3),
      }
    })
    .sort((a, b) => a.margin - b.margin) // mais apertadas primeiro

  return rows.slice(0, top)
}

const args = parseArgs(process.argv.slice(2))

const matrix = scoreMatrix(LANGUAGES, QUESTIONS)
const winnersTop = topWinnersReport({ matrix, eps: args.eps, top: Math.max(5, args.top) })
const tightest = perQuestionReport({ matrix, eps: args.eps, top: args.top })

if (!args.suggest) {
  const payload = {
    summary: {
      languages: LANGUAGES.length,
      questions: QUESTIONS.length,
      attributes: statKeysFromWeights(),
    },
    winnersTop,
    tightestQuestions: tightest,
  }

  if (args.format === "json") {
    process.stdout.write(JSON.stringify(payload, null, 2))
  } else {
    console.log(`SimulaÃ§Ã£o: ${payload.summary.languages} linguagens, ${payload.summary.questions} perguntas`)
    console.log(`Atributos: ${payload.summary.attributes.join(", ")}`)
    console.log("")
    console.log("Top vencedores (por contagem de perguntas):")
    for (const w of winnersTop) {
      console.log(`- ${w.name}: ${w.wins.toFixed(2)} (${w.winPct.toFixed(1)}%)`)
    }
    console.log("")
    console.log(`Perguntas mais apertadas (top ${args.top} por menor margem):`)
    for (const r of tightest) {
      const winners = r.winners.join(", ")
      const top3 = r.top3.map((x) => `${x.name}(${x.score.toFixed(2)})`).join(" > ")
      console.log(`- ${r.question}`)
      console.log(`  winners: ${winners} | margin: ${r.margin.toFixed(4)} | top3: ${top3}`)
    }
  }

  process.exit(0)
}

const { best, bestObj, mutable: mutableNames } = proposeRebalanceConstrained({
  seed: args.seed,
  steps: args.steps,
  stepSize: args.stepSize,
  l2: args.l2,
  eps: args.eps,
  objective: args.objective,
  mutable: args.mutable,
  mutableTop: args.mutableTop,
  maxDelta: args.maxDelta,
})

const bestMatrix = scoreMatrix(best, QUESTIONS)
const improvedTop = topWinnersReport({ matrix: bestMatrix, eps: args.eps, top: Math.max(5, args.top) })

const baseShares = winShares(matrix, args.eps).shares
const bestShares = winShares(bestMatrix, args.eps).shares

const deltas = best.map((lang) => {
  const original = LANGUAGES.find((l) => l.name === lang.name)
  const changed = {}
  for (const k of Object.keys(lang.stats)) {
    const a = original?.stats?.[k] ?? 0
    const b = lang.stats[k] ?? 0
    if (a !== b) changed[k] = b - a
  }

  return {
    name: lang.name,
    winsBefore: Number(baseShares.get(lang.name) || 0),
    winsAfter: Number(bestShares.get(lang.name) || 0),
    changes: changed,
  }
})

const out = {
  objective: { kind: args.objective, bestObj },
  constraints: { mutable: args.mutable, mutableTop: args.mutableTop, maxDelta: args.maxDelta, mutableNames },
  winnersTopBefore: winnersTop,
  winnersTopAfter: improvedTop,
  deltas: deltas.filter((d) => Object.keys(d.changes).length > 0),
  suggestedLanguages: best,
}

if (args.format === "json") {
  process.stdout.write(JSON.stringify(out, null, 2))
} else {
  console.log(`SugestÃ£o por simulaÃ§Ã£o (steps=${args.steps}, step=${args.stepSize}, l2=${args.l2}, objective=${args.objective})`)
  console.log("")
  console.log("Top vencedores (antes):")
  for (const w of winnersTop) console.log(`- ${w.name}: ${w.wins.toFixed(2)} (${w.winPct.toFixed(1)}%)`)
  console.log("")
  console.log("Top vencedores (depois):")
  for (const w of improvedTop) console.log(`- ${w.name}: ${w.wins.toFixed(2)} (${w.winPct.toFixed(1)}%)`)
  console.log("")
  console.log("Mudanças sugeridas (deltas em stats; mantendo 0..100):")
  for (const d of out.deltas) {
    const ch = Object.entries(d.changes)
      .map(([k, v]) => `${k}:${v > 0 ? "+" : ""}${v}`)
      .join(", ")
    console.log(`- ${d.name}: wins ${d.winsBefore.toFixed(2)} -> ${d.winsAfter.toFixed(2)} | ${ch}`)
  }
  console.log("")
  console.log("Dica: rode com `--json` para exportar a lista `suggestedLanguages` e revisar antes de aplicar.")
}
