import { QUESTION_WEIGHTS } from "./constants.js"

/**
 * Inferência heurística de pesos a partir do texto da pergunta.
 *
 * Objetivo: quando uma pergunta não estiver no mapa `QUESTION_WEIGHTS`,
 * ainda assim conseguimos pontuar cartas com base em palavras-chave.
 */
export function inferWeightsFromQuestion(question) {
  if (!question) return null

  const q = String(question).toLowerCase()

  // Perguntas negativas buscam o "pior" — invertendo os pesos, o maior score continua vencendo.
  const isNegative =
    /\b(pior|desaparecer|superestimad|c[oó]digo feio|t[oó]xica|bugs|arrogant|bagun[cç]ad|spaghetti|depend[eê]ncias quebradas|questionar a vida)\b/.test(
      q
    )

  const weights = {}

  if (/(performance|alta performance|r[aá]pid|escala|cloud|microservi[cç]os|cr[ií]tic)/.test(q)) {
    weights.performance = 1
  }
  if (/(f[aá]cil|iniciante|sintaxe|produtiv|boilerplate|debug|autocomplete|dor de cabe[cç]a|intuitiv)/.test(q)) {
    weights.facilidade = 1
  }
  if (/(mercado|vaga|emprego|carreira|remot|oportunidad|exterior|brasil|entrevist|demanda|internacional)/.test(q)) {
    weights.mercado = 1
  }
  if (/(comunidade|biblioteca|ecossistema|framework|github|youtube|meme|material de estudo|documenta[cç][aã]o|tutorial)/.test(q)) {
    weights.popularidade = 1
  }
  if (/(dif[ií]cil|complex|refator|manter|ileg[ií]vel|legado)/.test(q)) {
    weights.complexidade = 1
  }

  // Fallback para nunca ficar sem pesos.
  if (Object.keys(weights).length === 0) {
    weights.performance = 1
    weights.facilidade = 1
    weights.mercado = 1
    weights.complexidade = 1
    weights.popularidade = 1
  }

  if (isNegative) {
    for (const k of Object.keys(weights)) weights[k] = -weights[k]
  }

  return weights
}

export function getQuestionWeights(question) {
  return QUESTION_WEIGHTS[question] || inferWeightsFromQuestion(question)
}

/**
 * Computa score linear (soma ponderada) dado um objeto de stats e um mapa de pesos.
 *
 * - Stats ausentes contam como 0.
 * - Mantém comportamento simples (multiplicação direta), para espelhar o que o server usa.
 */
export function computeWeightedScore(stats, weights) {
  if (!weights) return 0

  return Object.entries(weights).reduce((total, [stat, weight]) => {
    return total + ((stats?.[stat] || 0) * weight)
  }, 0)
}

export function getWeightedScore(card, question) {
  const weights = getQuestionWeights(question)
  return computeWeightedScore(card?.stats, weights)
}

export function pickRoundQuestion(questions, usedQuestions) {
  if (!Array.isArray(questions) || questions.length === 0) return null

  if (!(usedQuestions instanceof Set)) {
    throw new Error("usedQuestions deve ser um Set")
  }

  let available = questions.filter((q) => !usedQuestions.has(q))
  if (available.length === 0) {
    usedQuestions.clear()
    available = questions.slice()
  }

  const question = available[Math.floor(Math.random() * available.length)]
  usedQuestions.add(question)
  return question
}
