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

function installDom({
  includeCards = true,
  includePickTimerBanner = true,
  includePlayerCount = true,
  includeRematchBtn = true,
} = {}) {
  const loginScreen = createMockElement({ id: "loginScreen" })
  const waitingScreen = createMockElement({ id: "waitingScreen" })
  const waitingPlayerName = createMockElement({ id: "waitingPlayerName" })
  const playerNameInput = createMockElement({ id: "playerNameInput", tagName: "INPUT" })
  const startGameBtn = createMockElement({ id: "startGameBtn", tagName: "BUTTON" })

  const question = createMockElement({ id: "question" })
  const status = createMockElement({ id: "status" })
  const score = createMockElement({ id: "score" })
  const result = createMockElement({ id: "result" })

  const confirmBtn = createMockElement({ id: "confirmBtn", tagName: "BUTTON" })
  const nextBtn = createMockElement({ id: "nextBtn", tagName: "BUTTON" })

  const elements = {
    loginScreen,
    waitingScreen,
    waitingPlayerName,
    playerNameInput,
    startGameBtn,
    question,
    status,
    score,
    result,
    confirmBtn,
    nextBtn,
  }

  if (includeCards) elements.cards = createCardsContainer()
  if (includePlayerCount) elements.playerCount = createMockElement({ id: "playerCount" })
  if (includeRematchBtn) elements.rematchBtn = createMockElement({ id: "rematchBtn", tagName: "BUTTON" })
  if (includePickTimerBanner) {
    const pickTimerBanner = createMockElement({ id: "pickTimerBanner" })
    pickTimerBanner.style.display = "none"
    elements.pickTimerBanner = pickTimerBanner
  }

  installMockDocument(elements)
  globalThis.document.querySelectorAll = () => []

  return elements
}

function createSocket() {
  return { send: vi.fn() }
}

