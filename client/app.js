import { el, hide, setResultHtml, show } from "./dom.js"
import { state } from "./state.js"
import { escapeHtml, getColor } from "./utils.js"
import { renderCards } from "./ui/hand.js"
import { renderScore, updateScoreIndicators } from "./ui/scoreboard.js"
import { buildPreviewHandCardHtml } from "./ui/cards.js"
import {
  cancelAutoNextRoundTimer,
  setRoundOutcomeHtml,
  showResultAfterCalc,
  startAutoNextRoundTimer,
  startResultCalcAnimation,
  stopResultCalcAnimation,
} from "./round-ui.js"
import { setLoginError, showLoginScreen, showWaitingScreen } from "./screens.js"
import { sendMessage } from "./ws.js"

function getOpponentName() {
  const opponentId = state.playerId === 1 ? 2 : 1
  return state.playerNames[opponentId] || `Jogador ${opponentId}`
}

function stopPickCountdown() {
  if (state.pickCountdownTimer) {
    clearInterval(state.pickCountdownTimer)
    state.pickCountdownTimer = null
  }

  const banner = el("pickTimerBanner")
  if (banner) {
    banner.innerHTML = ""
    banner.style.display = "none"
    banner.classList.remove("is-urgent")
  }
}

function stopRematchCountdown() {
  if (state.rematchCountdownTimer) {
    clearInterval(state.rematchCountdownTimer)
    state.rematchCountdownTimer = null
  }
}

function startPickCountdown({ endsAt, waitingFor, seconds }) {
  stopPickCountdown()

  const totalMs = Number.isFinite(seconds) ? Math.max(1, Number(seconds) * 1000) : 10_000
  const startAt = Number(endsAt) - totalMs

  const update = () => {
    const remainingMs = Number(endsAt) - Date.now()
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))

    if (remainingSec <= 0) {
      stopPickCountdown()
      return
    }

    const banner = el("pickTimerBanner")
    if (!banner) return

    const elapsedMs = Date.now() - startAt
    const progress = Math.max(0, Math.min(1, elapsedMs / totalMs))

    const waitingLabel =
      waitingFor === 1 || waitingFor === 2
        ? state.playerNames[waitingFor] || `Jogador ${waitingFor}`
        : getOpponentName()

    const isYouPicking = waitingFor === state.playerId && !state.confirmed
    banner.classList.toggle("is-urgent", isYouPicking)
    banner.style.display = "flex"

    if (!banner.querySelector(".timer-ring")) {
      banner.innerHTML = `
        <span class="timer-ring" style="--p:0">
          <span class="timer-seconds"></span>
        </span>
        <span class="timer-text"></span>
      `
    }

    banner.querySelector(".timer-ring")?.style.setProperty("--p", String(progress))
    const secondsEl = banner.querySelector(".timer-seconds")
    if (secondsEl) secondsEl.textContent = String(remainingSec)

    const textEl = banner.querySelector(".timer-text")
    if (textEl) {
      textEl.textContent = isYouPicking
        ? `Escolha uma carta em ${remainingSec}s`
        : `${waitingLabel} tem ${remainingSec}s para escolher...`
    }
  }

  update()
  state.pickCountdownTimer = setInterval(update, 80)
}

function setRematchButtons({
  acceptVisible = false,
  acceptText = "Jogar novamente",
  declineVisible = false,
  declineText = "Voltar ao lobby",
} = {}) {
  const rematchBtn = el("rematchBtn")
  if (rematchBtn) {
    rematchBtn.innerText = acceptText
    if (acceptVisible) show("rematchBtn")
    else hide("rematchBtn")
  }

  const declineBtn = el("declineRematchBtn")
  if (declineBtn) {
    declineBtn.innerText = declineText
    if (declineVisible) show("declineRematchBtn")
    else hide("declineRematchBtn")
  }
}

function updateWaitingCount(count) {
  const node = el("playerCount")
  if (!node) return

  node.innerText = count === 1 ? "1 jogador online 👤" : `${count} jogadores online 👥`
}

