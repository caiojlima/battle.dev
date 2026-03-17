import { describe, expect, it, vi } from "vitest"

import { RoomStore, broadcastRoom } from "../../server/room-store.js"
import { createGameEngine } from "../../server/game-engine.js"
import { createGameService } from "../../server/game-service.js"
import { createMockSocket, getSentMessages, lastMessageOfType } from "../mocks/socket.mock.js"

describe("integration/game flow", () => {
  it("deve finalizar partida ao atingir winScore", () => {
    vi.useFakeTimers()

    const roomStore = new RoomStore()
    const engine = createGameEngine({
      winScore: 2,
      cardsPerPlayer: 1,
      languages: [
        { name: "WIN", stats: { performance: 100 } },
        { name: "LOSE", stats: { performance: 0 } },
      ],
      questions: ["performance"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: (card) => (card.name === "WIN" ? 10 : 0),
      pickRoundQuestion: (qs, used) => {
        // mantem comportamento básico de usedQuestions
        if (!(used instanceof Set)) throw new Error("usedQuestions deve ser Set")
        const q = qs[0]
        used.add(q)
        return q
      },
      broadcastRoom,
      rng: () => 0, // distribui WIN para P1 e LOSE para P2
    })

    const service = createGameService({ roomStore, engine })
    const p1 = createMockSocket()
    const p2 = createMockSocket()

    service.handleMessage(p1, JSON.stringify({ type: "join", name: "Alice" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "Bob" }))

    // Rodada 1: ambos jogam
    const p1Hand = lastMessageOfType(p1, "newCards").languages
    const p2Hand = lastMessageOfType(p2, "newCards").languages
    service.handleMessage(p1, JSON.stringify({ type: "play", card: p1Hand[0].name }))
    service.handleMessage(p2, JSON.stringify({ type: "play", card: p2Hand[0].name }))
    vi.advanceTimersByTime(500 + 900)

    expect(getSentMessages(p1).some((m) => m.type === "result")).toBe(true)

    // Rodada 2
    service.handleMessage(p1, JSON.stringify({ type: "next" }))
    const p1Hand2 = lastMessageOfType(p1, "newCards").languages
    const p2Hand2 = lastMessageOfType(p2, "newCards").languages
    service.handleMessage(p1, JSON.stringify({ type: "play", card: p1Hand2[0].name }))
    service.handleMessage(p2, JSON.stringify({ type: "play", card: p2Hand2[0].name }))
    vi.advanceTimersByTime(500 + 900)

    expect(getSentMessages(p1).some((m) => m.type === "gameover")).toBe(true)
    expect(getSentMessages(p2).some((m) => m.type === "gameover")).toBe(true)
  })

  it("edge: deve lidar com empate (draw) sem pontuar", () => {
    vi.useFakeTimers()

    const roomStore = new RoomStore()
    const engine = createGameEngine({
      winScore: 2,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 10 } },
        { name: "B", stats: { performance: 10 } },
      ],
      questions: ["performance"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: () => 1,
      pickRoundQuestion: (qs, used) => {
        used.add(qs[0])
        return qs[0]
      },
      broadcastRoom,
      rng: () => 0,
    })

    const service = createGameService({ roomStore, engine })
    const p1 = createMockSocket()
    const p2 = createMockSocket()

    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    const p1Hand = lastMessageOfType(p1, "newCards").languages
    const p2Hand = lastMessageOfType(p2, "newCards").languages
    service.handleMessage(p1, JSON.stringify({ type: "play", card: p1Hand[0].name }))
    service.handleMessage(p2, JSON.stringify({ type: "play", card: p2Hand[0].name }))
    vi.advanceTimersByTime(500 + 900)

    const msgs = getSentMessages(p1)
    expect(msgs.some((m) => m.type === "draw")).toBe(true)
  })
})

