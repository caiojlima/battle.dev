/**
 * Decide o resultado da rodada comparando os scores finais.
 *
 * Importante:
 * - A comparação usa uma tolerância (`eps`) para tratar empates numéricos.
 * - Retorna sempre um objeto com `{ type: "draw" }` ou `{ type: "win", winner: 1|2 }`.
 */
export function decideRoundWinner(score1, score2, eps = 1e-9) {
  if (Math.abs(score1 - score2) < eps) return { type: "draw" }
  return { type: "win", winner: score1 > score2 ? 1 : 2 }
}

export function createGameEngine({
  winScore,
  cardsPerPlayer,
  languages,
  questions,
  opponentPickTimeoutMs,
  getWeightedScore,
  getQuestionWeights = null,
  pickRoundQuestion,
  broadcastRoom,
  timers = {
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  },
  rng = () => Math.random(),
}) {
  if (!broadcastRoom) throw new Error("broadcastRoom é obrigatório")

  function shuffle(array) {
    return [...array].sort(() => rng() - 0.5)
  }

  function clearOpponentPickTimeout(room) {
    if (room.opponentPickTimeout) {
      timers.clearTimeout(room.opponentPickTimeout)
      room.opponentPickTimeout = null
    }
  }

  function scheduleReveal(room) {
    if (room.roundResolutionStarted) return
    room.roundResolutionStarted = true
    clearOpponentPickTimeout(room)
    broadcastRoom(room, { type: "pickTimerStop" })
    timers.setTimeout(() => revealCards(room), 500)
  }

  function scheduleOpponentAutoPick(room, waitingPlayerId) {
    clearOpponentPickTimeout(room)

    const endsAt = timers.now() + opponentPickTimeoutMs
    broadcastRoom(room, {
      type: "pickTimer",
      seconds: Math.round(opponentPickTimeoutMs / 1000),
      waitingFor: waitingPlayerId,
      endsAt,
    })

    room.opponentPickTimeout = timers.setTimeout(() => {
      room.opponentPickTimeout = null

      if (!room.players[1] || !room.players[2]) return
      if (room.plays[waitingPlayerId]) return

      const hand = room.hands?.[waitingPlayerId] || []
      if (!Array.isArray(hand) || hand.length === 0) return

      const randomCard = hand[Math.floor(rng() * hand.length)]
      if (!randomCard?.name) return

      room.plays[waitingPlayerId] = randomCard.name

      broadcastRoom(room, {
        type: "waiting",
        playedBy: Object.keys(room.plays).map(Number),
        whoPlayed: waitingPlayerId,
        autoPlayed: true,
      })

      if (room.plays[1] && room.plays[2]) {
        scheduleReveal(room)
      }
    }, opponentPickTimeoutMs)
  }

  function dealCards(room) {
    const shuffled = shuffle(languages)

    const hand1 = shuffled.slice(0, cardsPerPlayer)
    const hand2 = shuffled.slice(cardsPerPlayer, cardsPerPlayer * 2)

    room.hands = { 1: hand1, 2: hand2 }

    room.players[1]?.send(JSON.stringify({ type: "newCards", languages: hand1 }))
    room.players[2]?.send(JSON.stringify({ type: "newCards", languages: hand2 }))
  }

  function startRound(room) {
    if (!room.players[1] || !room.players[2]) return

    clearOpponentPickTimeout(room)
    room.roundResolutionStarted = false

    room.plays = {}
    dealCards(room)

    const question = pickRoundQuestion(questions, room.usedQuestions)
    room.currentQuestion = question

    broadcastRoom(room, {
      type: "question",
      question,
      score: room.score,
      playerNames: room.playerNames,
    })
  }

  function startMatch(room) {
    room.players[1]?.send(JSON.stringify({ type: "init", playerId: 1 }))
    room.players[2]?.send(JSON.stringify({ type: "init", playerId: 2 }))
    startRound(room)
  }

  function revealCards(room) {
    const played1 = room.plays[1]
    const played2 = room.plays[2]

    const card1 =
      room.hands?.[1]?.find((c) => c.name === played1) ||
      languages.find((c) => c.name === played1)

    const card2 =
      room.hands?.[2]?.find((c) => c.name === played2) ||
      languages.find((c) => c.name === played2)

    broadcastRoom(room, {
      type: "reveal",
      player1Card: card1 || null,
      player2Card: card2 || null,
      question: room.currentQuestion,
    })

    timers.setTimeout(() => resolveRound(room), 900)
  }

  function buildWeightBreakdown({ question, card1, card2, winner }) {
    if (!getQuestionWeights) return null
    const weights = getQuestionWeights(question)
    if (!weights || typeof weights !== "object") return null

    const stats = Object.keys(weights)

    const p1Stats = {}
    const p2Stats = {}
    const p1Contrib = {}
    const p2Contrib = {}

    for (const stat of stats) {
      const w = Number(weights[stat]) || 0
      const v1 = Number(card1?.stats?.[stat]) || 0
      const v2 = Number(card2?.stats?.[stat]) || 0
      p1Stats[stat] = v1
      p2Stats[stat] = v2
      p1Contrib[stat] = v1 * w
      p2Contrib[stat] = v2 * w
    }

    // Melhor "explicação": o stat com maior vantagem (contribuição) para o vencedor.
    const winnerId = winner === 1 || winner === 2 ? winner : null
    const loserId = winnerId === 1 ? 2 : winnerId === 2 ? 1 : null

    let keyStat = null
    if (winnerId && loserId) {
      let bestGain = -Infinity
      for (const stat of stats) {
        const w = Number(weights[stat]) || 0
        const winnerValue = winnerId === 1 ? p1Stats[stat] : p2Stats[stat]
        const loserValue = loserId === 1 ? p1Stats[stat] : p2Stats[stat]

        const gain = (winnerValue - loserValue) * w
        if (gain > bestGain) {
          bestGain = gain
          keyStat = {
            stat,
            weight: w,
            winnerValue,
            loserValue,
            // Para a UI: quando w<0, "melhor" é ter MENOR valor naquele stat.
            better: w < 0 ? "lower" : "higher",
          }
        }
      }
    }

    return {
      weights,
      stats: { 1: p1Stats, 2: p2Stats },
      contributions: { 1: p1Contrib, 2: p2Contrib },
      keyStat,
    }
  }

  function resolveRound(room) {
    const played1 = room.plays[1]
    const played2 = room.plays[2]
    if (!played1 || !played2) return

    const question = room.currentQuestion

    const card1 =
      room.hands?.[1]?.find((c) => c.name === played1) ||
      languages.find((c) => c.name === played1)

    const card2 =
      room.hands?.[2]?.find((c) => c.name === played2) ||
      languages.find((c) => c.name === played2)

    if (!card1 || !card2) {
      broadcastRoom(room, { type: "draw", score: room.score, playerNames: room.playerNames })
      return
    }

    const score1 = getWeightedScore(card1, question)
    const score2 = getWeightedScore(card2, question)

    const outcome = decideRoundWinner(score1, score2)
    if (outcome.type === "draw") {
      broadcastRoom(room, {
        type: "draw",
        question,
        score: room.score,
        playerNames: room.playerNames,
        scores: { 1: score1, 2: score2 },
        weightBreakdown: buildWeightBreakdown({ question, card1, card2, winner: null }),
      })
      return
    }

    const winner = outcome.winner
    room.score[winner]++

    const weightBreakdown = buildWeightBreakdown({ question, card1, card2, winner })

    if (room.score[winner] >= winScore) {
      broadcastRoom(room, {
        type: "gameover",
        winner,
        question,
        playerNames: room.playerNames,
        score: room.score,
        scores: { 1: score1, 2: score2 },
        weightBreakdown,
      })
      return
    }

    broadcastRoom(room, {
      type: "result",
      winner,
      question,
      winnerCard: winner === 1 ? card1.name : card2.name,
      loserCard: winner === 1 ? card2.name : card1.name,
      score: room.score,
      playerNames: room.playerNames,
      scores: { 1: score1, 2: score2 },
      weightBreakdown,
    })
  }

  function handlePlay(room, playerId, cardName) {
    if (!cardName || room.plays[playerId]) {
      return { ok: false, reason: "invalid_play" }
    }

    const inHand = room.hands?.[playerId]?.some((c) => c.name === cardName)
    if (!inHand) {
      return { ok: false, reason: "card_not_in_hand" }
    }

    room.plays[playerId] = cardName

    broadcastRoom(room, {
      type: "waiting",
      playedBy: Object.keys(room.plays).map(Number),
      whoPlayed: playerId,
    })

    if (room.plays[1] && room.plays[2]) {
      scheduleReveal(room)
      return { ok: true, scheduled: "reveal" }
    }

    const opponentId = playerId === 1 ? 2 : 1
    scheduleOpponentAutoPick(room, opponentId)
    return { ok: true, scheduled: "auto_pick" }
  }

  return {
    startMatch,
    startRound,
    handlePlay,
    clearOpponentPickTimeout,
  }
}
