import { beforeEach, describe, expect, it, vi } from "vitest"

import { initApp } from "../../client/app.js"
import { state } from "../../client/state.js"
import { createCardsContainer, createMockElement, installMockDocument } from "../helpers/dom.mock.js"

function resetClientState() {
  state.socket = null
  state.playerId = null
  state.playerName = null
  state.playerNames = {}
  state.selectedCard = null
  state.confirmed = false
  state.currentHand = []
  state.autoNextRoundTimer = null
  state.resultCalcStartedAt = null
  state.pendingResultTimeout = null
  state.pickCountdownTimer = null
  state.lastReveal = null
}

describe("client/app (line 253)", () => {
  beforeEach(() => {
    resetClientState()
    vi.useFakeTimers()
    globalThis.alert = vi.fn()

    const loginScreen = createMockElement({ id: "loginScreen" })
    const waitingScreen = createMockElement({ id: "waitingScreen" })
    const waitingPlayerName = createMockElement({ id: "waitingPlayerName" })
    const playerCount = createMockElement({ id: "playerCount" })
    const playerNameInput = createMockElement({ id: "playerNameInput", tagName: "INPUT" })
    const startGameBtn = createMockElement({ id: "startGameBtn", tagName: "BUTTON" })

    const question = createMockElement({ id: "question" })
    const status = createMockElement({ id: "status" })
    const score = createMockElement({ id: "score" })
    const result = createMockElement({ id: "result" })
    const pickTimerBanner = createMockElement({ id: "pickTimerBanner" })
    pickTimerBanner.style.display = "none"

    const confirmBtn = createMockElement({ id: "confirmBtn", tagName: "BUTTON" })
    const nextBtn = createMockElement({ id: "nextBtn", tagName: "BUTTON" })
    const rematchBtn = createMockElement({ id: "rematchBtn", tagName: "BUTTON" })

    const cards = createCardsContainer()

    installMockDocument({
      loginScreen,
      waitingScreen,
      waitingPlayerName,
      playerCount,
      playerNameInput,
      startGameBtn,
      question,
      status,
      score,
      result,
      pickTimerBanner,
      confirmBtn,
      nextBtn,
      rematchBtn,
      cards,
    })
  })

  it("handleQuestion deve remover 'selected' de todas as .card (callback do forEach)", () => {
    const socket = { send: vi.fn() }
    initApp({ socket })

    const card1 = createMockElement({ tagName: "DIV" })
    const card2 = createMockElement({ tagName: "DIV" })
    card1.classList.add("selected")
    card2.classList.add("selected")

    globalThis.document.querySelectorAll = (sel) => (sel === ".card" ? [card1, card2] : [])

    socket.onmessage({
      data: JSON.stringify({
        type: "question",
        question: "Q?",
        score: { 1: 0, 2: 0 },
        playerNames: { 1: "A", 2: "B" },
      }),
    })

    expect(card1.classList.contains("selected")).toBe(false)
    expect(card2.classList.contains("selected")).toBe(false)
  })
})
