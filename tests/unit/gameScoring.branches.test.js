import { describe, expect, it } from "vitest"

import { inferWeightsFromQuestion } from "../../game/scoring.js"

describe("game/scoring (branches)", () => {
  it("inferWeightsFromQuestion deve reconhecer performance", () => {
    const w = inferWeightsFromQuestion("Alta performance e escala")
    expect(w).toHaveProperty("performance", 1)
  })

  it("inferWeightsFromQuestion deve reconhecer facilidade", () => {
    const w = inferWeightsFromQuestion("Qual linguagem Ã© mais fÃ¡cil para iniciante?")
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
    const w = inferWeightsFromQuestion("Refatorar e manter legado Ã© difÃ­cil")
    expect(w).toHaveProperty("complexidade", 1)
  })
})