function exitGameOverLayout() {
  el("question")?.classList.remove("is-gameover-question")
  el("score")?.classList.remove("score-final")
}

function renderGameOverPanel(data) {
  const cardsDiv = el("cards")
  if (!cardsDiv) return

  const winnerId = data?.winner
  const loserId = winnerId === 1 ? 2 : 1
  const winnerName = winnerId === state.playerId ? state.playerName : getOpponentName()
  const loserName =
    loserId === state.playerId ? state.playerName : state.playerNames[loserId] || `Jogador ${loserId}`
  const winnerScore = data?.score?.[winnerId] ?? 0
  const loserScore = data?.score?.[loserId] ?? 0

  cardsDiv.innerHTML = `
    <section class="gameover-panel" aria-live="polite">
      <div class="gameover-eyebrow">Fim de jogo</div>
      <div class="gameover-trophy" aria-hidden="true">${winnerId === state.playerId ? "🏆" : "⚔️"}</div>
      <h3 class="gameover-title">${escapeHtml(winnerName)}</h3>
      <p class="gameover-subtitle">venceu a partida</p>
      <div class="gameover-scoreline">
        <div class="gameover-score is-winner">
          <span class="gameover-score-name">${escapeHtml(winnerName)}</span>
          <strong class="gameover-score-value">${escapeHtml(String(winnerScore))}</strong>
        </div>
        <span class="gameover-score-separator">VS</span>
        <div class="gameover-score">
          <span class="gameover-score-name">${escapeHtml(loserName)}</span>
          <strong class="gameover-score-value">${escapeHtml(String(loserScore))}</strong>
        </div>
      </div>
      ${buildWinnerExplanationHtml(data)}
      <div class="gameover-rematch-slot"></div>
    </section>
  `

  el("question")?.classList.add("is-gameover-question")
  el("score")?.classList.add("score-final")
}

function buildRematchIndicatorHtml(countdown) {
  const hasCountdown = countdown && Number.isFinite(countdown.secondsLeft)

  return `
    <span class="spinner rematch-spinner" aria-hidden="true" style="display:${hasCountdown ? "none" : "inline-block"}"></span>
    <span class="timer-ring rematch-timer-ring" style="--p:${escapeHtml(String(hasCountdown ? countdown.progress : 0))};display:${hasCountdown ? "inline-block" : "none"}">
      <span class="timer-seconds">${escapeHtml(String(hasCountdown ? countdown.secondsLeft : ""))}</span>
    </span>
  `
}

function updateExistingRematchState(refs, { urgent, countdown, message, detail }) {
  refs.stateEl?.classList.toggle("is-urgent", urgent)

  if (refs.spinnerEl) {
    refs.spinnerEl.style.display =
      countdown && Number.isFinite(countdown.secondsLeft) ? "none" : "inline-block"
  }

  if (refs.ringEl) {
    const showCountdown = countdown && Number.isFinite(countdown.secondsLeft)
    refs.ringEl.style.display = showCountdown ? "inline-block" : "none"
    if (showCountdown) {
      refs.ringEl.style.setProperty("--p", String(countdown.progress))
    }
  }

  if (refs.secondsEl) {
    refs.secondsEl.textContent =
      countdown && Number.isFinite(countdown.secondsLeft) ? String(countdown.secondsLeft) : ""
  }

  if (refs.messageEl) refs.messageEl.textContent = message
  if (refs.detailEl) refs.detailEl.textContent = detail
}

