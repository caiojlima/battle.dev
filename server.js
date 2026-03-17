import http from "http"
import fs from "fs"
import path from "path"
import { WebSocketServer } from "ws"

import {
  WIN_SCORE,
  CARDS_PER_PLAYER,
  LANGUAGES,
  QUESTIONS,
  OPPONENT_PICK_TIMEOUT_MS,
} from "./game/constants.js"

import { getWeightedScore, pickRoundQuestion } from "./game/scoring.js"
import { RoomStore, broadcastRoom, resetMatchData } from "./server/room-store.js"

// =============================================================================
// HTTP (static)
// =============================================================================

function readStaticFile(filename) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filename), "utf-8")
  } catch (err) {
    console.error(`Erro ao ler ${filename}:`, err.message)
    process.exit(1)
  }
}

const htmlContent = readStaticFile("index.html")
const clientContent = readStaticFile("client.js")

const ROOT_DIR = process.cwd()

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".js") return "application/javascript; charset=utf-8"
  if (ext === ".html") return "text/html; charset=utf-8"
  if (ext === ".css") return "text/css; charset=utf-8"
  if (ext === ".json") return "application/json; charset=utf-8"
  return "application/octet-stream"
}

function resolveStaticPath(urlPath) {
  const rel = urlPath.replace(/^\/+/, "")
  const fullPath = path.resolve(ROOT_DIR, rel)
  const rootPrefix = ROOT_DIR.endsWith(path.sep) ? ROOT_DIR : ROOT_DIR + path.sep
  if (process.platform === "win32") {
    if (!fullPath.toLowerCase().startsWith(rootPrefix.toLowerCase())) return null
  } else {
    if (!fullPath.startsWith(rootPrefix)) return null
  }
  return fullPath
}

function serveFile(res, filePath) {
  try {
    const content = fs.readFileSync(filePath)
    res.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Cache-Control": "no-store",
    })
    res.end(content)
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Not found")
  }
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(String(req.url || "/").split("?")[0])

  if (urlPath === "/client.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" })
    res.end(clientContent)
    return
  }

  if (urlPath.startsWith("/client/")) {
    const filePath = resolveStaticPath(urlPath)
    if (!filePath) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
      res.end("Bad request")
      return
    }
    serveFile(res, filePath)
    return
  }

  if (urlPath === "/" || urlPath === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(htmlContent)
    return
  }

  // Para requests de arquivo desconhecido (ex.: ".js"), retorne 404 para evitar HTML em imports.
  if (path.extname(urlPath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Not found")
    return
  }

  // Fallback: serve a home.
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
  res.end(htmlContent)
})

// =============================================================================
// Rooms (state)
// =============================================================================

let connectedPlayers = 0
const clients = new Set()

const roomStore = new RoomStore()

function sendPlayerCount() {
  const data = JSON.stringify({
    type: "playerCount",
    count: connectedPlayers,
  })

  for (const ws of clients) {
    if (ws?.readyState === 1) ws.send(data)
  }
}

// =============================================================================
// Game helpers
// =============================================================================

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5)
}

// =============================================================================
// Game flow (per room)
// =============================================================================

function clearOpponentPickTimeout(room) {
  if (room.opponentPickTimeout) {
    clearTimeout(room.opponentPickTimeout)
    room.opponentPickTimeout = null
  }
}

function scheduleReveal(room) {
  if (room.roundResolutionStarted) return
  room.roundResolutionStarted = true
  clearOpponentPickTimeout(room)
  broadcastRoom(room, { type: "pickTimerStop" })
  setTimeout(() => revealCards(room), 500)
}

