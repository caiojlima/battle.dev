import { beforeEach, describe, expect, it, vi } from "vitest"

import { createGameEngine, decideRoundWinner } from "../../server/game-engine.js"
import { createMockSocket, getSentMessages, lastMessageOfType } from "../mocks/socket.mock.js"
import { getWeightedScore, pickRoundQuestion } from "../../game/scoring.js"

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

describe("server/game-engine", () => {
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

  it("startMatch deve enviar init e iniciar question/newCards", () => {
    vi.useFakeTimers()

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 2,
      languages: [
        { name: "A", stats: { performance: 10 } },
        { name: "B", stats: { performance: 20 } },
        { name: "C", stats: { performance: 30 } },
        { name: "D", stats: { performance: 40 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0, // deterministic shuffle/pick
    })

    engine.startMatch(room)

    const p1Msgs = getSentMessages(p1)
    const p2Msgs = getSentMessages(p2)
    expect(p1Msgs.some((m) => m.type === "init")).toBe(true)
    expect(p2Msgs.some((m) => m.type === "init")).toBe(true)
    expect(p1Msgs.some((m) => m.type === "newCards")).toBe(true)
    expect(p2Msgs.some((m) => m.type === "newCards")).toBe(true)

    expect(broadcasted.some((m) => m.type === "question")).toBe(true)
  })

  it("handlePlay deve agendar auto-pick e depois revelar/resultado", () => {
    vi.useFakeTimers()

    const timers = {
      now: () => Date.now(),
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id),
    }

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 10 } },
        { name: "B", stats: { performance: 90 } },
      ],
      questions: ["Qual linguagem é melhor para backend?"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      timers,
      rng: () => 0, // pick A
    })

    engine.startRound(room)
    const hand1 = lastMessageOfType(p1, "newCards").languages
    const hand2 = lastMessageOfType(p2, "newCards").languages
    expect(hand1).toHaveLength(1)
    expect(hand2).toHaveLength(1)

    const playedCard = hand1[0].name
    engine.handlePlay(room, 1, playedCard)

    expect(broadcasted.some((m) => m.type === "pickTimer")).toBe(true)

    vi.advanceTimersByTime(10_000)

    // Auto pick deve ter preenchido o play do P2
    expect(room.plays[2]).toBeTruthy()

    // Depois do auto-pick, reveal é agendado (500ms) e resolve (900ms)
    vi.advanceTimersByTime(500 + 900)
    expect(broadcasted.some((m) => m.type === "reveal")).toBe(true)
    expect(broadcasted.some((m) => m.type === "result" || m.type === "draw")).toBe(true)
  })

  it("handlePlay deve rejeitar carta fora da mão", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [{ name: "A", stats: { performance: 10 } }],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: () => 0,
      pickRoundQuestion,
      broadcastRoom: () => {},
      rng: () => 0,
    })

    engine.startRound(room)
    const res = engine.handlePlay(room, 1, "INEXISTENTE")
    expect(res.ok).toBe(false)
    expect(res.reason).toBe("card_not_in_hand")
  })

  it("decideRoundWinner deve cobrir exaustivamente 0..100", () => {
    const values = Array.from({ length: 101 }, (_, i) => i)

    for (const a of values) {
      for (const b of values) {
        const out = decideRoundWinner(a, b, 1e-12)
        if (a === b) {
          expect(out).toEqual({ type: "draw" })
        } else if (a > b) {
          expect(out).toEqual({ type: "win", winner: 1 })
        } else {
          expect(out).toEqual({ type: "win", winner: 2 })
        }
      }
    }
  })

  it("decideRoundWinner deve respeitar eps (diferenças pequenas viram empate)", () => {
    const eps = 1e-9
    expect(decideRoundWinner(1, 1 + eps / 2, eps)).toEqual({ type: "draw" })
    expect(decideRoundWinner(1, 1 + eps * 2, eps)).toEqual({ type: "win", winner: 2 })
    expect(decideRoundWinner(1 + eps * 2, 1, eps)).toEqual({ type: "win", winner: 1 })
  })

  it("edge: decideRoundWinner com NaN mantém comportamento atual (sempre cai no else)", () => {
    // Documenta comportamento do JS: comparações com NaN retornam false.
    // Resultado: score1 > score2 é false, então winner vira 2.
    expect(decideRoundWinner(Number.NaN, 0)).toEqual({ type: "win", winner: 2 })
    expect(decideRoundWinner(0, Number.NaN)).toEqual({ type: "win", winner: 2 })
  })

  it("propriedade: se A vence B, B não pode vencer A (anti-simetria)", () => {
    const eps = 1e-12
    for (let a = 0; a <= 50; a++) {
      for (let b = 0; b <= 50; b++) {
        const ab = decideRoundWinner(a, b, eps)
        const ba = decideRoundWinner(b, a, eps)

        if (ab.type === "draw") {
          expect(ba.type).toBe("draw")
        } else {
          expect(ba.type).toBe("win")
          expect(ba.winner).toBe(ab.winner === 1 ? 2 : 1)
        }
      }
    }
  })
})
