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
}

function installBaseDom({ includePlayerCount = true, includePickTimerBanner = true } = {}) {
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
  const rematchBtn = createMockElement({ id: "rematchBtn", tagName: "BUTTON" })

  const cards = createCardsContainer()

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
    rematchBtn,
    cards,
  }

  if (includePlayerCount) elements.playerCount = createMockElement({ id: "playerCount" })
  if (includePickTimerBanner) {
    const pickTimerBanner = createMockElement({ id: "pickTimerBanner" })
    pickTimerBanner.style.display = "none"
    elements.pickTimerBanner = pickTimerBanner
  }

  const doc = installMockDocument(elements)
  return { ...elements, document: doc }
}

describe("client/app (extra coverage)", () => {
  beforeEach(() => {
    resetClientState()
    vi.useFakeTimers()
    globalThis.alert = vi.fn()
  })

  it("keypress Enter no input deve disparar startGame", () => {
    const { playerNameInput } = installBaseDom()
    const socket = { send: vi.fn() }

    initApp({ socket })

    playerNameInput.value = "Alice"
    playerNameInput.dispatchEvent("keypress", { key: "Enter" })

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "join", name: "Alice" }))
  })

  it("pickTimer deve montar template quando .timer-ring nÃ£o existe", () => {
    const { pickTimerBanner } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    const ring = { style: { setProperty: vi.fn() } }
    const seconds = { textContent: "" }
    const text = { textContent: "" }
    let ringCalls = 0

    pickTimerBanner.querySelector = (sel) => {
      if (sel === ".timer-ring") {
        ringCalls++
        return ringCalls === 1 ? null : ring
      }
      if (sel === ".timer-seconds") return seconds
      if (sel === ".timer-text") return text
      return null
    }

    socket.onmessage({
      data: JSON.stringify({
        type: "pickTimer",
        waitingFor: 1,
        seconds: 10,
        endsAt: Date.now() + 10_000,
      }),
    })

    expect(pickTimerBanner.innerHTML).toContain("timer-ring")
    expect(pickTimerBanner.style.display).toBe("flex")
    expect(ring.style.setProperty).toHaveBeenCalled()
  })

  it("pickTimer deve ignorar waitingFor invÃ¡lido", () => {
    const { pickTimerBanner } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({
      data: JSON.stringify({ type: "pickTimer", waitingFor: "1", seconds: 10, endsAt: Date.now() + 1000 }),
    })

    expect(pickTimerBanner.style.display).toBe("none")
  })

  it("playerCount deve ser no-op quando elemento nÃ£o existe", () => {
    installBaseDom({ includePlayerCount: false })
    const socket = { send: vi.fn() }
    initApp({ socket })

    expect(() => socket.onmessage({ data: JSON.stringify({ type: "playerCount", count: 2 }) })).not.toThrow()
  })

  it("newCards deve permitir selecionar e alternar card selecionado", () => {
    const { cards, confirmBtn } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({
      data: JSON.stringify({
        type: "newCards",
        languages: [
          { name: "A", personality: "x", stats: { performance: 1 } },
          { name: "B", personality: "y", stats: { performance: 2 } },
        ],
      }),
    })

    const all = cards.querySelectorAll(".card")
    globalThis.document.querySelectorAll = (sel) => (sel === ".card" ? all : [])

    all[0].dispatchEvent("click")
    expect(state.selectedCard).toBe("A")
    expect(all[0].classList.contains("selected")).toBe(true)
    expect(confirmBtn.style.display).toBe("inline-block")

    all[1].dispatchEvent("click")
    expect(state.selectedCard).toBe("B")
    expect(all[0].classList.contains("selected")).toBe(false)
    expect(all[1].classList.contains("selected")).toBe(true)
  })

  it("selecionar card deve ser no-op quando state.confirmed = true", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({
      data: JSON.stringify({
        type: "newCards",
        languages: [{ name: "A", personality: "x", stats: { performance: 1 } }],
      }),
    })

    const [first] = cards.querySelectorAll(".card")
    globalThis.document.querySelectorAll = (sel) => (sel === ".card" ? [first] : [])

    state.confirmed = true
    first.dispatchEvent("click")
    expect(state.selectedCard).toBeNull()
  })

  it("confirmar carta deve enviar play e renderizar preview", () => {
    const { cards, confirmBtn, status } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({
      data: JSON.stringify({
        type: "newCards",
        languages: [{ name: "A", personality: "x", stats: { performance: 1 } }],
      }),
    })

    const [first] = cards.querySelectorAll(".card")
    globalThis.document.querySelectorAll = (sel) => (sel === ".card" ? [first] : [])
    first.dispatchEvent("click")

    confirmBtn.dispatchEvent("click")

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "play", card: "A" }))
    expect(cards.innerHTML).toContain("sent-preview")
    expect(confirmBtn.style.display).toBe("none")
    expect(status.innerText).toBe("")
  })

  it("confirmar carta deve renderizar round-stage mesmo sem encontrar carta escolhida", () => {
    const { cards, confirmBtn } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    state.selectedCard = "INEXISTENTE"
    state.currentHand = [{ name: "A", personality: "x", stats: { performance: 1 } }]

    confirmBtn.dispatchEvent("click")
    expect(cards.innerHTML).toContain("round-stage")
    expect(cards.innerHTML).not.toContain("sent-preview")
  })

  it("nextRound deve enviar next e atualizar texto do botÃ£o", () => {
    const { nextBtn } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    nextBtn.dispatchEvent("click")

    expect(nextBtn.innerText).toContain("Próxima")
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "next" }))
  })

  it("waiting deve limpar status apenas quando quem jogou Ã© o prÃ³prio jogador", () => {
    const { status } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    // define playerId
    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })

    status.innerText = "aguardando"
    socket.onmessage({ data: JSON.stringify({ type: "waiting", whoPlayed: 2, playedBy: [] }) })
    expect(status.innerText).toBe("aguardando")

    socket.onmessage({ data: JSON.stringify({ type: "waiting", whoPlayed: 1, playedBy: [] }) })
    expect(status.innerText).toBe("")
  })

  it("reveal deve iniciar animaÃ§Ã£o de cÃ¡lculo (UI no #cards)", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })

    socket.onmessage({
      data: JSON.stringify({
        type: "reveal",
        player1Card: { name: "Python", personality: "", stats: { performance: 10 } },
        player2Card: { name: "Go", personality: "", stats: { performance: 20 } },
      }),
    })

    expect(cards.innerHTML).toContain("Calculando resultado")
    expect(cards.innerHTML).toContain("VS")
  })

  it("draw deve escrever resultado e mostrar nextBtn", () => {
    const { result, nextBtn } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "draw" }) })

    expect(result.textContent).toContain("empatada")
    expect(nextBtn.style.display).toBe("inline-block")
  })

  it("result sem winnerCard deve usar texto simples de vitÃ³ria", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    // garante estado para calcular nomes
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    state.playerName = "A"

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 1,
        score: { 1: 1, 2: 0 },
        playerNames: { 1: "A", 2: "B" },
      }),
    })

    expect(result.textContent).toContain("venceu")
  })

  it("tipo de mensagem desconhecido deve logar warn", () => {
    installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    socket.onmessage({ data: JSON.stringify({ type: "naoExiste" }) })
    expect(warn).toHaveBeenCalled()
  })
})
