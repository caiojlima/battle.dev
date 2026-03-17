import { el } from "../dom.js"

function buildScoreSide(name, score, isYou, idAttr, done = false) {
  return `
    <div class="score-side${isYou ? " is-you" : ""}">
      <span class="score-name">${name}</span>
      <span class="score-points" id="${idAttr}">${score}</span>
      <span class="score-check">${done ? "✓" : ""}</span>
    </div>
  `
}

export function renderScore({ score, playerId, playerNames }) {
  const myId = playerId ?? 1
  const oppId = myId === 1 ? 2 : 1

  const myName = playerNames?.[myId] || `Jogador ${myId}`
  const oppName = playerNames?.[oppId] || `Jogador ${oppId}`

  el("score").innerHTML =
    buildScoreSide(myName, score?.[myId] ?? 0, true, `p${myId}`) +
    `<span class="score-vs">VS</span>` +
    buildScoreSide(oppName, score?.[oppId] ?? 0, false, `p${oppId}`)
}

export function updateScoreIndicators({ playedBy = [], playerId, playerNames }) {
  const myId = playerId ?? 1
  const oppId = myId === 1 ? 2 : 1

  const myName = playerNames?.[myId] || `Jogador ${myId}`
  const oppName = playerNames?.[oppId] || `Jogador ${oppId}`

  const myScore = el(`p${myId}`)?.innerText ?? "0"
  const oppScore = el(`p${oppId}`)?.innerText ?? "0"

  const myDone = playedBy.includes(myId)
  const oppDone = playedBy.includes(oppId)

  el("score").innerHTML =
    buildScoreSide(myName, myScore, true, `p${myId}`, myDone) +
    `<span class="score-vs">VS</span>` +
    buildScoreSide(oppName, oppScore, false, `p${oppId}`, oppDone)
}

