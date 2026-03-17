import { describe, expect, it } from "vitest"

import { renderScore, updateScoreIndicators } from "../../client/ui/scoreboard.js"
import { createMockElement, installMockDocument } from "../helpers/dom.mock.js"

describe("client/ui/scoreboard", () => {
  it("renderScore deve suportar playerId=2 e nomes ausentes (fallback)", () => {
    const score = createMockElement({ id: "score" })
    installMockDocument({ score })

    renderScore({ score: { 1: 1, 2: 2 }, playerId: 2, playerNames: {} })
    expect(score.innerHTML).toContain("Jogador 2")
    expect(score.innerHTML).toContain("Jogador 1")
  })

  it("renderScore deve usar fallback quando score/playerNames sÃ£o ausentes", () => {
    const score = createMockElement({ id: "score" })
    installMockDocument({ score })

    renderScore({ score: undefined, playerId: undefined, playerNames: undefined })
    expect(score.innerHTML).toContain("Jogador 1")
    expect(score.innerHTML).toContain('id="p1">0</span>')
  })

  it("updateScoreIndicators deve marcar check quando playedBy inclui ids", () => {
    const score = createMockElement({ id: "score" })
    const p1 = createMockElement({ id: "p1" })
    const p2 = createMockElement({ id: "p2" })
    p1.innerText = "3"
    p2.innerText = "4"

    installMockDocument({ score, p1, p2 })

    updateScoreIndicators({ playedBy: [1], playerId: 2, playerNames: { 1: "A", 2: "B" } })
    expect(score.innerHTML).toContain("✓")
  })
})
