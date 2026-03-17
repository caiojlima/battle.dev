import { describe, expect, it, vi } from "vitest"

import { RoomStore } from "../../server/room-store.js"
import { createGameService } from "../../server/game-service.js"
import { createMockSocket, lastMessageOfType } from "../mocks/socket.mock.js"

function createEngineMock() {
  return {
    startMatch: vi.fn(),
    startRound: vi.fn(),
    handlePlay: vi.fn(() => ({ ok: true })),
  }
}

describe("server/game-service (branches 100%)", () => {
  it("handleJoin deve pular atribuiÃ§Ã£o quando ws jÃ¡ tem roomId/playerId (line 23 false branch)", () => {
    const roomStore = new RoomStore()
    const room = roomStore.createRoom()

    const engine = createEngineMock()
    const service = createGameService({ roomStore, engine })

    const ws = createMockSocket()
    ws.roomId = room.roomId
    ws.playerId = 1
    room.players[1] = ws

    service.handleJoin(ws, "Alice")
    expect(room.playerNames[1]).toBe("Alice")
    expect(lastMessageOfType(ws, "joined")).toBeTruthy()
  })

  it("handleMessage deve usar fallback `err` quando err.message Ã© ausente (line 50 right side)", () => {
    const roomStore = new RoomStore()
    const engine = createEngineMock()
    const log = { warn: vi.fn(), error: vi.fn() }
    const service = createGameService({ roomStore, engine, log })

    const errObj = {}
    vi.spyOn(JSON, "parse").mockImplementationOnce(() => {
      throw errObj
    })

    service.handleMessage(createMockSocket(), "qualquer")
    expect(log.error).toHaveBeenCalledWith("Erro ao processar mensagem:", errObj)
  })
})

