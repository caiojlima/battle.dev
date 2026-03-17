import { describe, expect, it } from "vitest"

import { RoomStore } from "../../server/room-store.js"

describe("server/room-store (extra coverage)", () => {
  it("getOrCreateRoomForJoin deve escolher a sala aberta mais antiga (sort por createdAt)", () => {
    const store = new RoomStore()

    const r1 = store.createRoom()
    const r2 = store.createRoom()

    // Inverte tempos para garantir que r2 seja a mais antiga
    r1.createdAt = 2000
    r2.createdAt = 1000

    const picked = store.getOrCreateRoomForJoin()
    expect(picked.roomId).toBe(r2.roomId)
  })
})

