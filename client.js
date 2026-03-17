// =============================================================================
// CONEXÃO WEBSOCKET
// Usa wss:// em HTTPS e ws:// em HTTP para compatibilidade com qualquer ambiente
// =============================================================================
const socket = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
)

// =============================================================================
// ESTADO DO CLIENTE
// Todas as variáveis de estado ficam agrupadas aqui para fácil localização
// =============================================================================

// Identificação do jogador local nesta sessão
let playerId   = null  // 1 ou 2 — atribuído pelo servidor ao entrar
let playerName = null  // Nome digitado na tela de login
let playerNames = {}   // Mapa { 1: "nome", 2: "nome" } com ambos os jogadores

// Estado da rodada atual
let selectedCard   = null   // Nome da carta selecionada mas ainda não confirmada
let confirmed      = false  // true após o jogador confirmar a carta da rodada

// Timer de avanço automático para a próxima rodada (countdown)
let autoNextRoundTimer = null
const AUTO_NEXT_ROUND_SECONDS = 10

// Controle da animação de "cálculo de resultado" (entre reveal e result/draw)
const RESULT_CALC_MIN_MS = 1500
let resultCalcStartedAt = null
let pendingResultTimeout = null

// Referência ao container de cartas — usado com frequência
const cardsDiv = document.getElementById("cards")

// =============================================================================
// MAPA DE CORES DAS LINGUAGENS
// Cada linguagem tem sua cor oficial para o fundo do card
// =============================================================================
const LANGUAGE_COLORS = {
  JavaScript: "#f7df1e",
  Python:     "#3776AB",
  Java:       "#b07219",
  Go:         "#00ADD8",
  Rust:       "#dea584",
  "C#":       "#239120",
  TypeScript: "#3178c6",
  PHP:        "#777bb4",
  C:          "#555555",
  "C++":      "#00599c",
  Kotlin:     "#A97BFF",
  Swift:      "#FA7343",
  Ruby:       "#cc342d",
  Scala:      "#c22d40",
  Dart:       "#0175C2",
  Elixir:     "#6e4a7e",
  Lua:        "#000080",
  Haskell:    "#5e5086",
  COBOL:      "#00427e",
  Perl:         "#39457e",
  R:            "#276DC3",
  MATLAB:       "#e16737",
  Groovy:       "#4298b8",
  "Objective-C":"#438eff",
  Assembly:     "#6E6E6E",
  Fortran:      "#734f96",
  Ada:          "#02f88c",
  OCaml:        "#ec6813",
  Crystal:      "#4d4d4d",
  Zig:          "#f7a41d",
  Nim:          "#ffe953",
  Clojure:      "#5881d8",
  Erlang:       "#a90533",
  Julia:        "#9558b2",
  Solidity:     "#707070",
  Bash:         "#4eaa25",
}

// =============================================================================
// HELPERS UTILITÁRIOS
// =============================================================================

function getColor(name) {
  return LANGUAGE_COLORS[name] || "#ffffff"
}

/**
 * Retorna o nome do adversário com base no ID do jogador local.
 * Se o nome ainda não estiver disponível, usa o fallback "Jogador X".
 */
function getOpponentName() {
  const opponentId = playerId === 1 ? 2 : 1
  return playerNames[opponentId] || `Jogador ${opponentId}`
}

/**
 * Atalho para buscar um elemento do DOM pelo ID.
 * Reduz verbosidade ao longo do código.
 */
