import { describe, expect, it } from "vitest"

import { LANGUAGES, QUESTIONS, QUESTION_WEIGHTS } from "../../game/constants.js"
import { getWeightedScore } from "../../game/scoring.js"
import { decideRoundWinner } from "../../server/game-engine.js"

function findQuestionOrThrow(matchFn, label) {
  const question = QUESTIONS.find(matchFn)
  if (!question) {
    throw new Error(`Pergunta não encontrada para: ${label}`)
  }
  return question
}

function getLanguageOrThrow(name) {
  const lang = LANGUAGES.find((l) => l.name === name)
  if (!lang) {
    throw new Error(`Linguagem não encontrada: ${name}`)
  }
  return lang
}

describe("Perguntas com resposta específica (travadas)", () => {
  // Essas perguntas são consideradas "de resposta específica".
  // A intenção é que, independente do rebalanceamento futuro, a resposta esperada
  // continue vencendo (para não quebrar a experiência do jogador).
  const lockedAnswerCases = [
    {
      id: "db_sql",
      questionLabel: "bancos de dados/consultas",
      questionMatch: (q) => q.includes("bancos de dados") && q.includes("consultas"),
      expectedWinner: "SQL",
    },
    {
      id: "ios_swift",
      questionLabel: "apps iOS",
      questionMatch: (q) => q.includes("apps iOS"),
      expectedWinner: "Swift",
    },
    {
      id: "android_kotlin",
      questionLabel: "apps Android",
      questionMatch: (q) => q.includes("apps Android"),
      expectedWinner: "Kotlin",
    },
    {
      id: "windows_csharp",
      questionLabel: "desktop Windows",
      questionMatch: (q) => q.includes("desktop Windows"),
      expectedWinner: "C#",
    },
    {
      id: "kids_scratch",
      questionLabel: "ensinar programação para crianças",
      questionMatch: (q) => q.includes("ensinar") && q.includes("crian"),
      expectedWinner: "Scratch",
    },
    {
      id: "automation_python",
      questionLabel: "automação (scripts/automação geral)",
      questionMatch: (q) => q === "Qual linguagem é melhor para automação?",
      expectedWinner: "Python",
    },
    {
      id: "mvp_python",
      questionLabel: "MVP",
      questionMatch: (q) => q === "Qual linguagem é melhor para MVP?",
      expectedWinner: "Python",
    },
    {
      id: "freelas_python",
      questionLabel: "freelas",
      questionMatch: (q) => q === "Qual linguagem é melhor para freelas?",
      expectedWinner: "Python",
    },
  ]

  it.each(lockedAnswerCases)(
    "$id: a carta esperada deve vencer contra todas as outras ($expectedWinner)",
    ({ questionMatch, questionLabel, expectedWinner }) => {
      const question = findQuestionOrThrow(questionMatch, questionLabel)

      // Garante que a pergunta está "mapeada" (não depende da inferência heurística).
      const hasExplicitWeights = Object.prototype.hasOwnProperty.call(QUESTION_WEIGHTS, question)
      expect(hasExplicitWeights).toBe(true)

      const expectedCard = getLanguageOrThrow(expectedWinner)

      for (const opponentCard of LANGUAGES) {
        if (opponentCard.name === expectedCard.name) continue

        const expectedScore = getWeightedScore(expectedCard, question)
        const opponentScore = getWeightedScore(opponentCard, question)

        const outcomeExpectedFirst = decideRoundWinner(expectedScore, opponentScore)
        expect(outcomeExpectedFirst.type).toBe("win")
        expect(outcomeExpectedFirst.winner).toBe(1)

        const outcomeExpectedSecond = decideRoundWinner(opponentScore, expectedScore)
        expect(outcomeExpectedSecond.type).toBe("win")
        expect(outcomeExpectedSecond.winner).toBe(2)
      }
    }
  )
})
