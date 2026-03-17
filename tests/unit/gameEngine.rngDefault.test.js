import { describe, expect, it, vi } from "vitest"

import { createGameEngine } from "../../server/game-engine.js"
import { pickRoundQuestion } from "../../game/scoring.js"

describe("server/game-engine (rng default)", () => {
  it("deve usar rng default (Math.random) quando rng nÃ£o Ã© fornecido", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42)

    const broadcasted = []
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      // precisa de 3+ itens para garantir chamadas do comparator do sort
      languages: [
        { name: "A", stats: { performance: 1 } },
        { name: "B", stats: { performance: 2 } },
        { name: "C", stats: { performance: 3 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: () => 0,
      pickRoundQuestion,
      broadcastRoom: (room, payload) => broadcasted.push(payload),
      // sem rng
    })

    const p1 = { readyState: 1, send() {} }
    const p2 = { readyState: 1, send() {} }
    const room = {
      players: { 1: p1, 2: p2 },
      playerNames: { 1: "P1", 2: "P2" },
      hands: { 1: [], 2: [] },
      plays: {},
      score: { 1: 0, 2: 0 },
      usedQuestions: new Set(),
      opponentPickTimeout: null,
      roundResolutionStarted: false,
      currentQuestion: null,
    }

    engine.startRound(room)

    // Se o comparator do sort rodou, rng default executa Math.random()
    expect(randomSpy).toHaveBeenCalled()
    expect(broadcasted.some((m) => m.type === "question")).toBe(true)
  })
})

