import { AUTO_NEXT_ROUND_SECONDS, RESULT_CALC_MIN_MS } from "./constants.js"
import { el, setResultHtml, setRoundOutcomeHtml } from "./dom.js"
import { buildPreviewHandCardHtml } from "./ui/cards.js"

export function cancelAutoNextRoundTimer(state) {
  if (state.autoNextRoundTimer) {
    clearInterval(state.autoNextRoundTimer)
    state.autoNextRoundTimer = null
  }
}

export function startAutoNextRoundTimer(state, { onNextRound }) {
  const btn = el("nextBtn")
  if (!btn) return

  let countdown = AUTO_NEXT_ROUND_SECONDS
  btn.innerText = `Próxima rodada... ${countdown}s`

  state.autoNextRoundTimer = setInterval(() => {
    countdown--
    if (countdown <= 0) {
      cancelAutoNextRoundTimer(state)
      onNextRound?.()
      return
    }
    btn.innerText = `Próxima rodada... ${countdown}s`
  }, 1000)
}

export function stopResultCalcAnimation(
  state,
  { clearArea = false, clearText = false, keepChosenCards = true } = {}
) {
  if (state.pendingResultTimeout) {
    clearTimeout(state.pendingResultTimeout)
    state.pendingResultTimeout = null
  }
  state.resultCalcStartedAt = null

  const cardsDiv = el("cards")
  if (!cardsDiv) return

  if (clearArea) {
    const hasCalcUi = Boolean(
      cardsDiv.querySelector(
        "#chosenCards, #roundOutcome, .result-loading, .round-placeholder"
      )
    )
    if (hasCalcUi) cardsDiv.innerHTML = ""
  }

  if (clearText) {
    setResultHtml("")
  }

  if (clearArea || clearText) return

  const loading = document.querySelector("#cards .result-loading")
  if (loading) loading.remove()

  if (!keepChosenCards) {
    el("chosenCards")?.remove()
  }
}

export function startResultCalcAnimation(state, { playerNames, p1Card = null, p2Card = null } = {}) {
  stopResultCalcAnimation(state)

  const cardsDiv = el("cards")
  if (!cardsDiv) return

  const p1Name = playerNames?.[1] || "Jogador 1"
  const p2Name = playerNames?.[2] || "Jogador 2"

  const card1 = p1Card && typeof p1Card === "object" ? p1Card : null
  const card2 = p2Card && typeof p2Card === "object" ? p2Card : null

  state.resultCalcStartedAt = Date.now()
  cardsDiv.innerHTML = `
    <div class="round-stage">
      <div id="chosenCards" class="calc-duel">
        ${card1 ? buildPreviewHandCardHtml(card1, p1Name) : ""}
        <div class="calc-vs">VS</div>
        ${card2 ? buildPreviewHandCardHtml(card2, p2Name) : ""}
      </div>
      <div id="roundOutcome"></div>
      <div class="result-loading" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span>Calculando resultado...</span>
      </div>
    </div>
  `

  el("status").innerText = "Aguarde o resultado..."
}

export function showResultAfterCalc(state, fn) {
  const startedAt = state.resultCalcStartedAt
  const elapsed = startedAt ? Date.now() - startedAt : RESULT_CALC_MIN_MS
  const remaining = Math.max(0, RESULT_CALC_MIN_MS - elapsed)

  if (remaining === 0) {
    stopResultCalcAnimation(state, { keepChosenCards: true })
    fn?.()
    return
  }

  state.pendingResultTimeout = setTimeout(() => {
    state.pendingResultTimeout = null
    stopResultCalcAnimation(state, { keepChosenCards: true })
    fn?.()
  }, remaining)
}

export { setRoundOutcomeHtml }