function el(id) {
  return document.getElementById(id)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildPreviewHandCardHtml(lang, ownerName) {
  const name = lang?.name ?? ""
  const personality = lang?.personality ?? ""
  const stats = lang?.stats ?? {}
  const color = getColor(name)

  return `
    <div class="card calc-preview" style="
      border-top: 4px solid ${color};
      box-shadow: 0 6px 20px ${color}30;
    ">

      <h4 style="color:${color}">
        ${escapeHtml(name)}
      </h4>

      <p class="personality">
        ${escapeHtml(personality)}
      </p>

      <div class="card-info">
        <p><strong>Jogador:</strong> ${escapeHtml(ownerName)}</p>
      </div>

      <div class="stats">
        ${Object.entries(stats).map(([key, value]) => `
          <div class="stat">
            <span>${escapeHtml(formatStatName(key))}</span>
            <div class="bar">
              <div class="fill" style="width:${Number(value)}%"></div>
            </div>
            <strong>${Number(value)}</strong>
          </div>
        `).join("")}
      </div>

    </div>
  `
}

/**
 * Esconde um elemento pelo ID (display: none).
 * Usa null-check pois alguns elementos são criados dinamicamente.
 */
function hide(id) {
  const element = el(id)
  if (element) element.style.display = "none"
}

/**
 * Exibe um elemento pelo ID com o display informado (padrão: "inline").
 */
function show(id, display = "inline") {
  const element = el(id)
  if (element) element.style.display = display
}

// =============================================================================
// EVENTOS WEBSOCKET
// =============================================================================

// Disparado quando a conexão com o servidor é estabelecida com sucesso
socket.onopen = () => {
  console.log("Conectado ao servidor WebSocket")
  showLoginScreen()
}

// Disparado quando o servidor fecha a conexão
socket.onclose = () => {
  console.warn("Desconectado do servidor")
  el("status").innerText = "Desconectado do servidor"
}

// Disparado em caso de erro na conexão
socket.onerror = (error) => {
  console.error("Erro WebSocket:", error)
  el("status").innerText = "Erro de conexão"
}

// =============================================================================
// ROTEADOR DE MENSAGENS DO SERVIDOR
// Despacha cada tipo de mensagem para o handler correspondente
// =============================================================================
socket.onmessage = (event) => {
  const data = JSON.parse(event.data)

  const handlers = {
    joined:             () => handleJoined(data),
    playerDisconnected: () => handlePlayerDisconnected(),
    init:               () => handleInit(data),
    question:           () => handleQuestion(data),
    waiting:            () => handleWaiting(data),
    reveal:             () => handleReveal(data),
    result:             () => handleResult(data),
    draw:               () => handleDraw(),
    gameover:           () => handleGameOver(data),
    waitingRematch:     () => handleWaitingRematch(),
    newCards:           () => handleNewCards(data),
    playerCount:        () => updateWaitingCount(data.count),
  }

  const handler = handlers[data.type]

  if (handler) {
    handler()
  } else {
    console.warn(`Tipo de mensagem desconhecido: "${data.type}"`)
  }
}

function updateWaitingCount(count) {
  const el = document.getElementById("playerCount")

  if (!el) return

  el.innerText =
    count === 1
      ? "1 jogador online 👤"
      : `${count} jogadores online 👥`
}

// =============================================================================
// HANDLERS DE MENSAGENS DO SERVIDOR
// =============================================================================

/**
 * "joined" — um jogador entrou na sala.
 * Atualiza o mapa de nomes e exibe o placar inicial.
 */
function handleJoined(data) {
  playerNames = data.playerNames
  console.log("Jogadores na sala:", playerNames)
  renderScore({ 1: 0, 2: 0 })
}

function handleNewCards(data) {
  renderCards(data.languages)
}

/**
 * "playerDisconnected" — o adversário desconectou durante a partida.
 * Limpa toda a UI, exibe a tela de espera e tenta reentrar com o mesmo nome.
 */
function handlePlayerDisconnected() {
  console.log("Adversário desconectou. Voltando para tela de espera...")

  resetToInitial()
  showWaitingScreen()

  // Re-envia o nome ao servidor para entrar na próxima partida automaticamente
  if (playerName) {
    console.log(`Reentrando como "${playerName}"...`)
    sendMessage({ type: "join", name: playerName })
  }
}

/**
 * "init" — o servidor distribuiu as cartas e o jogo está começando.
 * Armazena o ID do jogador e renderiza os cards na tela.
 */
function handleInit(data) {
  playerId = data.playerId
  hide("waitingScreen")
}

/**
 * "question" — nova rodada iniciada com uma pergunta.
 * Reseta o estado local da rodada e exibe a pergunta com o placar atualizado.
 */
function handleQuestion(data) {
  // Cancela o timer automático assim que o servidor confirma a nova rodada.
  // Sem isso, um clique manual em "Próxima" enviaria "next" e o timer ainda
  // ativo dispararia um segundo "next" segundos depois, resetando a rodada 2x.
  cancelAutoNextRoundTimer()
  stopResultCalcAnimation({ clearResult: true })

  el("question").innerText = data.question
  el("status").innerText   = "Escolha uma carta"
  el("result").innerHTML   = ""

  renderScore(data.score)

  // Esconde todos os controles de ação da rodada anterior
  hide("nextBtn")
  hide("confirmBtn")

  // Reseta o estado local da rodada
  selectedCard  = null
  confirmed     = false

  // Remove marcações visuais de seleção dos cards
  document.querySelectorAll(".card").forEach(c => c.classList.remove("selected"))
}

/**
 * "waiting" — um ou ambos os jogadores já escolheram sua carta.
 * Atualiza os indicadores visuais no placar e exibe mensagem para quem já jogou.
 */
function handleWaiting(data) {
  updateScoreIndicators(data.playedBy || [])

  // Só exibe mensagem de espera para o jogador que acabou de jogar
  if (data.whoPlayed === playerId) {
    el("status").innerText = `Você escolheu: ${selectedCard} — Aguardando ${getOpponentName()} escolher...`
  }
}

/**
 * "reveal" — ambos jogaram, hora de revelar as cartas.
 * As cartas do duelo não são exibidas no cliente (apareciam rápido demais).
 */
function handleReveal(data) {
  // Executa uma animação rápida de "cálculo" antes do resultado chegar.
  // (As cartas do duelo foram removidas por aparecerem rápido demais.)
  startResultCalcAnimation({
    p1Card: data.player1Card,
    p2Card: data.player2Card,
  })
}

/**
 * "result" — o servidor resolveu o vencedor da rodada, placar atualizado.
 * Inicia o countdown para a próxima rodada.
 */
function handleResult(data) {
  showResultAfterCalc(() => {
    renderScore(data.score)
    show("nextBtn")
    startAutoNextRoundTimer()

    const winnerName = data.winner == playerId ? playerName : getOpponentName()
    if (data.winner && data.winnerCard) {
      const cardColor = getColor(data.winnerCard)
      setRoundOutcomeHtml(
        `Rodada: <strong>${winnerName}</strong> venceu com ` +
        `<strong style="color:${cardColor}">${data.winnerCard}</strong>`
      )
    } else if (data.winner) {
      setRoundOutcomeHtml(`Rodada: <strong>${winnerName}</strong> venceu!`)
    }

    el("status").innerText = "Próxima rodada..."
  })
}

/**
 * "draw" — rodada empatada (sem ponto).
 * Inicia o countdown para a próxima rodada.
 */
function handleDraw() {
  showResultAfterCalc(() => {
    show("nextBtn")
    startAutoNextRoundTimer()

    setRoundOutcomeHtml("Rodada empatada!")
    el("status").innerText = "Próxima rodada..."
  })
}

/**
 * "gameover" — um jogador atingiu a pontuação de vitória.
 * Exibe o resultado final e o botão de revanche.
 */
function handleGameOver(data) {
  showResultAfterCalc(() => {
    renderScore(data.score)

    // Mensagem personalizada dependendo se o jogador local ganhou ou perdeu
    const message = data.winner == playerId
      ? `🏆 ${playerName} venceu!`
      : `💀 ${getOpponentName()} venceu!`

    setRoundOutcomeHtml(message)
    el("status").innerText = "Fim de jogo"

    hide("nextBtn")
    show("rematchBtn")
  })
}

/**
 * "waitingRematch" — o jogador pediu revanche e aguarda o adversário aceitar.
 */
function handleWaitingRematch() {
  el("status").innerText = `🔥 ${getOpponentName()} quer jogar novamente!`

  const btn = el("rematchBtn")
  btn.innerText = "Aceitar revanche"

  // Garante que o botão fique visível para aceitar
  show("rematchBtn")
}

// =============================================================================
// AÇÕES DO JOGADOR (disparadas pelos botões do HTML)
// =============================================================================

/**
 * Seleciona um card ao clicar nele.
 * Marca visualmente o card e exibe o botão de confirmação.
 * Bloqueado se o jogador já confirmou a jogada desta rodada.
 */
function selectCard(cardName, cardElement) {
  if (confirmed) return

  selectedCard = cardName

  // Remove seleção visual de todos os cards e aplica apenas ao clicado
  document.querySelectorAll(".card").forEach(c => c.classList.remove("selected"))
  cardElement.classList.add("selected")

  show("confirmBtn")
}

function formatStatName(key){
  const map = {
    performance: "⚡ Performance",
    facilidade: "📚 Facilidade",
    mercado: "💼 Mercado",
    complexidade: "🧠 Complexidade",
    popularidade: "🚀 Popularidade",
  }

  return map[key] || key
}

/**
 * Confirma a carta selecionada e envia a jogada ao servidor.
 * Bloqueia novas seleções para esta rodada.
 */
function confirmCard() {
  confirmed = true

  sendMessage({ type: "play", card: selectedCard })

  hide("confirmBtn")
  el("status").innerText = `Você escolheu: ${selectedCard} — Aguardando ${getOpponentName()} escolher...`
}

/**
 * Avança manualmente para a próxima rodada.
 * Cancela o timer automático caso esteja rodando.
 */
function nextRound() {
  cancelAutoNextRoundTimer()
  el("nextBtn").innerText = "Próxima"
  sendMessage({ type: "next" })
}

/**
 * Solicita uma revanche ao servidor após o fim de jogo.
 */
function rematch() {
  sendMessage({ type: "rematch" })

  hide("rematchBtn")

  el("result").innerHTML = ""
  el("status").innerText = "⏳ Você pediu revanche. Aguardando o adversário..."
}

/**
 * Lê o nome digitado e entra na sala de espera.
 * Valida que o nome não está vazio antes de prosseguir.
 */
function startGame() {
  const nameInput = el("playerNameInput")
  const name = nameInput.value.trim()

  if (!name) {
    alert("Digite um nome para continuar!")
    nameInput.focus()
    return
  }

  playerName = name
  showWaitingScreen()
  sendMessage({ type: "join", name: playerName })
}

// =============================================================================
// NAVEGAÇÃO ENTRE TELAS
// =============================================================================

/**
 * Exibe a tela de login e esconde as demais.
 * Limpa o campo de nome e coloca o foco nele.
 */
function showLoginScreen() {
  show("loginScreen", "flex")
  hide("waitingScreen")

  const nameInput = el("playerNameInput")
  nameInput.value = ""
  nameInput.focus()
}

/**
 * Exibe a tela de espera por oponente e esconde as demais.
 * Preenche o nome do jogador local para confirmar que está aguardando.
 */
function showWaitingScreen() {
  hide("loginScreen")
  show("waitingScreen", "flex")

  const nameEl = el("waitingPlayerName")
  if (nameEl && playerName) nameEl.innerText = playerName
}

// =============================================================================
// RESET DE ESTADO
// =============================================================================

/**
 * Reseta todo o estado do cliente para os valores iniciais.
 * Chamado quando o adversário desconecta, limpando completamente a UI.
 * Não redefine playerName — ele é mantido para reentrar automaticamente.
 */
function resetToInitial() {
  // Cancela o countdown antes de qualquer outra coisa
  // (evita que o timer dispare um "next" enquanto o estado já foi limpo)
  cancelAutoNextRoundTimer()
  stopResultCalcAnimation({ clearResult: true })

  // Reseta estado da rodada
  selectedCard  = null
  confirmed     = false
  playerId      = null
  playerNames   = {}

  // Limpa a UI
  cardsDiv.innerHTML       = ""
  el("question").innerText = "Aguardando jogadores..."
  el("status").innerText   = ""
  el("score").innerHTML    = `Jogador 1: <span id="p1">0</span> | Jogador 2: <span id="p2">0</span>`
  el("result").innerHTML   = ""

  hide("nextBtn")
  hide("confirmBtn")
  hide("rematchBtn")
}

// =============================================================================
// RENDERIZAÇÃO
// =============================================================================

/**
 * Cria e insere todos os cards de linguagem no DOM.
 * Cada card exibe nome, ícone Devicon e os atributos da linguagem.
 */
function renderCards(cards) {
  const container = el("cards")

  container.innerHTML = cards.map((lang, index) => {
    return `
      <div class="card ${selectedCard === lang.name ? 'selected' : ''}" data-name="${lang.name}" style="
        border-top: 4px solid ${getColor(lang.name)};
        box-shadow: 0 6px 20px ${getColor(lang.name)}30;
        animation-delay: ${index * 0.15}s;
      ">

        <h2 style="color:${getColor(lang.name)}">
          ${lang.name}
        </h2>

        <p class="personality">
          ${lang.personality}
        </p>

        <div class="stats">
          ${Object.entries(lang.stats).map(([key, value]) => `
            <div class="stat">
              <span>${formatStatName(key)}</span>
              <div class="bar">
                <div class="fill" style="width:${value}%"></div>
              </div>
              <strong>${value}</strong>
            </div>
          `).join("")}
        </div>

      </div>
    `
  }).join("")

  document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", () => {
    const name = card.dataset.name
    selectCard(name, card)
  })
})
}

