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

  beforeEach(() => {
    roomStore = new RoomStore()
    engine = createEngineMock()
    service = createGameService({ roomStore, engine })
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

  it("rematch deve enviar waitingRematch até ter 2 votos", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "rematch" }))
    expect(lastMessageOfType(p2, "waitingRematch")).toBeTruthy()
    expect(engine.startRound).not.toHaveBeenCalled()

    service.handleMessage(p2, JSON.stringify({ type: "rematch" }))
    expect(engine.startRound).toHaveBeenCalledTimes(1)
  })

  it("handleClose deve notificar oponente e limpar sala", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    const roomId = p1.roomId
    service.handleClose(p1)

    expect(lastMessageOfType(p2, "playerDisconnected")).toBeTruthy()

    // sala deve ser removida quando vazia
    service.handleClose(p2)
    expect(roomStore.get(roomId)).toBeUndefined()
  })
})