function renderGameOverRematchState(message, { urgent = false, countdown = null, detail = "" } = {}) {
  const cardsDiv = el("cards")
  if (!cardsDiv) return

  const waitingHtml = `
    <div class="gameover-rematch-state${urgent ? " is-urgent" : ""}">
      ${buildRematchIndicatorHtml(countdown)}
      <div class="gameover-rematch-copy">
        <strong>${escapeHtml(message)}</strong>
        <small>${escapeHtml(detail)}</small>
      </div>
    </div>
  `

  const rematchSlot = cardsDiv.querySelector?.(".gameover-rematch-slot")
  if (rematchSlot) {
    if (rematchSlot.__rematchStateRefs) {
      updateExistingRematchState(rematchSlot.__rematchStateRefs, { urgent, countdown, message, detail })
      return
    }

    rematchSlot.innerHTML = waitingHtml
    rematchSlot.__rematchStateRefs = {
      stateEl: rematchSlot.querySelector?.(".gameover-rematch-state"),
      spinnerEl: rematchSlot.querySelector?.(".rematch-spinner"),
      ringEl: rematchSlot.querySelector?.(".rematch-timer-ring"),
      secondsEl: rematchSlot.querySelector?.(".timer-seconds"),
      messageEl: rematchSlot.querySelector?.(".gameover-rematch-copy strong"),
      detailEl: rematchSlot.querySelector?.(".gameover-rematch-copy small"),
    }
    return
  }

  if (cardsDiv.innerHTML.includes('class="gameover-panel')) {
    if (cardsDiv.innerHTML.includes('class="gameover-rematch-state')) {
      cardsDiv.innerHTML = cardsDiv.innerHTML.replace(
        /<div class="gameover-rematch-state[\s\S]*?<\/div>/,
        waitingHtml
      )
      return
    }

    cardsDiv.innerHTML = cardsDiv.innerHTML.replace("</section>", `${waitingHtml}</section>`)
    return
  }

  cardsDiv.innerHTML = `
    <div class="round-stage">
      <div class="round-placeholder gameover-rematch-state${urgent ? " is-urgent" : ""}">
        <span class="spinner" aria-hidden="true"></span>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>
  `
}

function startRematchCountdown({ endsAt, message, urgent = false, detailBuilder }) {
  stopRematchCountdown()

  if (!Number.isFinite(Number(endsAt))) {
    renderGameOverRematchState(message, {
      urgent,
      detail: detailBuilder(15),
    })
    return
  }

  const totalMs = Math.max(1_000, Number(endsAt) - Date.now())

  const update = () => {
    const remainingMs = Number(endsAt) - Date.now()
    const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000))
    const progress = Math.max(0, Math.min(1, 1 - remainingMs / totalMs))

    renderGameOverRematchState(message, {
      urgent,
      countdown: { secondsLeft, progress },
      detail: detailBuilder(secondsLeft),
    })

    if (remainingMs <= 0) {
      stopRematchCountdown()
    }
  }

  update()
  state.rematchCountdownTimer = setInterval(update, 100)
}

function resetToInitial() {
  stopPickCountdown()
  stopRematchCountdown()
  cancelAutoNextRoundTimer(state)
  stopResultCalcAnimation(state, { clearArea: true, clearText: true })
  exitGameOverLayout()

  state.selectedCard = null
  state.confirmed = false
  state.playerId = null
  state.playerNames = {}
  state.currentHand = []

  const cardsDiv = el("cards")
  if (cardsDiv) cardsDiv.innerHTML = ""

  el("question").innerText = "Aguardando jogadores..."
  el("status").innerText = ""
  el("score").innerHTML = `Jogador 1: <span id="p1">0</span> | Jogador 2: <span id="p2">0</span>`
  setResultHtml("")

  hide("nextBtn")
  hide("confirmBtn")
  hide("rematchBtn")
  hide("declineRematchBtn")
}

function selectCard(cardName, cardElement) {
  if (state.confirmed) return

  state.selectedCard = cardName

  document.querySelectorAll(".card").forEach((c) => c.classList.remove("selected"))
  cardElement.classList.add("selected")

  show("confirmBtn")
}

function confirmCard() {
  state.confirmed = true
  stopPickCountdown()

  sendMessage(state.socket, { type: "play", card: state.selectedCard })

  const chosen = state.currentHand.find((c) => c?.name === state.selectedCard) || null
  const cardsDiv = el("cards")

  if (cardsDiv) {
    cardsDiv.innerHTML = `
      <div class="round-stage">
        ${
          chosen
            ? `
              <div class="sent-preview calc-duel calc-duel--single">
                <div class="calc-duel-side calc-duel-side--self">${buildPreviewHandCardHtml(chosen)}</div>
                <div class="calc-vs calc-vs--ghost" aria-hidden="true"></div>
                <div class="calc-duel-side calc-duel-side--opponent"></div>
              </div>
            `
            : ""
        }
      </div>
    `
  }

  hide("confirmBtn")
  el("status").innerText = ""
}

