import { beforeEach, describe, expect, it, vi } from "vitest"

import { RoomStore } from "../../server/room-store.js"
import { createGameEngine } from "../../server/game-engine.js"
import { createGameService } from "../../server/game-service.js"
import { createMockSocket, getSentMessages } from "../mocks/socket.mock.js"
import { getWeightedScore, pickRoundQuestion } from "../../game/scoring.js"

function createTestService({ rng = () => 0 } = {}) {
  const roomStore = new RoomStore()
  const broadcasted = []

  const engine = createGameEngine({
    winScore: 2,
    cardsPerPlayer: 1,
    languages: [
      { name: "A", stats: { performance: 10, facilidade: 10, mercado: 10, complexidade: 10, popularidade: 10 } },
      { name: "B", stats: { performance: 90, facilidade: 90, mercado: 90, complexidade: 10, popularidade: 90 } },
    ],
    questions: ["Qual linguagem é melhor para backend?"],
    opponentPickTimeoutMs: 10_000,
    getWeightedScore,
    pickRoundQuestion,
    broadcastRoom: (room, payload) => {
      broadcasted.push({ roomId: room.roomId, ...payload })
      for (const ws of Object.values(room.players)) {
        if (ws?.readyState === 1) ws.send(JSON.stringify(payload))
      }
    },
    rng,
  })

  const service = createGameService({ roomStore, engine })
  return { roomStore, service, broadcasted }
}

describe("integration/websocket multiplayer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("deve colocar 2 jogadores na mesma sala e iniciar partida", () => {
    const { service } = createTestService()
    const p1 = createMockSocket()
    const p2 = createMockSocket()

    service.handleMessage(p1, JSON.stringify({ type: "join", name: "Alice" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "Bob" }))

    const m1 = getSentMessages(p1)
    const m2 = getSentMessages(p2)

    expect(m1.some((m) => m.type === "joined")).toBe(true)
    expect(m2.some((m) => m.type === "joined")).toBe(true)
    expect(m1.some((m) => m.type === "init")).toBe(true)
    expect(m2.some((m) => m.type === "init")).toBe(true)
    expect(m1.some((m) => m.type === "question")).toBe(true)
  })

  it("quando só um jogar, deve iniciar timer e auto-pick após 10s", () => {
    const { service } = createTestService({ rng: () => 0 })
    const p1 = createMockSocket()
    const p2 = createMockSocket()

    service.handleMessage(p1, JSON.stringify({ type: "join", name: "Alice" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "Bob" }))

    const p1NewCards = getSentMessages(p1).find((m) => m.type === "newCards").languages
    service.handleMessage(p1, JSON.stringify({ type: "play", card: p1NewCards[0].name }))

    expect(getSentMessages(p1).some((m) => m.type === "pickTimer")).toBe(true)
    expect(getSentMessages(p2).some((m) => m.type === "pickTimer")).toBe(true)

    vi.advanceTimersByTime(10_000)
    vi.advanceTimersByTime(500 + 900)

    // Deve ter revelado e resolvido
    expect(getSentMessages(p1).some((m) => m.type === "reveal")).toBe(true)
    expect(getSentMessages(p1).some((m) => m.type === "result" || m.type === "draw")).toBe(true)
  })

  it("deve rejeitar jogada inválida (carta não está na mão)", () => {
    const { service } = createTestService()
    const p1 = createMockSocket()
    const p2 = createMockSocket()

    service.handleMessage(p1, JSON.stringify({ type: "join", name: "Alice" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "Bob" }))

    service.handleMessage(p1, JSON.stringify({ type: "play", card: "INEXISTENTE" }))

    // Não deve travar, e não deve avançar reveal/resultado
    expect(getSentMessages(p1).some((m) => m.type === "reveal")).toBe(false)
  })
})

