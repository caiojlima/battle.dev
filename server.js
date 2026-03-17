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
import { getQuestionWeights } from "./game/scoring.js"
import { RoomStore, broadcastRoom, resetMatchData } from "./server/room-store.js"
import { createGameEngine } from "./server/game-engine.js"
import { createGameService } from "./server/game-service.js"

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
const engine = createGameEngine({
  winScore: WIN_SCORE,
  cardsPerPlayer: CARDS_PER_PLAYER,
  languages: LANGUAGES,
  questions: QUESTIONS,
  opponentPickTimeoutMs: OPPONENT_PICK_TIMEOUT_MS,
  getWeightedScore,
  getQuestionWeights,
  pickRoundQuestion,
  broadcastRoom,
})

const gameService = createGameService({
  roomStore,
  engine,
  resetMatchData,
  broadcastRoom,
})

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
    gameService.handleMessage(ws, msg)
  })

  ws.on("close", () => {
    connectedPlayers--
    clients.delete(ws)
    sendPlayerCount()
    gameService.handleClose(ws)
  })

  ws.on("error", (err) => {
    console.error("Erro WebSocket:", err.message)
  })
})

// =============================================================================
// Boot
// =============================================================================

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Servidor HTTP  -> http://localhost:${PORT}`)
  console.log(`Servidor WS    -> ws://localhost:${PORT}`)
})