function nextRound() {
  stopPickCountdown()
  stopRematchCountdown()
  cancelAutoNextRoundTimer(state)
  el("nextBtn").innerText = "Próxima"
  sendMessage(state.socket, { type: "next" })
}

function rematch() {
  stopPickCountdown()
  stopRematchCountdown()
  sendMessage(state.socket, { type: "rematch" })

  setRematchButtons({ acceptVisible: false, declineVisible: true })
  setResultHtml("")

  renderGameOverRematchState("Enviando pedido de revanche...", {
    detail: "Se ninguém responder, vocês voltam ao lobby.",
  })

  el("status").innerText = ""
}

function declineRematch() {
  stopPickCountdown()
  stopRematchCountdown()
  sendMessage(state.socket, { type: "declineRematch" })

  setRematchButtons({ acceptVisible: false, declineVisible: false })
  renderGameOverRematchState("Voltando ao lobby...", {
    detail: "Encerrando a partida atual.",
  })

  el("status").innerText = ""
}

function startGame() {
  const nameInput = el("playerNameInput")
  const name = (nameInput?.value || "").trim()

  if (!name) {
    setLoginError("Digite seu nome para começar a partida.")
    nameInput?.focus?.()
    return
  }

  setLoginError("")
  state.playerName = name
  showWaitingScreen({ playerName: state.playerName })
  sendMessage(state.socket, { type: "join", name: state.playerName })
}

// =============================================================================
// Handlers de mensagens do servidor
// =============================================================================

function handleJoined(data) {
  state.playerNames = data.playerNames
  renderScore({ score: { 1: 0, 2: 0 }, playerId: state.playerId, playerNames: state.playerNames })
}

function handleNewCards(data) {
  state.currentHand = Array.isArray(data.languages) ? data.languages : []
  renderCards({
    cards: state.currentHand,
    selectedCard: state.selectedCard,
    onSelectCard: selectCard,
  })
}

function handlePlayerDisconnected() {
  stopPickCountdown()
  resetToInitial()
  showWaitingScreen({ playerName: state.playerName })

  if (state.playerName) {
    sendMessage(state.socket, { type: "join", name: state.playerName })
  }
}

function handleInit(data) {
  state.playerId = data.playerId
  hide("waitingScreen")
}

function handleQuestion(data) {
  stopPickCountdown()
  stopRematchCountdown()
  cancelAutoNextRoundTimer(state)
  stopResultCalcAnimation(state, { clearArea: true, clearText: true })
  exitGameOverLayout()

  el("question").innerText = data.question
  el("status").innerText = "Escolha uma carta"
  setResultHtml("")

  renderScore({ score: data.score, playerId: state.playerId, playerNames: state.playerNames })

  hide("nextBtn")
  hide("confirmBtn")
  hide("rematchBtn")
  hide("declineRematchBtn")

  state.selectedCard = null
  state.confirmed = false

  document.querySelectorAll(".card").forEach((c) => c.classList.remove("selected"))
}

function handleWaiting(data) {
  updateScoreIndicators({
    playedBy: data.playedBy || [],
    playerId: state.playerId,
    playerNames: state.playerNames,
  })

  if (data.whoPlayed === state.playerId) {
    // Evita redundância: o banner do timer (quando existir) já dá o feedback.
    el("status").innerText = ""
  }
}

function handleReveal(data) {
  stopPickCountdown()
  stopRematchCountdown()
  state.lastReveal = {
    player1Card: data.player1Card || null,
    player2Card: data.player2Card || null,
    question: data.question || null,
  }
  startResultCalcAnimation(state, {
    playerNames: state.playerNames,
    p1Card: data.player1Card,
    p2Card: data.player2Card,
  })
}

