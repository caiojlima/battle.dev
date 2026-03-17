import { beforeEach, describe, expect, it, vi } from "vitest"

import { RoomStore } from "../../server/room-store.js"
import { createGameService } from "../../server/game-service.js"
import { createMockSocket, getSentMessages, lastMessageOfType } from "../mocks/socket.mock.js"

function createEngineMock() {
  return {
    startMatch: vi.fn(),
    startRound: vi.fn(),
    handlePlay: vi.fn(() => ({ ok: true })),
  }
}

describe("server/game-service", () => {
  let roomStore
  let engine
  let service
  let timers

  beforeEach(() => {
    roomStore = new RoomStore()
    engine = createEngineMock()
    timers = {
      setTimeout: vi.fn((cb) => cb),
      clearTimeout: vi.fn(),
    }
    service = createGameService({ roomStore, engine, timers, rematchDecisionTimeoutMs: 15_000 })
  })

  it("handleJoin deve rejeitar nome vazio", () => {
    const ws = createMockSocket()
    service.handleJoin(ws, "   ")
    expect(getSentMessages(ws).length).toBe(0)
  })

  it("join de 2 jogadores deve iniciar startMatch", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()

    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    expect(lastMessageOfType(p1, "joined")).toBeTruthy()
    expect(lastMessageOfType(p2, "joined")).toBeTruthy()
    expect(engine.startMatch).toHaveBeenCalledTimes(1)
  })

  it("play deve delegar para engine.handlePlay", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "play", card: "X" }))
    expect(engine.handlePlay).toHaveBeenCalled()
  })

  it("next deve delegar para engine.startRound", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "next" }))
    expect(engine.startRound).toHaveBeenCalled()
  })

  it("rematch deve iniciar janela de aceitação e depois iniciar a nova partida no segundo voto", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "rematch" }))
    expect(lastMessageOfType(p1, "rematchPending")).toBeTruthy()
    expect(lastMessageOfType(p2, "waitingRematch")).toBeTruthy()
    expect(timers.setTimeout).toHaveBeenCalledTimes(1)
    expect(engine.startRound).not.toHaveBeenCalled()

    service.handleMessage(p2, JSON.stringify({ type: "rematch" }))
    expect(engine.startRound).toHaveBeenCalledTimes(1)
    expect(timers.clearTimeout).toHaveBeenCalled()
  })

  it("rematch repetido pelo mesmo jogador não deve aceitar automaticamente", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "rematch" }))
    service.handleMessage(p1, JSON.stringify({ type: "rematch" }))

    expect(engine.startRound).not.toHaveBeenCalled()
  })

  it("declineRematch deve devolver ambos ao lobby", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "declineRematch" }))

    expect(lastMessageOfType(p1, "lobbyReturned")).toMatchObject({ reason: "rematchDeclined" })
    expect(lastMessageOfType(p2, "lobbyReturned")).toMatchObject({ reason: "rematchDeclined" })
    expect(p1.roomId).toBeNull()
    expect(p2.roomId).toBeNull()
  })

  it("timeout da revanche deve devolver ambos ao lobby", () => {
    const timeoutCallbacks = []
    service = createGameService({
      roomStore,
      engine,
      rematchDecisionTimeoutMs: 15_000,
      timers: {
        setTimeout: vi.fn((cb) => {
          timeoutCallbacks.push(cb)
          return cb
        }),
        clearTimeout: vi.fn(),
      },
    })

    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "rematch" }))
    timeoutCallbacks[0]()

    expect(lastMessageOfType(p1, "lobbyReturned")).toMatchObject({ reason: "rematchTimeout" })
    expect(lastMessageOfType(p2, "lobbyReturned")).toMatchObject({ reason: "rematchTimeout" })
    expect(roomStore.get("1")).toBeUndefined()
  })

  it("handleClose deve notificar oponente e limpar sala", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    const roomId = p1.roomId
    service.handleClose(p1)

    expect(lastMessageOfType(p2, "playerDisconnected")).toBeTruthy()

    service.handleClose(p2)
    expect(roomStore.get(roomId)).toBeUndefined()
  })
})