/**
 * Renderiza o placar com a pontuação atualizada de ambos os jogadores.
 * Usa os nomes do mapa playerNames quando disponíveis.
 */
/**
 * Monta o HTML de um lado do placar VS.
 * O jogador local recebe a classe "is-you" que aplica o destaque azul via CSS,
 * sem nenhuma tag textual — convenção visual de jogos de duelo.
 */
function buildScoreSide(name, score, isYou, idAttr, done = false) {
  return `
    <div class="score-side${isYou ? " is-you" : ""}">
      <span class="score-name">${name}</span>
      <span class="score-points" id="${idAttr}">${score}</span>
      <span class="score-check">${done ? "✓" : ""}</span>
    </div>
  `
}

/**
 * Renderiza o placar VS com a pontuação atualizada de ambos os jogadores.
 * O jogador local aparece sempre à esquerda, o adversário à direita.
 */
function renderScore(score) {
  const myId  = playerId ?? 1
  const oppId = myId === 1 ? 2 : 1

  const myName  = playerNames[myId]  || `Jogador ${myId}`
  const oppName = playerNames[oppId] || `Jogador ${oppId}`

  el("score").innerHTML =
    buildScoreSide(myName,  score[myId]  ?? 0, true,  `p${myId}`) +
    `<span class="score-vs">VS</span>` +
    buildScoreSide(oppName, score[oppId] ?? 0, false, `p${oppId}`)
}