function scheduleOpponentAutoPick(room, waitingPlayerId) {
  clearOpponentPickTimeout(room)

  const endsAt = Date.now() + OPPONENT_PICK_TIMEOUT_MS
  broadcastRoom(room, {
    type: "pickTimer",
    seconds: Math.round(OPPONENT_PICK_TIMEOUT_MS / 1000),
    waitingFor: waitingPlayerId,
    endsAt,
  })

  room.opponentPickTimeout = setTimeout(() => {
    room.opponentPickTimeout = null

    if (!room.players[1] || !room.players[2]) return
    if (room.plays[waitingPlayerId]) return

    const hand = room.hands?.[waitingPlayerId] || []
    if (!Array.isArray(hand) || hand.length === 0) return

    const randomCard = hand[Math.floor(Math.random() * hand.length)]
    if (!randomCard?.name) return

    room.plays[waitingPlayerId] = randomCard.name
    console.log(
      `Sala ${room.roomId}: auto-pick para jogador ${waitingPlayerId}: ${randomCard.name}`
    )

    broadcastRoom(room, {
      type: "waiting",
      playedBy: Object.keys(room.plays).map(Number),
      whoPlayed: waitingPlayerId,
      autoPlayed: true,
    })

    if (room.plays[1] && room.plays[2]) {
      scheduleReveal(room)
    }
  }, OPPONENT_PICK_TIMEOUT_MS)
}

function dealCards(room) {
  const shuffled = shuffle(LANGUAGES)

  const hand1 = shuffled.slice(0, CARDS_PER_PLAYER)
  const hand2 = shuffled.slice(CARDS_PER_PLAYER, CARDS_PER_PLAYER * 2)

  room.hands = { 1: hand1, 2: hand2 }

  room.players[1]?.send(JSON.stringify({ type: "newCards", languages: hand1 }))
  room.players[2]?.send(JSON.stringify({ type: "newCards", languages: hand2 }))
}

function startRound(room) {
  if (!room.players[1] || !room.players[2]) return

  clearOpponentPickTimeout(room)
  room.roundResolutionStarted = false
  room.plays = {}
  dealCards(room)

  const question = pickRoundQuestion(QUESTIONS, room.usedQuestions)
  room.currentQuestion = question

  broadcastRoom(room, {
    type: "question",
    question,
    score: room.score,
    playerNames: room.playerNames,
  })
}

function startMatch(room) {
  // Notify clients of their slot inside this room.
  room.players[1]?.send(JSON.stringify({ type: "init", playerId: 1 }))
  room.players[2]?.send(JSON.stringify({ type: "init", playerId: 2 }))

  console.log(`Partida iniciada. Sala ${room.roomId}`)
  startRound(room)
}

function revealCards(room) {
  const played1 = room.plays[1]
  const played2 = room.plays[2]

  const card1 =
    room.hands?.[1]?.find((c) => c.name === played1) ||
    LANGUAGES.find((c) => c.name === played1)

  const card2 =
    room.hands?.[2]?.find((c) => c.name === played2) ||
    LANGUAGES.find((c) => c.name === played2)

  broadcastRoom(room, {
    type: "reveal",
    player1Card: card1 || null,
    player2Card: card2 || null,
    question: room.currentQuestion,
  })

  setTimeout(() => resolveRound(room), 900)
}

function resolveRound(room) {
  const played1 = room.plays[1]
  const played2 = room.plays[2]
  if (!played1 || !played2) return

  const question = room.currentQuestion

  const card1 =
    room.hands?.[1]?.find((c) => c.name === played1) ||
    LANGUAGES.find((c) => c.name === played1)

  const card2 =
    room.hands?.[2]?.find((c) => c.name === played2) ||
    LANGUAGES.find((c) => c.name === played2)

  if (!card1 || !card2) {
    console.warn("Não foi possível resolver a rodada (carta inválida):", { played1, played2 })
    broadcastRoom(room, { type: "draw", score: room.score, playerNames: room.playerNames })
    return
  }

  const score1 = getWeightedScore(card1, question)
  const score2 = getWeightedScore(card2, question)

  const EPS = 1e-9
  if (Math.abs(score1 - score2) < EPS) {
    broadcastRoom(room, {
      type: "draw",
      score: room.score,
      playerNames: room.playerNames,
      scores: { 1: score1, 2: score2 },
    })
    return
  }

  const winner = score1 > score2 ? 1 : 2
  room.score[winner]++

  if (room.score[winner] >= WIN_SCORE) {
    broadcastRoom(room, {
      type: "gameover",
      winner,
      playerNames: room.playerNames,
      score: room.score,
    })
    return
  }

  broadcastRoom(room, {
    type: "result",
    winner,
    winnerCard: winner === 1 ? card1.name : card2.name,
    score: room.score,
    playerNames: room.playerNames,
    scores: { 1: score1, 2: score2 },
  })
}

