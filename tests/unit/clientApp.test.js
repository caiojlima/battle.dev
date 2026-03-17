import { beforeEach, describe, expect, it, vi } from "vitest"

import { initApp } from "../../client/app.js"
import { createMockElement, createCardsContainer, installMockDocument } from "../helpers/dom.mock.js"

function createDomFixture() {
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

  // Evita efeitos colaterais
  globalThis.alert = vi.fn()
  globalThis.document.querySelectorAll = () => []

  return { playerNameInput, startGameBtn, status, cards, pickTimerBanner, score, question }
}

describe("client/app", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("deve enviar join ao iniciar jogo", () => {
    const { playerNameInput, startGameBtn } = createDomFixture()
    const socket = { send: vi.fn() }

    initApp({ socket })

    playerNameInput.value = "Alice"
    startGameBtn.dispatchEvent("click")

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "join", name: "Alice" }))
  })

  it("startGame deve alertar quando nome estiver vazio", () => {
    const { startGameBtn } = createDomFixture()
    const socket = { send: vi.fn() }

    initApp({ socket })
    startGameBtn.dispatchEvent("click")

    expect(globalThis.alert).toHaveBeenCalled()
    expect(socket.send).not.toHaveBeenCalled()
  })

  it("deve iniciar countdown quando receber pickTimer", () => {
    const { pickTimerBanner } = createDomFixture()
    const socket = { send: vi.fn() }
    initApp({ socket })

    // Mock de elementos internos do banner para cobrir o caminho onde já existe `.timer-ring`
    const ring = { style: { setProperty: vi.fn() } }
    const seconds = { textContent: "" }
    const text = { textContent: "" }
    pickTimerBanner.querySelector = (sel) => {
      if (sel === ".timer-ring") return ring
      if (sel === ".timer-seconds") return seconds
      if (sel === ".timer-text") return text
      return null
    }

    const endsAt = Date.now() + 10_000
    socket.onmessage({
      data: JSON.stringify({ type: "pickTimer", waitingFor: 1, seconds: 10, endsAt }),
    })

    expect(pickTimerBanner.style.display).toBe("flex")
    expect(ring.style.setProperty).toHaveBeenCalled()

    vi.advanceTimersByTime(10_000)
    socket.onmessage({ data: JSON.stringify({ type: "pickTimerStop" }) })
    expect(pickTimerBanner.style.display).toBe("none")
  })

  it("deve renderizar cartas no newCards e permitir seleção", () => {
    const { cards } = createDomFixture()
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

    expect(cards.querySelectorAll(".card")).toHaveLength(2)
    cards.querySelectorAll(".card")[0].dispatchEvent("click")
  })

  it("handleQuestion deve resetar seleção e esconder botões", () => {
    const { question } = createDomFixture()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({
      data: JSON.stringify({
        type: "question",
        question: "Q?",
        score: { 1: 0, 2: 0 },
        playerNames: { 1: "A", 2: "B" },
      }),
    })

    expect(question.innerText).toBe("Q?")
  })

  it("handleWaiting deve atualizar indicadores de placar", () => {
    const { score } = createDomFixture()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({
      data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }),
    })

    socket.onmessage({
      data: JSON.stringify({ type: "waiting", playedBy: [1], whoPlayed: 2 }),
    })

    expect(score.innerHTML).toContain("✓")
  })

  it("onopen/onclose/onerror devem atualizar status", () => {
    const { status } = createDomFixture()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onopen()
    socket.onclose()
    expect(status.innerText).toContain("Desconectado")

    socket.onerror(new Error("x"))
    expect(status.innerText).toContain("Erro")
  })

  it("handleResult e handleGameOver devem escrever resultado", () => {
    const { result, rematchBtn } = (() => {
      const fixture = createDomFixture()
      // adiciona result e rematchBtn no retorno
      return { ...fixture, result: globalThis.document.getElementById("result"), rematchBtn: globalThis.document.getElementById("rematchBtn") }
    })()

    const socket = { send: vi.fn() }
    initApp({ socket })

    // garante estado básico para calcular nome do adversário
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 1,
        winnerCard: "Python",
        score: { 1: 1, 2: 0 },
        playerNames: { 1: "A", 2: "B" },
      }),
    })
    vi.advanceTimersByTime(2000)
    expect(result.style.display).toBe("block")

    socket.onmessage({
      data: JSON.stringify({
        type: "gameover",
        winner: 1,
        score: { 1: 2, 2: 0 },
        playerNames: { 1: "A", 2: "B" },
      }),
    })
    vi.advanceTimersByTime(2000)
    expect(rematchBtn.style.display).toBe("inline-block")
  })

  it("playerCount deve atualizar texto para 1 e N jogadores", () => {
    const { playerCount } = (() => {
      createDomFixture()
      return { playerCount: globalThis.document.getElementById("playerCount") }
    })()

    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "playerCount", count: 1 }) })
    expect(playerCount.innerText).toContain("1 jogador")

    socket.onmessage({ data: JSON.stringify({ type: "playerCount", count: 3 }) })
    expect(playerCount.innerText).toContain("3 jogadores")
  })

  it("waitingRematch deve mostrar botão com texto de aceitar", () => {
    const { rematchBtn, status } = (() => {
      createDomFixture()
      return {
        rematchBtn: globalThis.document.getElementById("rematchBtn"),
        status: globalThis.document.getElementById("status"),
      }
    })()

    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "waitingRematch" }) })

    expect(status.innerText).toContain("quer jogar novamente")
    expect(rematchBtn.innerText).toContain("Aceitar")
    expect(rematchBtn.style.display).toBe("inline-block")
  })

  it("rematch action deve enviar rematch e mostrar placeholder", () => {
    const { cards, rematchBtn } = (() => {
      createDomFixture()
      return {
        cards: globalThis.document.getElementById("cards"),
        rematchBtn: globalThis.document.getElementById("rematchBtn"),
      }
    })()

    const socket = { send: vi.fn() }
    initApp({ socket })

    // forçar visibilidade e clicar
    rematchBtn.style.display = "inline-block"
    rematchBtn.dispatchEvent("click")

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "rematch" }))
    expect(rematchBtn.style.display).toBe("none")
    expect(cards.innerHTML).toContain("Aguardando o adversário aceitar a revanche")
  })

  it("playerDisconnected deve resetar e tentar reentrar com o mesmo nome", () => {
    const { playerNameInput, startGameBtn, waitingScreen } = (() => {
      const fixture = createDomFixture()
      return {
        playerNameInput: fixture.playerNameInput,
        startGameBtn: fixture.startGameBtn,
        waitingScreen: globalThis.document.getElementById("waitingScreen"),
      }
    })()

    const socket = { send: vi.fn() }
    initApp({ socket })

    playerNameInput.value = "Alice"
    startGameBtn.dispatchEvent("click")

    socket.onmessage({ data: JSON.stringify({ type: "playerDisconnected" }) })
    expect(waitingScreen.style.display).toBe("flex")
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "join", name: "Alice" }))
  })

  it("pickTimer inválido não deve abrir banner", () => {
    const { pickTimerBanner } = createDomFixture()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "pickTimer", waitingFor: 1 }) })
    expect(pickTimerBanner.style.display).toBe("none")
  })
})