/**
 * Atualiza o placar adicionando o indicador de ✓ para os jogadores
 * que já jogaram na rodada atual, mantendo o layout VS.
 *
 * @param {number[]} playedBy - IDs dos jogadores que já jogaram a carta
 */
function updateScoreIndicators(playedBy = []) {
  const myId  = playerId ?? 1
  const oppId = myId === 1 ? 2 : 1

  const myName  = playerNames[myId]  || `Jogador ${myId}`
  const oppName = playerNames[oppId] || `Jogador ${oppId}`

  const myScore  = el(`p${myId}`)?.innerText  ?? "0"
  const oppScore = el(`p${oppId}`)?.innerText ?? "0"

  const myDone  = playedBy.includes(myId)
  const oppDone = playedBy.includes(oppId)

  el("score").innerHTML =
    buildScoreSide(myName,  myScore,  true,  `p${myId}`,  myDone) +
    `<span class="score-vs">VS</span>` +
    buildScoreSide(oppName, oppScore, false, `p${oppId}`, oppDone)
}

// =============================================================================
// TIMER DE AVANÇO AUTOMÁTICO
// =============================================================================

/**
 * Inicia um countdown (AUTO_NEXT_ROUND_SECONDS) e avança automaticamente para a próxima rodada.
 * Atualiza o texto do botão a cada segundo para dar feedback visual ao jogador.
 */