function buildWinnerExplanationHtml(data) {
  // Explica o resultado usando a pontuação total (score final ponderado).
  // keyStat é opcional; a explicação prioriza a pontuação total.

  const winnerId = data?.winner
  if (winnerId !== 1 && winnerId !== 2) return ""

  const winnerCard = data?.winnerCard
  if (!winnerCard) return ""

  const revealed1 = state.lastReveal?.player1Card?.name
  const revealed2 = state.lastReveal?.player2Card?.name
  const loserCard = data?.loserCard || (winnerId === 1 ? revealed2 : revealed1)

  if (!loserCard) return ""

  const winnerColor = getColor(winnerCard)
  const loserColor = getColor(loserCard)

  const loserId = winnerId === 1 ? 2 : 1
  const rawWinnerScore = Number(data?.scores?.[winnerId])
  const rawLoserScore = Number(data?.scores?.[loserId])
  const hasScores = Number.isFinite(rawWinnerScore) && Number.isFinite(rawLoserScore)

  const calcScoreFromBreakdown = (playerId) => {
    const contrib = data?.weightBreakdown?.contributions?.[playerId]
    if (!contrib || typeof contrib !== "object") return null
    return Object.values(contrib).reduce((sum, v) => sum + (Number(v) || 0), 0)
  }

  const fallbackWinnerScore = calcScoreFromBreakdown(winnerId)
  const fallbackLoserScore = calcScoreFromBreakdown(loserId)

  const winnerScore = hasScores ? rawWinnerScore : fallbackWinnerScore
  const loserScore = hasScores ? rawLoserScore : fallbackLoserScore
  if (!Number.isFinite(winnerScore) || !Number.isFinite(loserScore)) return ""

  const formatScore = (value) => String(Math.round(Number(value) * 100) / 100)

  return (
    `<div class="round-explain">` +
    `<span>Motivo:</span> ` +
    `<strong>Pontuação total</strong>` +
    ` - ` +
    `<span style="color:${winnerColor}"><strong>${escapeHtml(winnerCard)}</strong></span>` +
    `: <strong>${escapeHtml(formatScore(winnerScore))}</strong> vs ` +
    `<span style="color:${loserColor}"><strong>${escapeHtml(loserCard)}</strong></span>` +
    `: <strong>${escapeHtml(formatScore(loserScore))}</strong>` +
    `</div>`
  )
}

function handleResult(data) {
  stopPickCountdown()
  showResultAfterCalc(state, () => {
    renderScore({ score: data.score, playerId: state.playerId, playerNames: state.playerNames })
    show("nextBtn")
    startAutoNextRoundTimer(state, { onNextRound: nextRound })

    const winnerName = data.winner == state.playerId ? state.playerName : getOpponentName()
    if (data.winner && data.winnerCard) {
      const cardColor = getColor(data.winnerCard)
      setRoundOutcomeHtml(
        `Rodada: <strong>${winnerName}</strong> venceu com ` +
          `<strong style="color:${cardColor}">${data.winnerCard}</strong>` +
          buildWinnerExplanationHtml(data)
      )
    } else if (data.winner) {
      setRoundOutcomeHtml(
        `Rodada: <strong>${winnerName}</strong> venceu!` + buildWinnerExplanationHtml(data)
      )
    }

    el("status").innerText = "Próxima rodada..."
  })
}

function handleDraw() {
  stopPickCountdown()
  stopRematchCountdown()
  showResultAfterCalc(state, () => {
    show("nextBtn")
    startAutoNextRoundTimer(state, { onNextRound: nextRound })

    setRoundOutcomeHtml("Rodada empatada!")
    el("status").innerText = "Próxima rodada..."
  })
}

function handleGameOver(data) {
  stopPickCountdown()
  stopRematchCountdown()
  showResultAfterCalc(state, () => {
    renderScore({ score: data.score, playerId: state.playerId, playerNames: state.playerNames })

    renderGameOverPanel(data)
    setResultHtml("")
    el("status").innerText = ""

    hide("nextBtn")
    setRematchButtons({ acceptVisible: true, acceptText: "Jogar novamente", declineVisible: true })
  })
}

