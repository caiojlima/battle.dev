import { describe, expect, it, vi } from "vitest"

import { computeWeightedScore, getQuestionWeights, inferWeightsFromQuestion, pickRoundQuestion } from "../../game/scoring.js"
import { QUESTION_WEIGHTS } from "../../game/constants.js"

describe("game/scoring (extra coverage)", () => {
  it("inferWeightsFromQuestion deve aplicar fallback completo quando nÃ£o hÃ¡ match", () => {
    const w = inferWeightsFromQuestion("zzz sem match de regex")
    expect(w).toEqual({
      performance: 1,
      facilidade: 1,
      mercado: 1,
      complexidade: 1,
      popularidade: 1,
    })
  })

  it("inferWeightsFromQuestion deve inverter pesos quando pergunta Ã© negativa (fora do mapa)", () => {
    const w = inferWeightsFromQuestion("Qual linguagem Ã© pior em performance?")
    expect(w.performance).toBe(-1)
  })

  it("getQuestionWeights deve preferir QUESTION_WEIGHTS quando existe", () => {
    const [q] = Object.keys(QUESTION_WEIGHTS)
    expect(q).toBeTruthy()
    expect(getQuestionWeights(q)).toEqual(QUESTION_WEIGHTS[q])
  })

  it("computeWeightedScore deve retornar 0 quando weights Ã© null/undefined", () => {
    expect(computeWeightedScore({ performance: 10 }, null)).toBe(0)
    expect(computeWeightedScore({ performance: 10 }, undefined)).toBe(0)
  })

  it("pickRoundQuestion deve retornar null para entradas invÃ¡lidas", () => {
    expect(pickRoundQuestion(null, new Set())).toBeNull()
    expect(pickRoundQuestion([], new Set())).toBeNull()
  })

  it("pickRoundQuestion deve limpar usedQuestions quando esgota (cobre branch) ", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    const questions = ["Q1", "Q2"]
    const used = new Set(["Q1", "Q2"])
    const q = pickRoundQuestion(questions, used)

    expect(questions).toContain(q)
    expect(used.size).toBe(1)
  })
})