function startAutoNextRoundTimer() {
  const btn = el("nextBtn")
  let countdown = AUTO_NEXT_ROUND_SECONDS
  btn.innerText = `Próxima rodada... ${countdown}s`

  autoNextRoundTimer = setInterval(() => {
    countdown--
    if (countdown <= 0) {
      cancelAutoNextRoundTimer()
      nextRound()
      return
    }
    btn.innerText = `Próxima rodada... ${countdown}s`
  }, 1000)
}

/**
 * Cancela o timer de avanço automático, se estiver ativo.
 * Sempre chamado antes de qualquer reset ou avanço manual.
 */
function cancelAutoNextRoundTimer() {
  if (autoNextRoundTimer) {
    clearInterval(autoNextRoundTimer)
    autoNextRoundTimer = null
  }
}

function startResultCalcAnimation({ p1Card = null, p2Card = null } = {}) {
  stopResultCalcAnimation()

  const p1Name = playerNames[1] || "Jogador 1"
  const p2Name = playerNames[2] || "Jogador 2"

  const card1 = p1Card && typeof p1Card === "object" ? p1Card : null
  const card2 = p2Card && typeof p2Card === "object" ? p2Card : null

  resultCalcStartedAt = Date.now()
  el("result").innerHTML = `
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
  `
  el("status").innerText = "Aguarde o resultado..."
}

