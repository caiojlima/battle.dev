import { describe, expect, it, vi } from "vitest"

import { RoomStore, broadcastRoom, resetMatchData } from "../../server/room-store.js"
import { createMockSocket, getSentMessages } from "../mocks/socket.mock.js"

describe("server/room-store", () => {
  it("RoomStore deve criar e reusar sala aberta", () => {
    const store = new RoomStore()
    const r1 = store.getOrCreateRoomForJoin()
    expect(r1).toBeTruthy()

    // ainda está aberta (0 jogadores)
    const r2 = store.getOrCreateRoomForJoin()
    expect(r2.roomId).toBe(r1.roomId)

    // ocupa 2 slots, deve criar outra
    r1.players[1] = {}
    r1.players[2] = {}
    const r3 = store.getOrCreateRoomForJoin()
    expect(r3.roomId).not.toBe(r1.roomId)
  })

  it("deleteIfEmpty deve remover sala vazia", () => {
    const store = new RoomStore()
    const room = store.getOrCreateRoomForJoin()
    expect(store.get(room.roomId)).toBe(room)

    store.deleteIfEmpty(room)
    expect(store.get(room.roomId)).toBeUndefined()
  })

  it("broadcastRoom deve enviar para todos jogadores connected", () => {
    const p1 = createMockSocket()
    const p2 = createMockSocket()
    const room = { players: { 1: p1, 2: p2 } }

    broadcastRoom(room, { type: "x", a: 1 })
    expect(getSentMessages(p1).at(-1)).toEqual({ type: "x", a: 1 })
    expect(getSentMessages(p2).at(-1)).toEqual({ type: "x", a: 1 })
  })

  it("resetMatchData deve limpar timeout e resetar estado", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")
    const fakeId = setTimeout(() => {}, 10_000)
    const rematchId = setTimeout(() => {}, 10_000)

    const room = {
      rematchDecisionTimeout: rematchId,
      opponentPickTimeout: fakeId,
      hands: { 1: [1], 2: [2] },
      plays: { 1: "A" },
      score: { 1: 9, 2: 9 },
      rematchVotes: 2,
      rematchRequestedBy: 1,
      rematchRequestEndsAt: Date.now() + 15_000,
      currentQuestion: "Q",
      usedQuestions: new Set(["Q"]),
      roundResolutionStarted: true,
    }

    resetMatchData(room)
    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(room.rematchDecisionTimeout).toBeNull()
    expect(room.opponentPickTimeout).toBeNull()
    expect(room.hands[1]).toEqual([])
    expect(room.plays).toEqual({})
    expect(room.score).toEqual({ 1: 0, 2: 0 })
    expect(room.rematchVotes).toBe(0)
    expect(room.rematchRequestedBy).toBeNull()
    expect(room.rematchRequestEndsAt).toBeNull()
    expect(room.currentQuestion).toBeNull()
    expect(room.usedQuestions instanceof Set).toBe(true)
    expect(room.roundResolutionStarted).toBe(false)
  })
})
