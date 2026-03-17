import { describe, expect, it } from "vitest"

import { startResultCalcAnimation } from "../../client/round-ui.js"
import { createMockElement, installMockDocument } from "../helpers/dom.mock.js"

describe("client/round-ui (branches)", () => {
  it("startResultCalcAnimation deve usar defaults e ignorar cards invÃ¡lidos", () => {
    const cards = createMockElement({ id: "cards" })
    const status = createMockElement({ id: "status" })
    installMockDocument({ cards, status })

    const state = { resultCalcStartedAt: null, pendingResultTimeout: null }
    startResultCalcAnimation(state, {
      playerNames: null,
      p1Card: "nao-objeto",
      p2Card: null,
    })

    expect(cards.innerHTML).toContain("Calculando resultado")
    // sem cards vÃ¡lidos, nÃ£o deve renderizar preview de cartas
    expect(cards.innerHTML).not.toContain("calc-preview")
  })
})