describe("client/app (branches)", () => {
  beforeEach(() => {
    resetClientState()
    vi.useFakeTimers()
    globalThis.alert = vi.fn()
  })

  it("waitingRematch deve usar fallback de nome do oponente quando ausente", () => {
    const { status } = installDom()
    const socket = createSocket()
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 2 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 2: "B" } }) })
    socket.onmessage({ data: JSON.stringify({ type: "waitingRematch" }) })

    expect(status.innerText).toContain("Jogador 1")
  })

  it("stopPickCountdown deve ser no-op quando banner nÃ£o existe", () => {
    installDom({ includePickTimerBanner: false })
    const socket = createSocket()
    initApp({ socket })

    expect(() => socket.onmessage({ data: JSON.stringify({ type: "draw" }) })).not.toThrow()
  })

  it("pickTimer deve usar default de 10s quando seconds nÃ£o Ã© finito", () => {
    const { pickTimerBanner } = installDom()
    const socket = createSocket()
    initApp({ socket })

    const ring = { style: { setProperty: vi.fn() } }
    pickTimerBanner.querySelector = (sel) => {
      if (sel === ".timer-ring") return ring
      if (sel === ".timer-seconds") return { textContent: "" }
      if (sel === ".timer-text") return { textContent: "" }
      return null
    }

    socket.onmessage({
      data: JSON.stringify({ type: "pickTimer", waitingFor: 2, endsAt: Date.now() + 9999 }),
    })

    expect(pickTimerBanner.style.display).toBe("flex")
  })

  it("pickTimer deve ser robusto quando banner nÃ£o existe (branch !banner no update)", () => {
    installDom({ includePickTimerBanner: false })
    const socket = createSocket()
    initApp({ socket })

    expect(() =>
      socket.onmessage({
        data: JSON.stringify({ type: "pickTimer", waitingFor: 1, seconds: 10, endsAt: Date.now() + 10_000 }),
      })
    ).not.toThrow()
  })

  it("pickTimer deve usar getOpponentName quando waitingFor nÃ£o Ã© 1/2", () => {
    const { pickTimerBanner } = installDom()
    const socket = createSocket()
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 2: "Bob" } }) })

    const ring = { style: { setProperty: vi.fn() } }
    const text = { textContent: "" }
    pickTimerBanner.querySelector = (sel) => {
      if (sel === ".timer-ring") return ring
      if (sel === ".timer-seconds") return { textContent: "" }
      if (sel === ".timer-text") return text
      return null
    }

    socket.onmessage({
      data: JSON.stringify({ type: "pickTimer", waitingFor: 99, seconds: 10, endsAt: Date.now() + 10_000 }),
    })

    expect(text.textContent).toContain("Bob")
  })

  it("pickTimer deve usar fallback 'Jogador 2' quando waitingFor=2 nÃ£o tem nome", () => {
    const { pickTimerBanner } = installDom()
    const socket = createSocket()
    initApp({ socket })

    const ring = { style: { setProperty: vi.fn() } }
    const text = { textContent: "" }
    pickTimerBanner.querySelector = (sel) => {
      if (sel === ".timer-ring") return ring
      if (sel === ".timer-seconds") return { textContent: "" }
      if (sel === ".timer-text") return text
      return null
    }

    socket.onmessage({
      data: JSON.stringify({ type: "pickTimer", waitingFor: 2, seconds: 10, endsAt: Date.now() + 10_000 }),
    })

    expect(text.textContent).toContain("Jogador 2")
  })

  it("pickTimer deve marcar urgÃªncia quando Ã© sua vez e vocÃª ainda nÃ£o confirmou", () => {
    const { pickTimerBanner } = installDom()
    const socket = createSocket()
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })

    const ring = { style: { setProperty: vi.fn() } }
    pickTimerBanner.querySelector = (sel) => {
      if (sel === ".timer-ring") return ring
      if (sel === ".timer-seconds") return { textContent: "" }
      if (sel === ".timer-text") return { textContent: "" }
      return null
    }

    socket.onmessage({
      data: JSON.stringify({ type: "pickTimer", waitingFor: 1, seconds: 10, endsAt: Date.now() + 10_000 }),
    })

    expect(pickTimerBanner.classList.contains("is-urgent")).toBe(true)
  })

  it("pickTimer nÃ£o deve marcar urgÃªncia quando jÃ¡ confirmou (waitingFor = vocÃª)", () => {
    const { pickTimerBanner } = installDom()
    const socket = createSocket()
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    state.confirmed = true

    const ring = { style: { setProperty: vi.fn() } }
    pickTimerBanner.querySelector = (sel) => {
      if (sel === ".timer-ring") return ring
      if (sel === ".timer-seconds") return { textContent: "" }
      if (sel === ".timer-text") return { textContent: "" }
      return null
    }

    socket.onmessage({
      data: JSON.stringify({ type: "pickTimer", waitingFor: 1, seconds: 10, endsAt: Date.now() + 10_000 }),
    })

    expect(pickTimerBanner.classList.contains("is-urgent")).toBe(false)
  })

  it("pickTimer deve ser robusto quando .timer-text nÃ£o existe (branch if(textEl))", () => {
    const { pickTimerBanner } = installDom()
    const socket = createSocket()
    initApp({ socket })

    const ring = { style: { setProperty: vi.fn() } }
    pickTimerBanner.querySelector = (sel) => {
      if (sel === ".timer-ring") return ring
      if (sel === ".timer-seconds") return { textContent: "" }
      if (sel === ".timer-text") return null
      return null
    }

    expect(() =>
      socket.onmessage({
        data: JSON.stringify({ type: "pickTimer", waitingFor: 1, seconds: 10, endsAt: Date.now() + 10_000 }),
      })
    ).not.toThrow()
  })

  it("playerDisconnected deve resetar mesmo sem #cards", () => {
    installDom({ includeCards: false })
    const socket = createSocket()
    initApp({ socket })

    expect(() => socket.onmessage({ data: JSON.stringify({ type: "playerDisconnected" }) })).not.toThrow()
  })

  it("confirmCard deve funcionar mesmo sem #cards", () => {
    const { confirmBtn } = installDom({ includeCards: false })
    const socket = createSocket()
    initApp({ socket })

    state.selectedCard = "A"
    state.currentHand = [{ name: "A", personality: "", stats: { performance: 1 } }]

    confirmBtn.dispatchEvent("click")
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "play", card: "A" }))
  })

  it("rematch deve funcionar mesmo sem #cards", () => {
    const { rematchBtn } = installDom({ includeCards: false })
    const socket = createSocket()
    initApp({ socket })

    rematchBtn.dispatchEvent("click")
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "rematch" }))
  })

  it("newCards deve limpar state.currentHand quando languages nÃ£o for array", () => {
    installDom()
    const socket = createSocket()
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "newCards", languages: null }) })
    expect(state.currentHand).toEqual([])
  })

  it("playerDisconnected nÃ£o deve tentar rejoin quando playerName estÃ¡ vazio", () => {
    installDom()
    const socket = createSocket()
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "playerDisconnected" }) })
    expect(socket.send).not.toHaveBeenCalledWith(JSON.stringify({ type: "join", name: expect.any(String) }))
  })

  it("handleResult deve usar nome do oponente quando winner != playerId", () => {
    const { result } = installDom()
    const socket = createSocket()
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "Alice", 2: "Bob" } }) })
    state.playerName = "Alice"

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 2,
        winnerCard: "Python",
        score: { 1: 0, 2: 1 },
      }),
    })

    expect(result.textContent).toContain("Bob")
  })

  it("handleResult nÃ£o deve escrever mensagem de rodada quando winner Ã© falsy", () => {
    const { result } = installDom()
    const socket = createSocket()
    initApp({ socket })

    result.innerHTML = "pre"
    socket.onmessage({ data: JSON.stringify({ type: "result", winner: 0, score: { 1: 0, 2: 0 } }) })

    expect(result.innerHTML).toBe("pre")
  })

  it("handleGameOver deve suportar derrota (branch cond-expr)", () => {
    const { result } = installDom()
    const socket = createSocket()
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 2: "Bob" } }) })

    socket.onmessage({ data: JSON.stringify({ type: "gameover", winner: 2, score: { 1: 0, 2: 5 } }) })
    expect(result.textContent).toContain("venceu")
  })

  it("waitingRematch deve ser no-op quando rematchBtn nÃ£o existe (branch if(btn))", () => {
    installDom({ includeRematchBtn: false })
    const socket = createSocket()
    initApp({ socket })

    expect(() => socket.onmessage({ data: JSON.stringify({ type: "waitingRematch" }) })).not.toThrow()
  })

  it("keypress diferente de Enter nÃ£o deve iniciar o jogo", () => {
    const { playerNameInput } = installDom()
    const socket = createSocket()
    initApp({ socket })

    playerNameInput.value = "Alice"
    playerNameInput.dispatchEvent("keypress", { key: "a" })

    expect(socket.send).not.toHaveBeenCalled()
  })
})