function stopResultCalcAnimation({ clearResult = false, keepChosenCards = true } = {}) {
  if (pendingResultTimeout) {
    clearTimeout(pendingResultTimeout)
    pendingResultTimeout = null
  }
  resultCalcStartedAt = null
  if (clearResult) {
    el("result").innerHTML = ""
    return
  }

  const loading = document.querySelector("#result .result-loading")
  if (loading) loading.remove()

  if (!keepChosenCards) {
    el("chosenCards")?.remove()
  }
}

function showResultAfterCalc(fn) {
  const startedAt = resultCalcStartedAt
  const elapsed = startedAt ? Date.now() - startedAt : RESULT_CALC_MIN_MS
  const remaining = Math.max(0, RESULT_CALC_MIN_MS - elapsed)

  if (remaining === 0) {
    stopResultCalcAnimation({ keepChosenCards: true })
    fn()
    return
  }

  pendingResultTimeout = setTimeout(() => {
    pendingResultTimeout = null
    stopResultCalcAnimation({ keepChosenCards: true })
    fn()
  }, remaining)
}

function setRoundOutcomeHtml(html) {
  const container = el("roundOutcome")
  if (container) {
    container.innerHTML = html
    return
  }
  el("result").innerHTML = html
}

// =============================================================================
// COMUNICAÇÃO COM O SERVIDOR
// =============================================================================

/**
 * Serializa e envia um objeto como mensagem JSON pelo WebSocket.
 * Centraliza todos os envios para facilitar debug e logging futuro.
 */
function sendMessage(payload) {
  socket.send(JSON.stringify(payload))
}
