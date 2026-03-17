import { describe, expect, it, vi } from "vitest"

import {
  cancelAutoNextRoundTimer,
  showResultAfterCalc,
  startAutoNextRoundTimer,
  startResultCalcAnimation,
  stopResultCalcAnimation,
} from "../../client/round-ui.js"
import { createMockElement, installMockDocument } from "../helpers/dom.mock.js"

describe("client/round-ui", () => {
  it("startAutoNextRoundTimer deve retornar quando nextBtn nÃ£o existe", () => {
    installMockDocument({})
    const state = { autoNextRoundTimer: null }
    expect(() => startAutoNextRoundTimer(state, { onNextRound: vi.fn() })).not.toThrow()
    expect(state.autoNextRoundTimer).toBeNull()
  })

  it("startAutoNextRoundTimer deve chamar onNextRound ao zerar", () => {
    vi.useFakeTimers()

    const nextBtn = createMockElement({ id: "nextBtn", tagName: "BUTTON" })
    installMockDocument({ nextBtn })

    const state = { autoNextRoundTimer: null }
    const onNextRound = vi.fn()

    startAutoNextRoundTimer(state, { onNextRound })
    vi.advanceTimersByTime(15_000)

    expect(onNextRound).toHaveBeenCalledTimes(1)
    cancelAutoNextRoundTimer(state)
  })

  it("startAutoNextRoundTimer nÃ£o deve quebrar se onNextRound for undefined", () => {
    vi.useFakeTimers()

    const nextBtn = createMockElement({ id: "nextBtn", tagName: "BUTTON" })
    installMockDocument({ nextBtn })

    const state = { autoNextRoundTimer: null }
    startAutoNextRoundTimer(state, { onNextRound: undefined })
    expect(() => vi.advanceTimersByTime(15_000)).not.toThrow()
    cancelAutoNextRoundTimer(state)
  })

  it("startResultCalcAnimation deve retornar quando #cards nÃ£o existe", () => {
    const status = createMockElement({ id: "status" })
    installMockDocument({ status })

    const state = { resultCalcStartedAt: null, pendingResultTimeout: null }
    expect(() => startResultCalcAnimation(state, { playerNames: { 1: "A", 2: "B" } })).not.toThrow()
    expect(state.resultCalcStartedAt).toBeNull()
  })

  it("startResultCalcAnimation deve montar UI e setar status", () => {
    const cards = createMockElement({ id: "cards" })
    const status = createMockElement({ id: "status" })
    installMockDocument({ cards, status })

    const state = { resultCalcStartedAt: null, pendingResultTimeout: null }
    startResultCalcAnimation(state, {
      playerNames: { 1: "A", 2: "B" },
      p1Card: { name: "X" },
      p2Card: { name: "Y" },
    })
    expect(cards.innerHTML).toContain("Calculando resultado")
    expect(status.innerText).toContain("Aguarde")
  })

  it("stopResultCalcAnimation deve retornar quando #cards nÃ£o existe", () => {
    installMockDocument({})
    const state = { resultCalcStartedAt: Date.now(), pendingResultTimeout: null }
    expect(() => stopResultCalcAnimation(state)).not.toThrow()
  })

  it("stopResultCalcAnimation deve limpar loading e chosenCards quando solicitado", () => {
    const cards = createMockElement({ id: "cards" })
    const chosenCards = createMockElement({ id: "chosenCards" })
    const result = createMockElement({ id: "result" })
    installMockDocument({ cards, chosenCards, result })

    // Simula que hÃ¡ UI de cÃ¡lculo
    cards.querySelector = () => ({})
    globalThis.document.querySelector = () => ({ remove: vi.fn() })

    const state = {
      resultCalcStartedAt: Date.now(),
      pendingResultTimeout: setTimeout(() => {}, 10),
    }
    stopResultCalcAnimation(state, { clearArea: true, clearText: true })
    expect(cards.innerHTML).toBe("")
    expect(result.style.display).toBe("none")

    // Sem clearArea/clearText, deve tentar remover loading/chosenCards
    stopResultCalcAnimation(state, { keepChosenCards: false })
    expect(chosenCards.__removed).toBe(true)
  })

  it("stopResultCalcAnimation(clearArea) nÃ£o deve limpar se nÃ£o tiver UI de cÃ¡lculo", () => {
    const cards = createMockElement({ id: "cards" })
    cards.innerHTML = "<div>opÃ§Ãµes</div>"
    cards.querySelector = () => null
    installMockDocument({ cards })

    const state = { resultCalcStartedAt: Date.now(), pendingResultTimeout: null }
    stopResultCalcAnimation(state, { clearArea: true })
    expect(cards.innerHTML).toContain("opÃ§Ãµes")
  })

  it("showResultAfterCalc deve executar imediatamente quando restante for 0", () => {
    vi.useFakeTimers()
    const cards = createMockElement({ id: "cards" })
    installMockDocument({ cards })

    const fn = vi.fn()
    const state = { resultCalcStartedAt: Date.now() - 999999, pendingResultTimeout: null }
    showResultAfterCalc(state, fn)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("showResultAfterCalc deve executar imediatamente quando resultCalcStartedAt for null", () => {
    vi.useFakeTimers()
    const cards = createMockElement({ id: "cards" })
    installMockDocument({ cards })

    const fn = vi.fn()
    const state = { resultCalcStartedAt: null, pendingResultTimeout: null }
    showResultAfterCalc(state, fn)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("showResultAfterCalc deve atrasar atÃ© completar RESULT_CALC_MIN_MS", () => {
    vi.useFakeTimers()
    const cards = createMockElement({ id: "cards" })
    installMockDocument({ cards })

    const fn = vi.fn()
    const now = Date.now()
    const state = { resultCalcStartedAt: now, pendingResultTimeout: null }
    showResultAfterCalc(state, fn)

    expect(fn).toHaveBeenCalledTimes(0)
    vi.advanceTimersByTime(2000)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
