export const state = {
  socket: null,

  // Identificação do jogador local
  playerId: null, // 1 ou 2
  playerName: null,
  playerNames: {}, // { 1: "nome", 2: "nome" }

  // Estado da rodada atual
  selectedCard: null,
  confirmed: false,
  currentHand: [],

  // Timer de avanço automático para a próxima rodada (countdown)
  autoNextRoundTimer: null,

  // Controle da animação de "cálculo de resultado" (entre reveal e result/draw)
  resultCalcStartedAt: null,
  pendingResultTimeout: null,

  // Countdown do timer de escolha (servidor)
  pickCountdownTimer: null,

  // Último reveal recebido (para explicar o resultado).
  lastReveal: null,
}
