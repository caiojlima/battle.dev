import { beforeEach, describe, expect, it, vi } from "vitest"

import { createGameEngine } from "../../server/game-engine.js"
import { createMockSocket, getSentMessages, lastMessageOfType } from "../mocks/socket.mock.js"

function createRoom() {
  return {
    roomId: "1",
    players: {},
    playerNames: { 1: "P1", 2: "P2" },
    hands: { 1: [], 2: [] },
    plays: {},
    score: { 1: 0, 2: 0 },
    rematchVotes: 0,
    currentQuestion: null,
    usedQuestions: new Set(),
    opponentPickTimeout: null,
    roundResolutionStarted: false,
  }
}

describe("server/game-engine (result explanation)", () => {
  let room
  let p1
  let p2
  let broadcasted

  beforeEach(() => {
    room = createRoom()
    p1 = createMockSocket()
    p2 = createMockSocket()
    room.players = { 1: p1, 2: p2 }
    broadcasted = []
  })

  it("deve incluir weightBreakdown no payload de result quando getQuestionWeights existir", () => {
    vi.useFakeTimers()

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "WIN", stats: { performance: 88 } },
        { name: "LOSE", stats: { performance: 65 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: (card) => Number(card?.stats?.performance || 0),
      getQuestionWeights: () => ({ performance: 1 }),
      pickRoundQuestion: (qs, used) => {
        const q = qs[0]
        used.add(q)
        return q
      },
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Hand = lastMessageOfType(p1, "newCards").languages
    const p2Hand = lastMessageOfType(p2, "newCards").languages

    engine.handlePlay(room, 1, p1Hand[0].name)
    engine.handlePlay(room, 2, p2Hand[0].name)

    vi.advanceTimersByTime(500 + 900)

    const result = broadcasted.find((m) => m.type === "result")
    expect(result).toBeTruthy()
    expect(result).toHaveProperty("weightBreakdown")
    expect(result.weightBreakdown).toHaveProperty("weights.performance", 1)
    expect(result.weightBreakdown).toHaveProperty("keyStat.stat", "performance")
    expect(result.weightBreakdown).toHaveProperty("keyStat.winnerValue", 88)
    expect(result.weightBreakdown).toHaveProperty("keyStat.loserValue", 65)

    // Campos de conveniência pro client
    expect(result).toHaveProperty("winnerCard", "WIN")
    expect(result).toHaveProperty("loserCard", "LOSE")

    // sanity: os players recebem init/newCards normalmente
    expect(getSentMessages(p1).some((m) => m.type === "newCards")).toBe(true)
    expect(getSentMessages(p2).some((m) => m.type === "newCards")).toBe(true)
  })

  it("deve cobrir branches: winner=1 dentro do keyStat (cond-expr)", () => {
    vi.useFakeTimers()

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "WIN", stats: { performance: 20 } },
        { name: "LOSE", stats: { performance: 10 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: (card) => Number(card?.stats?.performance || 0),
      getQuestionWeights: () => ({ performance: 1 }),
      pickRoundQuestion: (qs, used) => {
        const q = qs[0]
        used.add(q)
        return q
      },
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    room.currentQuestion = "Q"
    room.hands = {
      1: [{ name: "WIN", stats: { performance: 20 } }],
      2: [{ name: "LOSE", stats: { performance: 10 } }],
    }

    engine.handlePlay(room, 1, "WIN")
    engine.handlePlay(room, 2, "LOSE")
    vi.advanceTimersByTime(500 + 900)

    const result = broadcasted.find((m) => m.type === "result")
    expect(result).toBeTruthy()
    expect(result.winner).toBe(1)
    expect(result.weightBreakdown).toHaveProperty("keyStat.stat", "performance")
  })

  it("deve incluir weightBreakdown no payload de draw (keyStat null)", () => {
    vi.useFakeTimers()

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 10 } },
        { name: "B", stats: { performance: 10 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: () => 1, // empate garantido
      getQuestionWeights: () => ({ performance: 1 }),
      pickRoundQuestion: (qs, used) => {
        const q = qs[0]
        used.add(q)
        return q
      },
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Hand = lastMessageOfType(p1, "newCards").languages
    const p2Hand = lastMessageOfType(p2, "newCards").languages

    engine.handlePlay(room, 1, p1Hand[0].name)
    engine.handlePlay(room, 2, p2Hand[0].name)
    vi.advanceTimersByTime(500 + 900)

    const draw = broadcasted.find((m) => m.type === "draw")
    expect(draw).toBeTruthy()
    expect(draw).toHaveProperty("question", "Q")
    expect(draw).toHaveProperty("weightBreakdown")
    expect(draw.weightBreakdown).toHaveProperty("weights.performance", 1)
    expect(draw.weightBreakdown.keyStat).toBe(null)
  })

  it("keyStat.better deve ser 'lower' quando weight for negativo", () => {
    vi.useFakeTimers()

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "LOW", stats: { complexidade: 10 } },
        { name: "HIGH", stats: { complexidade: 90 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: (card) => -(Number(card?.stats?.complexidade || 0)),
      getQuestionWeights: () => ({ complexidade: -1 }),
      pickRoundQuestion: (qs, used) => {
        const q = qs[0]
        used.add(q)
        return q
      },
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Hand = lastMessageOfType(p1, "newCards").languages
    const p2Hand = lastMessageOfType(p2, "newCards").languages

    engine.handlePlay(room, 1, p1Hand[0].name)
    engine.handlePlay(room, 2, p2Hand[0].name)
    vi.advanceTimersByTime(500 + 900)

    const result = broadcasted.find((m) => m.type === "result")
    expect(result).toBeTruthy()
    expect(result.weightBreakdown).toHaveProperty("keyStat.stat", "complexidade")
    expect(result.weightBreakdown).toHaveProperty("keyStat.better", "lower")
  })

  it("weightBreakdown deve ser null quando getQuestionWeights retornar algo invÃ¡lido", () => {
    vi.useFakeTimers()

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "WIN", stats: { performance: 2 } },
        { name: "LOSE", stats: { performance: 1 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: (card) => Number(card?.stats?.performance || 0),
      getQuestionWeights: () => "bad",
      pickRoundQuestion: (qs, used) => {
        const q = qs[0]
        used.add(q)
        return q
      },
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Hand = lastMessageOfType(p1, "newCards").languages
    const p2Hand = lastMessageOfType(p2, "newCards").languages
    engine.handlePlay(room, 1, p1Hand[0].name)
    engine.handlePlay(room, 2, p2Hand[0].name)
    vi.advanceTimersByTime(500 + 900)

    const result = broadcasted.find((m) => m.type === "result")
    expect(result).toBeTruthy()
    expect(result.weightBreakdown).toBe(null)
  })

  it("deve incluir weightBreakdown no payload de gameover", () => {
    vi.useFakeTimers()

    const engine = createGameEngine({
      winScore: 1,
      cardsPerPlayer: 1,
      languages: [
        { name: "WIN", stats: { performance: 100 } },
        { name: "LOSE", stats: { performance: 0 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: (card) => Number(card?.stats?.performance || 0),
      getQuestionWeights: () => ({ performance: 1 }),
      pickRoundQuestion: (qs, used) => {
        const q = qs[0]
        used.add(q)
        return q
      },
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Hand = lastMessageOfType(p1, "newCards").languages
    const p2Hand = lastMessageOfType(p2, "newCards").languages
    engine.handlePlay(room, 1, p1Hand[0].name)
    engine.handlePlay(room, 2, p2Hand[0].name)
    vi.advanceTimersByTime(500 + 900)

    const over = broadcasted.find((m) => m.type === "gameover")
    expect(over).toBeTruthy()
    expect(over).toHaveProperty("weightBreakdown.weights.performance", 1)
  })

  it("deve cobrir branches: winner=2, pesos 0 e keyStat com if falso", () => {
    vi.useFakeTimers()

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "LOSE", stats: { performance: 10, tooling: 0, mercado: 100 } },
        { name: "WIN", stats: { performance: 20, tooling: 0, mercado: 0 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: (card) => Number(card?.stats?.performance || 0),
      getQuestionWeights: () => ({ tooling: 0, performance: 1, mercado: 1 }),
      pickRoundQuestion: (qs, used) => {
        const q = qs[0]
        used.add(q)
        return q
      },
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    // Evita depender do shuffle: fixa as mÃ£os manualmente para garantir winner=2.
    room.currentQuestion = "Q"
    room.hands = {
      1: [{ name: "LOSE", stats: { performance: 10, tooling: 0, mercado: 100 } }],
      2: [{ name: "WIN", stats: { performance: 20, tooling: 0, mercado: 0 } }],
    }

    engine.handlePlay(room, 1, "LOSE")
    engine.handlePlay(room, 2, "WIN")
    vi.advanceTimersByTime(500 + 900)

    const result = broadcasted.find((m) => m.type === "result")
    expect(result).toBeTruthy()
    expect(result.winner).toBe(2)
    expect(result.weightBreakdown).toHaveProperty("weights.tooling", 0)
    expect(result.weightBreakdown).toHaveProperty("weights.performance", 1)
  })
})
