import { beforeEach, describe, expect, it, vi } from "vitest"

import { createGameEngine } from "../../server/game-engine.js"
import { getWeightedScore, pickRoundQuestion } from "../../game/scoring.js"
import { createMockSocket } from "../mocks/socket.mock.js"

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

describe("server/game-engine (extra coverage)", () => {
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

  it("createGameEngine deve exigir broadcastRoom", () => {
    expect(() =>
      createGameEngine({
        winScore: 5,
        cardsPerPlayer: 1,
        languages: [],
        questions: [],
        opponentPickTimeoutMs: 1000,
        getWeightedScore,
        pickRoundQuestion,
        broadcastRoom: null,
      })
    ).toThrow()
  })

  it("startRound deve retornar quando faltar jogador", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [{ name: "A", stats: { performance: 1 } }],
      questions: ["Q"],
      opponentPickTimeoutMs: 1000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
    })

    const r = createRoom()
    r.players = { 1: createMockSocket() }
    engine.startRound(r)

    expect(broadcasted.length).toBe(0)
  })

  it("scheduleReveal deve ser no-op quando roundResolutionStarted jÃ¡ Ã© true", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 10 } },
        { name: "B", stats: { performance: 20 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name
    const p2Card = room.hands[2][0].name

    engine.handlePlay(room, 1, p1Card)
    room.roundResolutionStarted = true
    engine.handlePlay(room, 2, p2Card)

    vi.advanceTimersByTime(1500)
    expect(broadcasted.some((m) => m.type === "reveal")).toBe(false)
    expect(broadcasted.some((m) => m.type === "result" || m.type === "draw")).toBe(false)
  })

  it("auto-pick deve abortar quando o oponente desconecta antes do timeout", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 10 } },
        { name: "B", stats: { performance: 20 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 1000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name

    engine.handlePlay(room, 1, p1Card)
    delete room.players[2]

    vi.advanceTimersByTime(1000)
    expect(room.plays[2]).toBeUndefined()
  })

  it("auto-pick deve abortar se oponente jÃ¡ tiver jogado", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 10 } },
        { name: "B", stats: { performance: 20 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 1000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name

    engine.handlePlay(room, 1, p1Card)
    room.plays[2] = "B"

    vi.advanceTimersByTime(1000)
    // nÃ£o sobrescreve
    expect(room.plays[2]).toBe("B")
  })

  it("auto-pick deve abortar se a mÃ£o do oponente estiver vazia/nÃ£o for array", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [{ name: "A", stats: { performance: 10 } }],
      questions: ["Q"],
      opponentPickTimeoutMs: 1000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name

    engine.handlePlay(room, 1, p1Card)
    room.hands[2] = []

    vi.advanceTimersByTime(1000)
    expect(room.plays[2]).toBeUndefined()
  })

  it("auto-pick deve abortar se a carta sorteada nÃ£o tiver name", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [{ name: "A", stats: { performance: 10 } }],
      questions: ["Q"],
      opponentPickTimeoutMs: 1000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name

    engine.handlePlay(room, 1, p1Card)
    room.hands[2] = [{}]

    vi.advanceTimersByTime(1000)
    expect(room.plays[2]).toBeUndefined()
  })

  it("reveal/resolve devem cair em languages.find quando cartas saÃ­rem da mÃ£o antes do reveal", () => {
    const languages = [
      { name: "A", stats: { performance: 10 } },
      { name: "B", stats: { performance: 20 } },
    ]

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages,
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore: (card) => card.stats.performance,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name
    const p2Card = room.hands[2][0].name

    engine.handlePlay(room, 1, p1Card)
    engine.handlePlay(room, 2, p2Card)

    // remove cartas da mÃ£o, forÃ§ando fallback para languages.find
    room.hands[1] = []
    room.hands[2] = []

    vi.advanceTimersByTime(500)
    const reveal = broadcasted.find((m) => m.type === "reveal")
    expect(reveal.player1Card?.name).toBe(p1Card)
    expect(reveal.player2Card?.name).toBe(p2Card)

    vi.advanceTimersByTime(900)
    const result = broadcasted.find((m) => m.type === "result")
    expect(result).toBeTruthy()

    const perf = Object.fromEntries(languages.map((c) => [c.name, c.stats.performance]))
    const expectedWinner = perf[p1Card] > perf[p2Card] ? 1 : 2
    expect(result.winner).toBe(expectedWinner)
  })

  it("resolveRound deve retornar cedo quando um play some antes do reveal", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [
        { name: "A", stats: { performance: 10 } },
        { name: "B", stats: { performance: 20 } },
      ],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name
    const p2Card = room.hands[2][0].name

    engine.handlePlay(room, 1, p1Card)
    engine.handlePlay(room, 2, p2Card)

    delete room.plays[2]

    vi.advanceTimersByTime(500 + 900)
    expect(broadcasted.some((m) => m.type === "reveal")).toBe(true)
    expect(broadcasted.some((m) => m.type === "result" || m.type === "draw" || m.type === "gameover")).toBe(false)
  })

  it("resolveRound deve enviar draw quando nÃ£o consegue localizar cartas", () => {
    const languages = [
      { name: "A", stats: { performance: 10 } },
      { name: "B", stats: { performance: 20 } },
    ]

    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages,
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: (r, payload) => broadcasted.push(payload),
      rng: () => 0,
    })

    engine.startRound(room)
    const p1Card = room.hands[1][0].name
    const p2Card = room.hands[2][0].name

    engine.handlePlay(room, 1, p1Card)
    engine.handlePlay(room, 2, p2Card)

    // remove tudo para nÃ£o achar cartas nem na mÃ£o nem em languages
    room.hands[1] = []
    room.hands[2] = []
    languages.length = 0

    vi.advanceTimersByTime(500 + 900)
    expect(broadcasted.some((m) => m.type === "draw")).toBe(true)
  })

  it("handlePlay deve rejeitar jogadas invÃ¡lidas (invalid_play)", () => {
    const engine = createGameEngine({
      winScore: 5,
      cardsPerPlayer: 1,
      languages: [{ name: "A", stats: { performance: 10 } }],
      questions: ["Q"],
      opponentPickTimeoutMs: 10_000,
      getWeightedScore,
      pickRoundQuestion,
      broadcastRoom: () => {},
      // cobre branch do default rng
    })

    engine.startRound(room)
    expect(engine.handlePlay(room, 1, null)).toEqual({ ok: false, reason: "invalid_play" })

    const card = room.hands[1][0].name
    expect(engine.handlePlay(room, 1, card).ok).toBe(true)
    expect(engine.handlePlay(room, 1, card)).toEqual({ ok: false, reason: "invalid_play" })
  })
})
