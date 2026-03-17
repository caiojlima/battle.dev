import { describe, expect, it } from "vitest"

import { RoomStore, broadcastRoom } from "../../server/room-store.js"
import { createMockSocket, getSentMessages } from "../mocks/socket.mock.js"

describe("server/room-store (branches)", () => {
  it("deleteIfEmpty deve ser no-op quando room Ã© null", () => {
    const store = new RoomStore()
    expect(() => store.deleteIfEmpty(null)).not.toThrow()
  })

  it("broadcastRoom nÃ£o deve enviar para sockets nÃ£o-connected", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    p2.readyState = 0

    const room = { players: { 1: p1, 2: p2 } }
    broadcastRoom(room, { type: "x" })

    expect(getSentMessages(p1).at(-1)).toEqual({ type: "x" })
    expect(getSentMessages(p2).length).toBe(0)
  })
})