// =============================================================================
// WebSocket
// =============================================================================

const wss = new WebSocketServer({ server })

wss.on("connection", (ws) => {
  connectedPlayers++
  clients.add(ws)
  sendPlayerCount()

  ws.roomId = null
  ws.playerId = null

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg)

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
          if (!data.card || room.plays[playerId]) {
            console.warn(`Jogada inválida do jogador ${playerId}`)
            return
          }

          const inHand = room.hands?.[playerId]?.some((c) => c.name === data.card)
          if (!inHand) {
            console.warn(`Jogador ${playerId} tentou jogar uma carta que não está na mão:`, data.card)
            return
          }

          room.plays[playerId] = data.card
          console.log(`Sala ${room.roomId}: jogador ${playerId} jogou: ${data.card}`)

          broadcastRoom(room, {
            type: "waiting",
            playedBy: Object.keys(room.plays).map(Number),
            whoPlayed: playerId,
          })

          if (room.plays[1] && room.plays[2]) {
            scheduleReveal(room)
            break
          }

          const opponentId = playerId === 1 ? 2 : 1
          scheduleOpponentAutoPick(room, opponentId)
          break
        }

        case "next":
          startRound(room)
          break

        case "rematch": {
          room.rematchVotes++
          console.log(`Sala ${room.roomId}: voto de revanche ${room.rematchVotes}/2`)

          const opponentId = playerId === 1 ? 2 : 1

          if (room.rematchVotes < 2) {
            room.players[opponentId]?.send(
              JSON.stringify({ type: "waitingRematch", from: playerId })
            )
            break
          }

          console.log(`Sala ${room.roomId}: revanche aprovada. Reiniciando partida...`)
          resetMatchData(room)
          startRound(room)
          break
        }

        default:
          console.warn(`Mensagem desconhecida: "${data.type}"`)
      }
    } catch (err) {
      console.error("Erro ao processar mensagem:", err.message)
    }
  })

  ws.on("close", () => {
    connectedPlayers--
    clients.delete(ws)
    sendPlayerCount()

    if (!ws.roomId || !ws.playerId) return
    const room = roomStore.get(ws.roomId)
    if (!room) return

    const playerId = ws.playerId
    console.log(`Sala ${room.roomId}: jogador ${playerId} desconectou`)

    const opponentId = playerId === 1 ? 2 : 1
    room.players[opponentId]?.send(JSON.stringify({ type: "playerDisconnected" }))

    delete room.players[playerId]
    delete room.playerNames[playerId]
    resetMatchData(room)

    roomStore.deleteIfEmpty(room)
  })

  ws.on("error", (err) => {
    console.error("Erro WebSocket:", err.message)
  })
})

function handleJoin(ws, name) {
  if (!name || !name.trim()) {
    console.warn("Join recusado: nome inválido")
    return
  }

  const trimmed = name.trim()
  const room = ws.roomId ? roomStore.get(ws.roomId) : roomStore.getOrCreateRoomForJoin()
  if (!room) return

  if (!ws.roomId || !ws.playerId) {
    const playerId = room.players[1] ? 2 : 1
    if (room.players[playerId]) {
      console.warn(`Sala ${room.roomId} está cheia`)
      return
    }
    room.players[playerId] = ws
    ws.roomId = room.roomId
    ws.playerId = playerId
  }

  room.playerNames[ws.playerId] = trimmed
  console.log(`Sala ${room.roomId}: jogador ${ws.playerId} entrou como: ${trimmed}`)

  ws.send(JSON.stringify({ type: "joined", playerNames: room.playerNames }))

  const bothPlayersNamed = Boolean(room.playerNames[1] && room.playerNames[2])
  if (bothPlayersNamed) {
    broadcastRoom(room, { type: "joined", playerNames: room.playerNames })
    startMatch(room)
  }
}

// =============================================================================
// Boot
// =============================================================================

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Servidor HTTP  -> http://localhost:${PORT}`)
  console.log(`Servidor WS    -> ws://localhost:${PORT}`)
})
