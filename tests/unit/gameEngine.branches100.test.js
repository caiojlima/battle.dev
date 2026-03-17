import { beforeEach, describe, expect, it, vi } from "vitest"

import { createGameEngine } from "../../server/game-engine.js"
import { createMockSocket } from "../mocks/socket.mock.js"
import { pickRoundQuestion } from "../../game/scoring.js"

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

describe("server/game-engine (branches 100%)", () => {
  let room
  let p1
  let p2
  let broadcasted

  beforeEach(() => {
    vi.useFakeTimers()
    room = createRoom()
    p1 = createMockSocket()
    p2 = createMockSocket()
    room.players = { 1: p1, 2: p2 }
    broadcasted = []
  })

  it("auto-pick deve cair no fallback [] quando room.hands estÃ¡ ausente (line 67)", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 1 } },
        { name: "B", stats: { performance: 2 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 1000,
      getWeightedScore: () => 0,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name

    engine.handlePlay(room, 1, p1Card)
    // remove `hands` para que `room.hands?.[...] || []` use o fallback
    room.hands = null

    vi.advanceTimersByTime(1000)
    expect(room.plays[2]).toBeUndefined()
  })

  it("auto-pick nÃ£o deve scheduleReveal se o outro play sumir antes do timeout (line 82 false branch)", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 1 } },
        { name: "B", stats: { performance: 2 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 1000,
      getWeightedScore: () => 0,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name

    engine.handlePlay(room, 1, p1Card)

    // play do P1 some antes do auto-pick concluir
    delete room.plays[1]

    vi.advanceTimersByTime(1000)
    expect(room.plays[2]).toBeTruthy()
    expect(broadcasted.some((m) => m.type === "reveal")).toBe(false)
    expect(broadcasted.some((m) => m.type === "pickTimerStop")).toBe(false)
  })

  it("handlePlay com playerId=2 deve agendar auto-pick do oponente 1 (line 228 else branch)", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 1 } },
        { name: "B", stats: { performance: 2 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 1000,
      getWeightedScore: () => 0,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p2Card = room.hands[2][0].name
    const res = engine.handlePlay(room, 2, p2Card)

    expect(res).toEqual({ ok: true, scheduled: "auto_pick" })
    const timer = broadcasted.find((m) => m.type === "pickTimer")
    expect(timer.waitingFor).toBe(1)
  })
})