function handleWaitingRematch(data) {
  stopPickCountdown()
  stopRematchCountdown()
  el("status").innerText = ""
  startRematchCountdown({
    endsAt: data.endsAt,
    message: `${getOpponentName()} quer jogar novamente!`,
    urgent: true,
    detailBuilder: (secondsLeft) => `Aceite em ${secondsLeft}s ou ambos voltam ao lobby.`,
  })
  setRematchButtons({ acceptVisible: true, acceptText: "Aceitar revanche", declineVisible: true, declineText: "Recusar" })
}

function handleRematchPending(data) {
  stopPickCountdown()
  stopRematchCountdown()
  el("status").innerText = ""
  startRematchCountdown({
    endsAt: data.endsAt,
    message: "Aguardando o adversário aceitar a revanche...",
    detailBuilder: (secondsLeft) => `O pedido expira em ${secondsLeft}s e, depois disso, vocês voltam ao lobby.`,
  })
  setRematchButtons({ acceptVisible: false, declineVisible: true, declineText: "Voltar ao lobby" })
}

function handleLobbyReturned(data) {
  const previousPlayerId = state.playerId
  resetToInitial()
  showLoginScreen({ playerName: state.playerName })

  const status = el("status")

  if (data?.reason === "rematchDeclined") {
    const declinedByYou = data?.declinedBy === previousPlayerId
    status.innerText = declinedByYou
      ? "Você recusou a revanche. De volta ao lobby."
      : "A revanche foi recusada. De volta ao lobby."
    return
  }

  if (data?.reason === "rematchTimeout") {
    status.innerText = "Tempo de resposta esgotado. De volta ao lobby."
    return
  }

  status.innerText = "Você voltou ao lobby."
}

// =============================================================================
// API
// =============================================================================

function handlePickTimer(data) {
  if (!data || typeof data.endsAt !== "number") return
  if (typeof data.waitingFor !== "number") return

  startPickCountdown({
    endsAt: data.endsAt,
    waitingFor: data.waitingFor,
    seconds: data.seconds,
  })
}

export function initApp({ socket }) {
  state.socket = socket

  // Eventos da UI
  el("startGameBtn")?.addEventListener("click", startGame)
  el("confirmBtn")?.addEventListener("click", confirmCard)
  el("nextBtn")?.addEventListener("click", nextRound)
  el("rematchBtn")?.addEventListener("click", rematch)
  el("declineRematchBtn")?.addEventListener("click", declineRematch)
  el("playerNameInput")?.addEventListener("input", () => setLoginError(""))
  el("playerNameInput")?.addEventListener("keypress", (event) => {
    if (event.key === "Enter") startGame()
  })

  // Eventos WS
  socket.onopen = () => {
    console.log("Conectado ao servidor WebSocket")
    showLoginScreen({ playerName: "" })
  }

  socket.onclose = () => {
    console.warn("Desconectado do servidor")
    el("status").innerText = "Desconectado do servidor"
  }

  socket.onerror = (error) => {
    console.error("Erro WebSocket:", error)
    el("status").innerText = "Erro de conexão"
  }

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data)

    const handlers = {
      joined: () => handleJoined(data),
      playerDisconnected: () => handlePlayerDisconnected(),
      init: () => handleInit(data),
      question: () => handleQuestion(data),
      waiting: () => handleWaiting(data),
      reveal: () => handleReveal(data),
      result: () => handleResult(data),
      draw: () => handleDraw(),
      gameover: () => handleGameOver(data),
      waitingRematch: () => handleWaitingRematch(data),
      rematchPending: () => handleRematchPending(data),
      lobbyReturned: () => handleLobbyReturned(data),
      newCards: () => handleNewCards(data),
      playerCount: () => updateWaitingCount(data.count),
      pickTimer: () => handlePickTimer(data),
      pickTimerStop: () => stopPickCountdown(),
    }

    const handler = handlers[data.type]
    if (handler) handler()
    else console.warn(`Tipo de mensagem desconhecido: "${data.type}"`)
  }
}

