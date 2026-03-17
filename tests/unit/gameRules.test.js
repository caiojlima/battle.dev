import { describe, expect, it } from "vitest"

import {
  computeWeightedScore,
  getWeightedScore,
  inferWeightsFromQuestion,
  pickRoundQuestion,
} from "../../game/scoring.js"

describe("game/scoring", () => {
  it("inferWeightsFromQuestion deve retornar null para pergunta vazia", () => {
    expect(inferWeightsFromQuestion(null)).toBeNull()
    expect(inferWeightsFromQuestion("")).toBeNull()
  })

  it("inferWeightsFromQuestion deve produzir pesos não vazios", () => {
    const w = inferWeightsFromQuestion("Qual linguagem é melhor para backend?")
    expect(w).toBeTruthy()
    expect(Object.keys(w).length).toBeGreaterThan(0)
  })

  it("getWeightedScore deve retornar 0 com pesos nulos", () => {
    const card = { stats: { performance: 50 } }
    expect(getWeightedScore(card, null)).toBe(0)
  })

  it("computeWeightedScore deve computar soma ponderada", () => {
    const stats = { performance: 10, facilidade: 20 }
    const weights = { performance: 1, facilidade: 0.5 }
    expect(computeWeightedScore(stats, weights)).toBe(10 + 20 * 0.5)
  })

  it("computeWeightedScore deve tratar stats ausentes como 0", () => {
    const stats = {}
    const weights = { performance: 1, mercado: 1 }
    expect(computeWeightedScore(stats, weights)).toBe(0)
  })

  it("getWeightedScore deve considerar stats ausentes como 0", () => {
    const card = { stats: {} }
    const score = getWeightedScore(card, "Qual linguagem é melhor para backend?")
    expect(Number.isFinite(score)).toBe(true)
  })

  it("pickRoundQuestion não deve repetir até esgotar", () => {
    const questions = ["Q1", "Q2", "Q3"]
    const used = new Set()

    const picked = new Set()
    for (let i = 0; i < questions.length; i++) {
      const q = pickRoundQuestion(questions, used)
      picked.add(q)
    }

    expect(picked.size).toBe(3)
    expect(used.size).toBe(3)

    // Esgotou: deve limpar e voltar a permitir
    const next = pickRoundQuestion(questions, used)
    expect(questions).toContain(next)
    expect(used.size).toBe(1)
  })

  it("pickRoundQuestion deve lançar se usedQuestions não for Set", () => {
    expect(() => pickRoundQuestion(["Q1"], null)).toThrow()
  })

  it("exhaustivo: computeWeightedScore deve respeitar comparação por atributo (peso +1)", () => {
    const keys = ["performance", "facilidade", "mercado", "complexidade", "popularidade", "tooling", "verbosidade", "mobile"]

    for (const key of keys) {
      const weights = { [key]: 1 }

      for (let a = 0; a <= 100; a++) {
        for (let b = 0; b <= 100; b++) {
          const sA = computeWeightedScore({ [key]: a }, weights)
          const sB = computeWeightedScore({ [key]: b }, weights)

          if (a === b) expect(sA).toBe(sB)
          if (a > b) expect(sA).toBeGreaterThan(sB)
          if (a < b) expect(sA).toBeLessThan(sB)
        }
      }
    }
  })

  it("exhaustivo: computeWeightedScore deve inverter preferência com peso -1", () => {
    const keys = ["performance", "facilidade", "mercado", "complexidade", "popularidade", "tooling", "verbosidade", "mobile"]

    for (const key of keys) {
      const weights = { [key]: -1 }

      for (let a = 0; a <= 100; a++) {
        for (let b = 0; b <= 100; b++) {
          const sA = computeWeightedScore({ [key]: a }, weights)
          const sB = computeWeightedScore({ [key]: b }, weights)

          if (a === b) expect(sA).toBe(sB)
          if (a > b) expect(sA).toBeLessThan(sB)
          if (a < b) expect(sA).toBeGreaterThan(sB)
        }
      }
    }
  })

  it("property: computeWeightedScore é determinístico e aditivo", () => {
    const stats = { performance: 10, facilidade: 20, mercado: 30, complexidade: 40, popularidade: 50, tooling: 60, verbosidade: 70, mobile: 80 }
    const w1 = { performance: 1, mercado: 0.5 }
    const w2 = { facilidade: 2 }

    const s1 = computeWeightedScore(stats, w1)
    const s2 = computeWeightedScore(stats, w2)
    const s12 = computeWeightedScore(stats, { ...w1, ...w2 })

    expect(s1).toBe(computeWeightedScore(stats, w1))
    expect(s2).toBe(computeWeightedScore(stats, w2))
    expect(s12).toBe(s1 + s2)
  })
})
