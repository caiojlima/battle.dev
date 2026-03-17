export class RoomStore {
  #rooms = new Map()
  #nextRoomId = 1

  createEmptyRoomState(roomId) {
    return {
      roomId,
      createdAt: Date.now(),
      players: {}, // { 1: ws, 2: ws }
      playerNames: {}, // { 1: "nome", 2: "nome" }
      hands: { 1: [], 2: [] },
      plays: {}, // { 1: "Lang", 2: "Lang" }
      score: { 1: 0, 2: 0 },
      rematchVotes: 0,
      rematchRequestedBy: null,
      rematchRequestEndsAt: null,
      rematchDecisionTimeout: null,
      currentQuestion: null,
      usedQuestions: new Set(),
      opponentPickTimeout: null,
      roundResolutionStarted: false,
    }
  }

  createRoom() {
    const roomId = String(this.#nextRoomId++)
    const room = this.createEmptyRoomState(roomId)
    this.#rooms.set(roomId, room)
    return room
  }

  get(roomId) {
    return this.#rooms.get(roomId)
  }

  getOrCreateRoomForJoin() {
    const openRoom = [...this.#rooms.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .find((r) => Object.keys(r.players).length < 2)

    return openRoom || this.createRoom()
  }

  deleteIfEmpty(room) {
    if (!room) return
    if (Object.keys(room.players).length === 0) {
      this.#rooms.delete(room.roomId)
    }
  }
}

export function resetMatchData(room) {
  if (room.rematchDecisionTimeout) {
    clearTimeout(room.rematchDecisionTimeout)
    room.rematchDecisionTimeout = null
  }

  if (room.opponentPickTimeout) {
    clearTimeout(room.opponentPickTimeout)
    room.opponentPickTimeout = null
  }

  room.hands = { 1: [], 2: [] }
  room.plays = {}
  room.score = { 1: 0, 2: 0 }
  room.rematchVotes = 0
  room.rematchRequestedBy = null
  room.rematchRequestEndsAt = null
  room.currentQuestion = null
  room.usedQuestions = new Set()
  room.roundResolutionStarted = false
}

export function broadcastRoom(room, payload) {
  const data = JSON.stringify(payload)
  for (const ws of Object.values(room.players)) {
    if (ws?.readyState === 1) ws.send(data)
  }
}
