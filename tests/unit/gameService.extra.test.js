import { describe, expect, it, vi } from "vitest"

import { RoomStore } from "../../server/room-store.js"
import { createGameService } from "../../server/game-service.js"
import { createMockSocket } from "../mocks/socket.mock.js"

function createEngineMock({ playOk = true } = {}) {
  return {
    startMatch: vi.fn(),
    startRound: vi.fn(),
    handlePlay: vi.fn(() => (playOk ? { ok: true } : { ok: false, reason: "invalid_play" })),
  }
}

describe("server/game-service (extra coverage)", () => {
  it("createGameService deve validar dependÃªncias obrigatÃ³rias", () => {
    expect(() => createGameService({ roomStore: null, engine: createEngineMock() })).toThrow()
    expect(() => createGameService({ roomStore: new RoomStore(), engine: null })).toThrow()
  })

  it("handleMessage deve logar erro quando JSON for invÃ¡lido", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock()
    const log = { warn: vi.fn(), error: vi.fn() }
    const service = createGameService({ roomStore, engine, log })

    service.handleMessage(createMockSocket(), "{not json")
    expect(log.error).toHaveBeenCalled()
  })

  it("handleJoin deve avisar quando ws aponta para sala cheia", () => {
    const roomStore = new RoomStore()
    const room = roomStore.createRoom()
    room.players[1] = {}
    room.players[2] = {}

    const engine = createEngineMock()
    const log = { warn: vi.fn(), error: vi.fn() }
    const service = createGameService({ roomStore, engine, log })

    const ws = createMockSocket()
    ws.roomId = room.roomId
    // sem playerId: tenta atribuir e encontra sala cheia

    service.handleJoin(ws, "Alice")
    expect(log.warn).toHaveBeenCalled()
  })

  it("handleMessage deve ignorar mensagens sem roomId/playerId", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock()
    const log = { warn: vi.fn(), error: vi.fn() }
    const service = createGameService({ roomStore, engine, log })

    const ws = createMockSocket()
    service.handleMessage(ws, JSON.stringify({ type: "play", card: "A" }))
    expect(engine.handlePlay).not.toHaveBeenCalled()
  })

  it("handleMessage deve ignorar quando room nÃ£o existe", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock()
    const log = { warn: vi.fn(), error: vi.fn() }
    const service = createGameService({ roomStore, engine, log })

    const ws = createMockSocket()
    ws.roomId = "999"
    ws.playerId = 1

    service.handleMessage(ws, JSON.stringify({ type: "next" }))
    expect(engine.startRound).not.toHaveBeenCalled()
  })

  it("play invÃ¡lido deve logar warn (result.ok=false)", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock({ playOk: false })
    const log = { warn: vi.fn(), error: vi.fn() }
    const service = createGameService({ roomStore, engine, log })

    const p1 = createMockSocket()
    const p2 = createMockSocket()

    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "play", card: "X" }))
    expect(log.warn).toHaveBeenCalled()
  })

  it("tipo desconhecido deve logar warn", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock()
    const log = { warn: vi.fn(), error: vi.fn() }
    const service = createGameService({ roomStore, engine, log })

    const p1 = createMockSocket()
    const p2 = createMockSocket()
    service.handleMessage(p1, JSON.stringify({ type: "join", name: "A" }))
    service.handleMessage(p2, JSON.stringify({ type: "join", name: "B" }))

    service.handleMessage(p1, JSON.stringify({ type: "wat" }))
    expect(log.warn).toHaveBeenCalled()
  })
})

