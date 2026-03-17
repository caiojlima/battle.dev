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
  state.rematchCountdownTimer = null
  state.lastReveal = null
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
  const declineRematchBtn = createMockElement({ id: "declineRematchBtn", tagName: "BUTTON" })

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
    declineRematchBtn,
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
    expect(cards.innerHTML).toContain("calc-duel-side--self")
    expect(cards.innerHTML).not.toContain("Jogador:")
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

  it("result deve mostrar explicaÃ§Ã£o quando weightBreakdown existir", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "Alice", 2: "Bob" } }) })
    state.playerName = "Alice"

    socket.onmessage({
      data: JSON.stringify({
        type: "reveal",
        player1Card: { name: "Go", personality: "", stats: { performance: 88 } },
        player2Card: { name: "Python", personality: "", stats: { performance: 65 } },
        question: "Qual linguagem Ã© melhor para alta performance?",
      }),
    })

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 1,
        winnerCard: "Go",
        loserCard: "Python",
        score: { 1: 1, 2: 0 },
        scores: { 1: 88, 2: 65 },
        weightBreakdown: {
          keyStat: { stat: "performance", weight: 1, winnerValue: 88, loserValue: 65, better: "higher" },
        },
      }),
    })

    vi.advanceTimersByTime(2000)

    expect(result.textContent).toContain("Motivo:")
    expect(result.textContent).toContain("Pontua")
    expect(result.textContent).toContain("88")
    expect(result.textContent).toContain("65")
  })

  it("reveal deve salvar lastReveal mesmo com cards nulos", () => {
    installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({
      data: JSON.stringify({ type: "reveal", player1Card: null, player2Card: null, question: null }),
    })

    expect(state.lastReveal).toEqual({ player1Card: null, player2Card: null, question: null })
  })

  it("result nÃ£o deve adicionar explicaÃ§Ã£o quando winner nÃ£o for 1/2", () => {
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
        winner: 3,
        winnerCard: "Go",
        score: { 1: 1, 2: 0 },
        weightBreakdown: { keyStat: { stat: "performance", winnerValue: 10, loserValue: 0 } },
      }),
    })

    expect(result.textContent).toContain("venceu")
    expect(result.textContent).not.toContain("Motivo:")
  })

  it("result deve usar loserCard do reveal quando loserCard nÃ£o vier no payload", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    state.playerName = "A"

    socket.onmessage({
      data: JSON.stringify({
        type: "reveal",
        player1Card: { name: "Go", personality: "", stats: { performance: 88 } },
        player2Card: { name: "Python", personality: "", stats: { performance: 65 } },
        question: "Q",
      }),
    })

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 1,
        winnerCard: "Go",
        // sem loserCard aqui
        score: { 1: 1, 2: 0 },
        scores: { 1: 88, 2: 65 },
        weightBreakdown: { keyStat: { stat: "performance", winnerValue: 88, loserValue: 65, better: "higher" } },
      }),
    })

    vi.advanceTimersByTime(2000)
    expect(result.textContent).toContain("Python")
  })

  it("result deve mostrar pontuação total mesmo quando winner for 2", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 2 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    state.playerName = "B"

    socket.onmessage({
      data: JSON.stringify({
        type: "reveal",
        player1Card: { name: "C++", personality: "", stats: { complexidade: 90 } },
        player2Card: { name: "Go", personality: "", stats: { complexidade: 10 } },
        question: "Q",
      }),
    })

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 2,
        winnerCard: "Go",
        // sem loserCard aqui para usar fallback
        score: { 1: 0, 2: 1 },
        scores: { 1: 10, 2: 20 },
        weightBreakdown: { keyStat: { stat: "complexidade", winnerValue: 10, loserValue: 90, better: "lower" } },
      }),
    })

    vi.advanceTimersByTime(2000)
    expect(result.textContent).toContain("Motivo:")
    expect(result.textContent).toContain("Pontua")
  })

  it("result nÃ£o deve adicionar explicaÃ§Ã£o quando winnerCard estiver ausente", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    state.playerName = "A"

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 1,
        // winnerCard ausente
        score: { 1: 1, 2: 0 },
        weightBreakdown: { keyStat: { stat: "performance", winnerValue: 10, loserValue: 0 } },
      }),
    })

    expect(result.textContent).toContain("venceu")
    expect(result.textContent).not.toContain("Motivo:")
  })

  it("result nÃ£o deve explicar quando loserCard nÃ£o puder ser inferido", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    // garante estado para calcular nomes
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    state.playerName = "A"

    // sem reveal e sem loserCard -> buildWinnerExplanationHtml deve retornar ""
    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 1,
        winnerCard: "Go",
        score: { 1: 1, 2: 0 },
        weightBreakdown: { keyStat: { stat: "performance", winnerValue: 10, loserValue: 0, better: "higher" } },
      }),
    })

    expect(result.textContent).toContain("venceu")
    expect(result.textContent).not.toContain("Motivo:")
  })

  it("result deve usar fallback do reveal quando winner for 2", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    state.playerName = "A"

    socket.onmessage({
      data: JSON.stringify({
        type: "reveal",
        player1Card: { name: "Go", personality: "", stats: { performance: 65 } },
        player2Card: { name: "Python", personality: "", stats: { performance: 88 } },
        question: "Q",
      }),
    })

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 2,
        winnerCard: "Python",
        score: { 1: 0, 2: 1 },
        scores: { 1: 65, 2: 88 },
        weightBreakdown: { keyStat: { stat: "performance", winnerValue: 88, loserValue: 65, better: "higher" } },
      }),
    })

    vi.advanceTimersByTime(2000)
    expect(result.textContent).toContain("Motivo:")
    expect(result.textContent).toContain("Go")
  })

  it("result deve conseguir explicar via contributions quando scores nÃ£o vier", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    state.playerName = "A"

    socket.onmessage({
      data: JSON.stringify({
        type: "reveal",
        player1Card: { name: "Go", personality: "", stats: {} },
        player2Card: { name: "Python", personality: "", stats: {} },
        question: "Q",
      }),
    })

    // sem `scores`: usa fallback por contributions
    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 1,
        winnerCard: "Go",
        score: { 1: 1, 2: 0 },
        weightBreakdown: {
          contributions: {
            1: { performance: 10, tooling: 0 },
            2: { performance: 5 },
          },
        },
      }),
    })

    vi.advanceTimersByTime(2000)
    expect(result.textContent).toContain("Motivo:")
    expect(result.textContent).toContain("10")
    expect(result.textContent).toContain("5")
  })

  it("result nÃ£o deve explicar quando nÃ£o houver scores nem contributions", () => {
    const { result } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "A", 2: "B" } }) })
    state.playerName = "A"

    socket.onmessage({
      data: JSON.stringify({
        type: "reveal",
        player1Card: { name: "Go", personality: "", stats: {} },
        player2Card: { name: "Python", personality: "", stats: {} },
        question: "Q",
      }),
    })

    socket.onmessage({
      data: JSON.stringify({
        type: "result",
        winner: 1,
        winnerCard: "Go",
        score: { 1: 1, 2: 0 },
      }),
    })

    vi.advanceTimersByTime(2000)
    expect(result.textContent).not.toContain("Motivo:")
  })

  it("gameover deve esconder cartas e renderizar painel final centralizado", () => {
    const { cards, score, question, rematchBtn, result, status } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "Alice", 2: "Bob" } }) })
    state.playerName = "Alice"

    cards.innerHTML = `<div id="chosenCards">cartas antigas</div>`
    result.innerHTML = "resultado antigo"
    status.innerText = "Fim de jogo"

    socket.onmessage({
      data: JSON.stringify({
        type: "gameover",
        winner: 1,
        score: { 1: 5, 2: 2 },
        winnerCard: "Go",
        loserCard: "Python",
        scores: { 1: 88, 2: 65 },
      }),
    })

    vi.advanceTimersByTime(2000)

    expect(cards.innerHTML).toContain("gameover-panel")
    expect(cards.innerHTML).not.toContain("chosenCards")
    expect(cards.innerHTML).toContain("Alice")
    expect(cards.innerHTML).toContain("Bob")
    expect(cards.innerHTML).toContain("Fim de jogo")
    expect(score.classList.contains("score-final")).toBe(true)
    expect(question.classList.contains("is-gameover-question")).toBe(true)
    expect(rematchBtn.style.display).toBe("inline-block")
    expect(result.innerHTML).toBe("")
    expect(status.innerText).toBe("")
  })

  it("gameover deve ser robusto quando #cards nao existir", () => {
    const { score, question, rematchBtn, result, status } = installBaseDom()
    delete globalThis.document.__elements
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "Alice", 2: "Bob" } }) })
    state.playerName = "Alice"
    globalThis.document.getElementById = (id) =>
      ({ score, question, rematchBtn, result, status }[id] || null)

    expect(() =>
      socket.onmessage({ data: JSON.stringify({ type: "gameover", winner: 1, score: { 1: 5, 2: 2 } }) })
    ).not.toThrow()
    expect(rematchBtn.style.display).toBe("inline-block")
  })

  it("gameover deve usar fallbacks de nome e pontuacao no painel final", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "Alice" } }) })
    state.playerName = "Alice"

    socket.onmessage({
      data: JSON.stringify({
        type: "gameover",
        winner: 1,
        score: { 1: 5 },
      }),
    })

    vi.advanceTimersByTime(2000)
    expect(cards.innerHTML).toContain("Jogador 2")
    expect(cards.innerHTML).toContain(">0<")
  })

  it("gameover deve usar zero quando a pontuacao do vencedor nao vier", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "Alice", 2: "Bob" } }) })
    state.playerName = "Alice"

    socket.onmessage({
      data: JSON.stringify({
        type: "gameover",
        winner: 2,
        score: { 1: 3 },
      }),
    })

    vi.advanceTimersByTime(2000)
    expect(cards.innerHTML).toContain("Bob")
    expect(cards.innerHTML).toContain(">0<")
  })

  it("waitingRematch deve atualizar estado de revanche ja renderizado no painel final", () => {
    const { cards, rematchBtn, declineRematchBtn } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "Alice", 2: "Bob" } }) })
    state.playerName = "Alice"

    cards.innerHTML = `<section class="gameover-panel"><div class="gameover-rematch-state"><span>antigo</span></div></section>`
    rematchBtn.style.display = "inline-block"

    socket.onmessage({
      data: JSON.stringify({ type: "waitingRematch", endsAt: Date.now() + 15_000, seconds: 15 }),
    })

    expect(cards.innerHTML).toContain("Bob quer jogar novamente")
    expect(cards.innerHTML).not.toContain("antigo")
    expect(cards.innerHTML).toContain("is-urgent")
    expect(rematchBtn.innerText).toContain("Aceitar")
    expect(declineRematchBtn.innerText).toContain("Recusar")
  })

  it("waitingRematch deve atualizar apenas o slot interno quando ele existir", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    const rematchSlot = { innerHTML: "" }
    cards.querySelector = (selector) => (selector === ".gameover-rematch-slot" ? rematchSlot : null)

    socket.onmessage({
      data: JSON.stringify({ type: "waitingRematch", endsAt: Date.now() + 15_000, seconds: 15 }),
    })

    expect(rematchSlot.innerHTML).toContain("gameover-rematch-state")
    expect(rematchSlot.innerHTML).toContain("quer jogar novamente")
  })

  it("waitingRematch deve atualizar refs existentes sem recriar o bloco", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    const stateEl = { classList: { toggle: vi.fn() } }
    const spinnerEl = { style: {} }
    const ringEl = { style: { display: "", setProperty: vi.fn() } }
    const secondsEl = { textContent: "" }
    const messageEl = { textContent: "" }
    const detailEl = { textContent: "" }

    const rematchSlot = {
      __rematchStateRefs: { stateEl, spinnerEl, ringEl, secondsEl, messageEl, detailEl },
    }

    cards.querySelector = (selector) => (selector === ".gameover-rematch-slot" ? rematchSlot : null)

    socket.onmessage({
      data: JSON.stringify({ type: "waitingRematch", endsAt: Date.now() + 15_000, seconds: 15 }),
    })

    expect(stateEl.classList.toggle).toHaveBeenCalledWith("is-urgent", true)
    expect(spinnerEl.style.display).toBe("none")
    expect(ringEl.style.display).toBe("inline-block")
    expect(ringEl.style.setProperty).toHaveBeenCalled()
    expect(secondsEl.textContent).not.toBe("")
    expect(messageEl.textContent).toContain("quer jogar novamente")
    expect(detailEl.textContent).toContain("Aceite em")
  })

  it("rematchPending deve atualizar refs existentes sem countdown", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    const stateEl = { classList: { toggle: vi.fn() } }
    const spinnerEl = { style: {} }
    const ringEl = { style: { display: "", setProperty: vi.fn() } }
    const secondsEl = { textContent: "10" }
    const messageEl = { textContent: "" }
    const detailEl = { textContent: "" }

    const rematchSlot = {
      __rematchStateRefs: { stateEl, spinnerEl, ringEl, secondsEl, messageEl, detailEl },
    }

    cards.querySelector = (selector) => (selector === ".gameover-rematch-slot" ? rematchSlot : null)

    socket.onmessage({
      data: JSON.stringify({ type: "rematchPending" }),
    })

    expect(stateEl.classList.toggle).toHaveBeenCalledWith("is-urgent", false)
    expect(spinnerEl.style.display).toBe("inline-block")
    expect(ringEl.style.display).toBe("none")
    expect(ringEl.style.setProperty).not.toHaveBeenCalled()
    expect(secondsEl.textContent).toBe("")
    expect(messageEl.textContent).toContain("Aguardando o adversário")
  })

  it("waitingRematch deve tolerar refs parciais no slot", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    const stateEl = { classList: { toggle: vi.fn() } }
    const rematchSlot = {
      __rematchStateRefs: { stateEl },
    }

    cards.querySelector = (selector) => (selector === ".gameover-rematch-slot" ? rematchSlot : null)

    expect(() =>
      socket.onmessage({
        data: JSON.stringify({ type: "waitingRematch", endsAt: Date.now() + 15_000, seconds: 15 }),
      })
    ).not.toThrow()

    expect(stateEl.classList.toggle).toHaveBeenCalledWith("is-urgent", true)
  })

  it("waitingRematch deve criar placeholder urgente quando painel final nao existir", () => {
    const { cards, rematchBtn, declineRematchBtn, status } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    socket.onmessage({ data: JSON.stringify({ type: "init", playerId: 1 }) })
    socket.onmessage({ data: JSON.stringify({ type: "joined", playerNames: { 1: "Alice", 2: "Bob" } }) })

    socket.onmessage({
      data: JSON.stringify({ type: "waitingRematch", endsAt: Date.now() + 15_000, seconds: 15 }),
    })

    expect(cards.innerHTML).toContain("round-placeholder")
    expect(cards.innerHTML).toContain("gameover-rematch-state is-urgent")
    expect(cards.innerHTML).toContain("Bob quer jogar novamente")
    expect(rematchBtn.innerText).toContain("Aceitar")
    expect(declineRematchBtn.innerText).toContain("Recusar")
    expect(status.innerText).toBe("")
  })

  it("rematch deve criar placeholder neutro quando painel final nao existir", () => {
    const { cards, rematchBtn, declineRematchBtn } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    rematchBtn.style.display = "inline-block"
    rematchBtn.dispatchEvent("click")

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "rematch" }))
    expect(cards.innerHTML).toContain("round-placeholder")
    expect(cards.innerHTML).toContain("gameover-rematch-state")
    expect(cards.innerHTML).not.toContain("is-urgent")
    expect(declineRematchBtn.style.display).toBe("inline-block")
  })

  it("rematchPending deve mostrar countdown de expiração no painel final", () => {
    const { cards, declineRematchBtn, rematchBtn } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    cards.innerHTML = `<section class="gameover-panel"><div>final</div></section>`
    socket.onmessage({
      data: JSON.stringify({ type: "rematchPending", endsAt: Date.now() + 15_000, seconds: 15 }),
    })

    expect(cards.innerHTML).toContain("Aguardando o adversário aceitar a revanche")
    expect(cards.innerHTML).toContain("expira em")
    expect(rematchBtn.style.display).toBe("none")
    expect(declineRematchBtn.style.display).toBe("inline-block")
  })

  it("lobbyReturned deve resetar interface e reabrir login", () => {
    const { cards, loginScreen, waitingScreen, status } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    state.playerName = "Alice"
    state.playerId = 1
    cards.innerHTML = `<section class="gameover-panel"><div>final</div></section>`

    socket.onmessage({
      data: JSON.stringify({ type: "lobbyReturned", reason: "rematchTimeout" }),
    })

    expect(cards.innerHTML).toBe("")
    expect(loginScreen.style.display).toBe("flex")
    expect(waitingScreen.style.display).toBe("none")
    expect(status.innerText).toContain("Tempo de resposta")
  })

  it("lobbyReturned deve diferenciar recusa própria", () => {
    const { status } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    state.playerName = "Alice"
    state.playerId = 2

    socket.onmessage({
      data: JSON.stringify({ type: "lobbyReturned", reason: "rematchDeclined", declinedBy: 2 }),
    })

    expect(status.innerText).toContain("Você recusou")
  })

  it("lobbyReturned deve diferenciar recusa do adversário", () => {
    const { status } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    state.playerName = "Alice"
    state.playerId = 1

    socket.onmessage({
      data: JSON.stringify({ type: "lobbyReturned", reason: "rematchDeclined", declinedBy: 2 }),
    })

    expect(status.innerText).toContain("foi recusada")
  })

  it("lobbyReturned deve usar mensagem padrão quando o motivo não vier", () => {
    const { status } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    state.playerName = "Alice"
    socket.onmessage({ data: JSON.stringify({ type: "lobbyReturned" }) })

    expect(status.innerText).toContain("voltou ao lobby")
  })

  it("waitingRematch deve encerrar countdown ao expirar", () => {
    const { cards } = installBaseDom()
    const socket = { send: vi.fn() }
    initApp({ socket })

    cards.innerHTML = `<section class="gameover-panel"><div>final</div></section>`
    socket.onmessage({
      data: JSON.stringify({ type: "waitingRematch", endsAt: Date.now() + 50, seconds: 1 }),
    })

    vi.advanceTimersByTime(100)
    expect(state.rematchCountdownTimer).toBeNull()
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
