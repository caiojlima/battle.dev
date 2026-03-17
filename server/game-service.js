import { resetMatchData as resetRoomMatchData, broadcastRoom as defaultBroadcastRoom } from "./room-store.js"

export function createGameService({
  roomStore,
  engine,
  resetMatchData = resetRoomMatchData,
  broadcastRoom = defaultBroadcastRoom,
  log = console,
  rematchDecisionTimeoutMs = 15_000,
  timers = { setTimeout, clearTimeout },
}) {
  if (!roomStore) throw new Error("roomStore é obrigatório")
  if (!engine) throw new Error("engine é obrigatório")

  function send(ws, payload) {
    ws?.send(JSON.stringify(payload))
  }

  function clearRematchRequest(room) {
    if (room.rematchDecisionTimeout) {
      timers.clearTimeout(room.rematchDecisionTimeout)
      room.rematchDecisionTimeout = null
    }

    room.rematchRequestEndsAt = null
    room.rematchRequestedBy = null
  }

  function movePlayersToLobby(room, payload) {
    const sockets = Object.values(room.players).filter(Boolean)

    clearRematchRequest(room)
    resetMatchData(room)

    for (const ws of sockets) {
      send(ws, payload)
      ws.roomId = null
      ws.playerId = null
    }

    room.players = {}
    room.playerNames = {}
    roomStore.deleteIfEmpty(room)
  }

  function handleJoin(ws, name) {
    if (!name || !String(name).trim()) {
      log.warn("Join recusado: nome inválido")
      return
    }

    const trimmed = String(name).trim()
    const room = ws.roomId ? roomStore.get(ws.roomId) : roomStore.getOrCreateRoomForJoin()
    if (!room) return

    if (!ws.roomId || !ws.playerId) {
      const playerId = room.players[1] ? 2 : 1
      if (room.players[playerId]) {
        log.warn(`Sala ${room.roomId} está cheia`)
        return
      }
      room.players[playerId] = ws
      ws.roomId = room.roomId
      ws.playerId = playerId
    }

    room.playerNames[ws.playerId] = trimmed

    ws.send(JSON.stringify({ type: "joined", playerNames: room.playerNames }))

    const bothPlayersNamed = Boolean(room.playerNames[1] && room.playerNames[2])
    if (bothPlayersNamed) {
      broadcastRoom(room, { type: "joined", playerNames: room.playerNames })
      engine.startMatch(room)
    }
  }

  function handleMessage(ws, rawMessage) {
    let data
    try {
      data = JSON.parse(rawMessage)
    } catch (err) {
      log.error("Erro ao processar mensagem:", err?.message || err)
      return
    }

    if (data.type === "join") {
      handleJoin(ws, data.name)
      return
    }

    if (!ws.roomId || !ws.playerId) return
    const room = roomStore.get(ws.roomId)
    if (!room) return
    const playerId = ws.playerId

    switch (data.type) {
      case "play": {
        const result = engine.handlePlay(room, playerId, data.card)
        if (!result.ok) {
          log.warn(`Jogada inválida do jogador ${playerId}: ${result.reason}`)
        }
        break
      }

      case "next":
        engine.startRound(room)
        break

      case "rematch": {
        const opponentId = playerId === 1 ? 2 : 1
        const endsAt = Date.now() + rematchDecisionTimeoutMs

        if (room.rematchRequestedBy === playerId) {
          break
        }

        if (room.rematchVotes === 0) {
          room.rematchVotes = 1
          room.rematchRequestedBy = playerId
          room.rematchRequestEndsAt = endsAt
          room.rematchDecisionTimeout = timers.setTimeout(() => {
            movePlayersToLobby(room, { type: "lobbyReturned", reason: "rematchTimeout" })
          }, rematchDecisionTimeoutMs)

          send(room.players[playerId], {
            type: "rematchPending",
            from: playerId,
            endsAt,
            seconds: rematchDecisionTimeoutMs / 1000,
          })
          send(room.players[opponentId], {
            type: "waitingRematch",
            from: playerId,
            endsAt,
            seconds: rematchDecisionTimeoutMs / 1000,
          })
          break
        }

        room.rematchVotes++
        clearRematchRequest(room)
        resetMatchData(room)
        engine.startRound(room)
        break
      }

      case "declineRematch":
        movePlayersToLobby(room, {
          type: "lobbyReturned",
          reason: "rematchDeclined",
          declinedBy: playerId,
        })
        break

      default:
        log.warn(`Mensagem desconhecida: "${data.type}"`)
    }
  }

  function handleClose(ws) {
    if (!ws.roomId || !ws.playerId) return
    const room = roomStore.get(ws.roomId)
    if (!room) return

    const playerId = ws.playerId
    const opponentId = playerId === 1 ? 2 : 1
    room.players[opponentId]?.send(JSON.stringify({ type: "playerDisconnected" }))

    delete room.players[playerId]
    delete room.playerNames[playerId]
    resetMatchData(room)
    roomStore.deleteIfEmpty(room)
  }

  return { handleJoin, handleMessage, handleClose }
}
