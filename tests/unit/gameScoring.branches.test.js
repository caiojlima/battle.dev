import { describe, expect, it } from "vitest"

import { inferWeightsFromQuestion } from "../../game/scoring.js"

describe("game/scoring (branches)", () => {
  it("inferWeightsFromQuestion deve reconhecer performance", () => {
    const w = inferWeightsFromQuestion("Alta performance e escala")
    expect(w).toHaveProperty("performance", 1)
  })

  it("inferWeightsFromQuestion deve reconhecer facilidade", () => {
    const w = inferWeightsFromQuestion("Qual linguagem é mais fácil para iniciante?")
    expect(w).toHaveProperty("facilidade", 1)
  })

  it("inferWeightsFromQuestion deve reconhecer mercado", () => {
    const w = inferWeightsFromQuestion("Mercado: vaga e emprego no brasil")
    expect(w).toHaveProperty("mercado", 1)
  })

  it("inferWeightsFromQuestion deve reconhecer popularidade", () => {
    const w = inferWeightsFromQuestion("Comunidade, framework e ecossistema no github")
    expect(w).toHaveProperty("popularidade", 1)
  })

  it("inferWeightsFromQuestion deve reconhecer complexidade", () => {
    const w = inferWeightsFromQuestion("Refatorar e manter legado é difícil")
    expect(w).toHaveProperty("complexidade", 1)
  })

  it("inferWeightsFromQuestion deve reconhecer tooling", () => {
    const w = inferWeightsFromQuestion("Qual linguagem tem as melhores ferramentas e IDE?")
    expect(w).toHaveProperty("tooling", 1)
  })

  it("inferWeightsFromQuestion deve reconhecer verbosidade", () => {
    const w = inferWeightsFromQuestion("Qual linguagem é mais verbosa e tem boilerplate?")
    expect(w).toHaveProperty("verbosidade", 1)
  })

  it("inferWeightsFromQuestion deve reconhecer mobile", () => {
    const w = inferWeightsFromQuestion("Qual linguagem é melhor para apps Android e iOS?")
    expect(w).toHaveProperty("mobile", 1)
  })
})
