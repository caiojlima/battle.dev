import { describe, expect, it, vi } from "vitest"

import { RoomStore } from "../../server/room-store.js"
import { createGameService } from "../../server/game-service.js"
import { createMockSocket } from "../mocks/socket.mock.js"

function createEngineMock() {
  return {
    startMatch: vi.fn(),
    startRound: vi.fn(),
    handlePlay: vi.fn(() => ({ ok: true })),
  }
}

describe("server/game-service (uncovered lines)", () => {
  it("handleJoin deve retornar cedo quando ws.roomId aponta para sala inexistente (if(!room))", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock()
    const service = createGameService({ roomStore, engine, log: { warn: vi.fn(), error: vi.fn() } })

    const ws = createMockSocket()
    ws.roomId = "999" // roomStore.get -> undefined

    service.handleJoin(ws, "Alice")
    expect(ws.sent.length).toBe(0)
  })

  it("handleClose deve retornar cedo quando ws nÃ£o tem roomId/playerId", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock()
    const service = createGameService({ roomStore, engine })

    const ws = createMockSocket()
    expect(() => service.handleClose(ws)).not.toThrow()
  })

  it("handleClose deve retornar cedo quando room nÃ£o existe (if(!room))", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock()
    const service = createGameService({ roomStore, engine })

    const ws = createMockSocket()
    ws.roomId = "999"
    ws.playerId = 1

    expect(() => service.handleClose(ws)).not.toThrow()
  })
})

