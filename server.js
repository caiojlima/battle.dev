import http from "http"
import fs   from "fs"
import path from "path"
import { WebSocketServer } from "ws"

// =============================================================================
// CONFIGURAÇÃO DO SERVIDOR HTTP
// Lê os arquivos estáticos uma única vez na inicialização (melhor performance
// do que ler do disco a cada requisição).
// =============================================================================

const htmlContent   = readStaticFile("index.html")
const clientContent = readStaticFile("client.js")
let connectedPlayers = 0
const clients = new Set()
/**
 * Lê um arquivo estático a partir do diretório de trabalho.
 * Encerra o processo com erro se o arquivo não for encontrado —
 * sem esses arquivos o servidor não tem como funcionar.
 */
function readStaticFile(filename) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filename), "utf-8")
  } catch (err) {
    console.error(`Erro ao ler ${filename}:`, err.message)
    process.exit(1)
  }
}

// Servidor HTTP minimalista: serve apenas index.html e client.js
const server = http.createServer((req, res) => {
  if (req.url === "/client.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" })
    res.end(clientContent)
    return
  }

  res.writeHead(200, { "Content-Type": "text/html" })
  res.end(htmlContent)
})

// =============================================================================
// CONSTANTES DO JOGO
// =============================================================================

const WIN_SCORE       = 5  // Pontos necessários para vencer
const CARDS_PER_PLAYER = 6  // Quantas cartas cada jogador recebe por partida

// =============================================================================
// DADOS DAS LINGUAGENS
// Cada objeto representa uma carta com nome, ponto positivo, negativo e área de uso.
// =============================================================================
const LANGUAGES = [
  {
    name: "JavaScript",
    personality: "O rei do caos organizado 👑",
    stats: { performance: 70, facilidade: 85, mercado: 95, complexidade: 60, popularidade: 98 }
  },
  {
    name: "Python",
    personality: "Simples, poderoso e amado por todos 🐍",
    stats: { performance: 65, facilidade: 95, mercado: 92, complexidade: 50, popularidade: 97 }
  },
  {
    name: "Java",
    personality: "Verbosidade é meu sobrenome ☕",
    stats: { performance: 80, facilidade: 60, mercado: 90, complexidade: 75, popularidade: 85 }
  },
  {
    name: "Go",
    personality: "Simples, rápido e direto ao ponto 🚀",
    stats: { performance: 88, facilidade: 75, mercado: 78, complexidade: 55, popularidade: 70 }
  },
  {
    name: "Rust",
    personality: "Sem erros… depois de sofrer 😅",
    stats: { performance: 95, facilidade: 40, mercado: 75, complexidade: 90, popularidade: 65 }
  },
  {
    name: "C#",
    personality: "O queridinho da Microsoft 💚",
    stats: { performance: 82, facilidade: 70, mercado: 85, complexidade: 65, popularidade: 80 }
  },
  {
    name: "TypeScript",
    personality: "JavaScript com disciplina 😎",
    stats: { performance: 75, facilidade: 70, mercado: 88, complexidade: 65, popularidade: 90 }
  },
  {
    name: "PHP",
    personality: "Todo mundo usa, ninguém admite 😂",
    stats: { performance: 68, facilidade: 80, mercado: 85, complexidade: 55, popularidade: 75 }
  },
  {
    name: "C",
    personality: "Raiz, sem frescura 💀",
    stats: { performance: 98, facilidade: 40, mercado: 70, complexidade: 95, popularidade: 72 }
  },
  {
    name: "C++",
    personality: "Poder absoluto… com sofrimento 😈",
    stats: { performance: 97, facilidade: 35, mercado: 78, complexidade: 98, popularidade: 74 }
  },
  {
    name: "Kotlin",
    personality: "Android moderno e elegante 📱",
    stats: { performance: 80, facilidade: 78, mercado: 82, complexidade: 60, popularidade: 76 }
  },
  {
    name: "Swift",
    personality: "Apple vibes 🍎",
    stats: { performance: 85, facilidade: 75, mercado: 80, complexidade: 60, popularidade: 73 }
  },
  {
    name: "Ruby",
    personality: "Produtividade acima de tudo 💎",
    stats: { performance: 60, facilidade: 88, mercado: 65, complexidade: 50, popularidade: 68 }
  },
  {
    name: "Scala",
    personality: "Funcional, complexo e poderoso 🧠",
    stats: { performance: 85, facilidade: 45, mercado: 60, complexidade: 88, popularidade: 55 }
  },
  {
    name: "Dart",
    personality: "Flutter é minha casa 🎯",
    stats: { performance: 78, facilidade: 82, mercado: 70, complexidade: 55, popularidade: 72 }
  },
  {
    name: "Lua",
    personality: "Pequena, leve e ninja 🥷",
    stats: { performance: 82, facilidade: 85, mercado: 55, complexidade: 40, popularidade: 60 }
  },
  {
    name: "COBOL",
    personality: "Eu movo bilhões diariamente 🏦",
    stats: { performance: 75, facilidade: 30, mercado: 85, complexidade: 80, popularidade: 40 }
  },
  {
    name: "Elixir",
    personality: "Concorrência é meu forte 🔥",
    stats: { performance: 85, facilidade: 65, mercado: 60, complexidade: 70, popularidade: 55 }
  },
  {
    name: "Haskell",
    personality: "Se não for puro, nem compila 🤓",
    stats: { performance: 80, facilidade: 30, mercado: 50, complexidade: 95, popularidade: 45 }
  },
  {
    name: "Perl",
    personality: "Legível? Nunca ouvi falar 🕵️",
    stats: { performance: 72, facilidade: 35, mercado: 45, complexidade: 85, popularidade: 38 }
  },
  {
    name: "R",
    personality: "Estatístico e orgulhoso disso 📊",
    stats: { performance: 55, facilidade: 60, mercado: 70, complexidade: 65, popularidade: 62 }
  },
  {
    name: "Groovy",
    personality: "Java, mas na versão cool 😎",
    stats: { performance: 70, facilidade: 75, mercado: 55, complexidade: 55, popularidade: 48 }
  },
  {
    name: "Objective-C",
    personality: "Aposentado, mas não esquecido 👴",
    stats: { performance: 82, facilidade: 38, mercado: 45, complexidade: 80, popularidade: 35 }
  },
  {
    name: "OCaml",
    personality: "Funcional com sotaque francês 🥐",
    stats: { performance: 83, facilidade: 38, mercado: 42, complexidade: 88, popularidade: 36 }
  },
  {
    name: "Zig",
    personality: "C moderno sem desculpa 🔩",
    stats: { performance: 96, facilidade: 45, mercado: 35, complexidade: 80, popularidade: 42 }
  },
  {
    name: "Nim",
    personality: "Rápido, elegante e incompreendido 🌙",
    stats: { performance: 90, facilidade: 60, mercado: 28, complexidade: 65, popularidade: 32 }
  },
  {
    name: "Clojure",
    personality: "Lisp na JVM, niche máximo 🌀",
    stats: { performance: 75, facilidade: 35, mercado: 48, complexidade: 90, popularidade: 40 }
  },
  {
    name: "Erlang",
    personality: "99,9999% de uptime não é brincadeira ☎️",
    stats: { performance: 78, facilidade: 32, mercado: 45, complexidade: 88, popularidade: 37 }
  },
  {
    name: "Julia",
    personality: "Python rápido para quem sabe matemática 🔢",
    stats: { performance: 91, facilidade: 68, mercado: 55, complexidade: 62, popularidade: 50 }
  },
  {
    name: "Solidity",
    personality: "Dinheiro na blockchain, bugs também 💸",
    stats: { performance: 60, facilidade: 48, mercado: 65, complexidade: 75, popularidade: 58 }
  },
  {
    name: "Bash",
    personality: "Cola o universo Unix 🐚",
    stats: { performance: 60, facilidade: 50, mercado: 72, complexidade: 70, popularidade: 75 }
  },
  {
    name: "Crystal",
    personality: "Ruby compilado, sonho ou ilusão? 💎",
    stats: { performance: 88, facilidade: 72, mercado: 30, complexidade: 60, popularidade: 35 }
  },
  {
    name: "Fortran",
    personality: "Mais velho que seu avô e mais rápido 🚀",
    stats: { performance: 94, facilidade: 28, mercado: 40, complexidade: 78, popularidade: 30 }
  },
]

// =============================================================================
// PERGUNTAS DA RODADA
// Sorteadas aleatoriamente a cada rodada para manter a variedade.
// =============================================================================
const QUESTIONS = [
  // Mercado e carreira
  "Qual linguagem tem mais vagas no mercado?",
  "Qual linguagem paga melhor atualmente?",
  "Qual linguagem é melhor para conseguir o primeiro emprego?",
  "Qual linguagem é mais valorizada em grandes empresas?",
  "Qual linguagem é mais usada em startups?",
  "Qual linguagem tem maior crescimento nos últimos anos?",
  "Qual linguagem tem mais oportunidades remotas?",
  "Qual linguagem tem mais demanda internacional?",
  "Qual linguagem garante carreira mais estável?",
  "Qual linguagem é mais difícil de substituir por IA?",
  "Qual linguagem mais abre portas no exterior?",
  "Qual linguagem tem mais chance de virar legado?",
  "Qual linguagem mais cresce no Brasil?",
  "Qual linguagem mais aparece em entrevistas técnicas?",
  "Qual linguagem mais reprova candidatos em entrevistas?",

  // Experiência de desenvolvimento
  "Qual linguagem é mais divertida de programar?",
  "Qual linguagem tem a melhor sintaxe?",
  "Qual linguagem é mais elegante?",
  "Qual linguagem é mais produtiva para desenvolvedores?",
  "Qual linguagem tem menos código boilerplate?",
  "Qual linguagem é mais agradável de manter?",
  "Qual linguagem é mais fácil de debugar?",
  "Qual linguagem tem as melhores ferramentas?",
  "Qual linguagem dá menos dor de cabeça?",
  "Qual linguagem faz você se sentir mais inteligente?",
  "Qual linguagem cansa menos no dia a dia?",
  "Qual linguagem tem o melhor autocomplete?",
  "Qual linguagem é mais satisfatória de escrever?",
  "Qual linguagem tem os erros mais confusos?",

  // Aprendizado
  "Qual linguagem é mais fácil para iniciantes?",
  "Qual linguagem é mais difícil de dominar?",
  "Qual linguagem tem melhor documentação?",
  "Qual linguagem é melhor para aprender programação?",
  "Qual linguagem ensina melhor lógica de programação?",
  "Qual linguagem tem mais material de estudo?",
  "Qual linguagem é mais intuitiva?",
  "Qual linguagem tem a curva de aprendizado mais suave?",
  "Qual linguagem mais desmotiva iniciantes?",
  "Qual linguagem parece fácil mas não é?",
  "Qual linguagem mais ensina boas práticas?",
  "Qual linguagem mais confunde quem está começando?",

  // Ecossistema
  "Qual linguagem tem melhor comunidade?",
  "Qual linguagem tem mais bibliotecas disponíveis?",
  "Qual linguagem tem o melhor ecossistema?",
  "Qual linguagem tem os melhores frameworks?",
  "Qual linguagem evolui mais rápido?",
  "Qual linguagem tem as melhores ferramentas open source?",
  "Qual linguagem tem mais suporte da comunidade?",
  "Qual linguagem tem as libs mais confiáveis?",
  "Qual linguagem tem mais dependências inúteis?",
  "Qual linguagem tem mais problemas de versão?",
  "Qual linguagem tem o ecossistema mais bagunçado?",

  // Aplicações
  "Qual linguagem é melhor para backend?",
  "Qual linguagem é melhor para sistemas web?",
  "Qual linguagem é melhor para APIs?",
  "Qual linguagem é melhor para automação?",
  "Qual linguagem é melhor para microserviços?",
  "Qual linguagem é melhor para cloud?",
  "Qual linguagem é melhor para projetos grandes?",
  "Qual linguagem escala melhor?",
  "Qual linguagem é melhor para alta performance?",
  "Qual linguagem é melhor para sistemas críticos?",
  "Qual linguagem é melhor para projetos rápidos?",
  "Qual linguagem é melhor para MVP?",
  "Qual linguagem é melhor para freelas?",
  "Qual linguagem é melhor para side projects?",

  // Polêmicas
  "Qual linguagem deveria desaparecer?",
  "Qual linguagem é mais superestimada?",
  "Qual linguagem tem a pior sintaxe?",
  "Qual linguagem tem mais código feio na internet?",
  "Qual linguagem cria os piores projetos?",
  "Qual linguagem tem os desenvolvedores mais fanáticos?",
  "Qual linguagem tem a comunidade mais tóxica?",
  "Qual linguagem gera mais bugs em produção?",
  "Qual linguagem tem os desenvolvedores mais arrogantes?",
  "Qual linguagem tem mais dev que se acha senior?",
  "Qual linguagem tem mais dev que só copia do StackOverflow?",
  "Qual linguagem tem mais cursos vendendo promessa falsa?",
  "Qual linguagem tem mais hype do que resultado?",
  "Qual linguagem é mais usada por devs preguiçosos?",
  "Qual linguagem gera os sistemas mais difíceis de manter?",
  "Qual linguagem gera os projetos mais bagunçados?",
  "Qual linguagem vira mais 'spaghetti code'?",
  "Qual linguagem mais sofre com dependências quebradas?",
  "Qual linguagem tem os piores frameworks?",
  "Qual linguagem tem mais 'gambiarra' em produção?",
  "Qual linguagem mais vira meme entre devs?",
  "Qual linguagem mais engana no currículo?",
  "Qual linguagem mais parece fácil mas vira pesadelo?",
  "Qual linguagem mais te faz questionar a vida?",

  // Curiosidades / humor
  "Qual linguagem tem os memes mais fortes?",
  "Qual linguagem tem os devs mais nerds?",
  "Qual linguagem mais aparece em tutorial no YouTube?",
  "Qual linguagem tem os devs mais puristas?",
  "Qual linguagem tem os devs mais religiosos?",
  "Qual linguagem é mais 'gambiarra'?",
  "Qual linguagem parece mágica demais?",
  "Qual linguagem é mais difícil de refatorar?",
  "Qual linguagem mais esconde bugs?",
  "Qual linguagem mais quebra em produção?",
  "Qual linguagem tem os nomes de variável mais estranhos?",
  "Qual linguagem tem os códigos mais ilegíveis?",
  "Qual linguagem tem os commits mais estranhos?",
  "Qual linguagem tem os devs mais noturnos?",
  "Qual linguagem domina mais o GitHub?",
]

const QUESTION_WEIGHTS = {
  // Mercado e carreira
  "Qual linguagem tem mais vagas no mercado?": { mercado: 1 },
  "Qual linguagem paga melhor atualmente?": { mercado: 0.7, complexidade: 0.3 },
  "Qual linguagem é melhor para conseguir o primeiro emprego?": { facilidade: 0.7, mercado: 0.3 },
  "Qual linguagem é mais valorizada em grandes empresas?": { mercado: 0.6, performance: 0.4 },
  "Qual linguagem é mais usada em startups?": { popularidade: 0.6, facilidade: 0.4 },
  "Qual linguagem tem maior crescimento nos últimos anos?": { popularidade: 0.7, mercado: 0.3 },
  "Qual linguagem tem mais oportunidades remotas?": { mercado: 0.7, popularidade: 0.3 },
  "Qual linguagem tem mais demanda internacional?": { mercado: 0.8, popularidade: 0.2 },

  // Experiência
  "Qual linguagem é mais divertida de programar?": { facilidade: 0.6, complexidade: -0.4 },
  "Qual linguagem tem a melhor sintaxe?": { facilidade: 0.7, complexidade: -0.3 },
  "Qual linguagem é mais elegante?": { complexidade: 0.5, performance: 0.5 },
  "Qual linguagem é mais produtiva para desenvolvedores?": { facilidade: 0.6, performance: 0.4 },
  "Qual linguagem tem menos código boilerplate?": { facilidade: 0.7, complexidade: -0.3 },
  "Qual linguagem é mais agradável de manter?": { facilidade: 0.6, complexidade: -0.4 },
  "Qual linguagem é mais fácil de debugar?": { facilidade: 0.6, complexidade: -0.4 },
  "Qual linguagem tem as melhores ferramentas?": { popularidade: 0.7, mercado: 0.3 },

  // Aprendizado
  "Qual linguagem é mais fácil para iniciantes?": { facilidade: 1 },
  "Qual linguagem é mais difícil de dominar?": { complexidade: 1 },
  "Qual linguagem tem melhor documentação?": { popularidade: 1 },
  "Qual linguagem é melhor para aprender programação?": { facilidade: 0.7, complexidade: -0.3 },
  "Qual linguagem ensina melhor lógica de programação?": { complexidade: 0.6, performance: 0.4 },
  "Qual linguagem tem mais material de estudo?": { popularidade: 1 },
  "Qual linguagem é mais intuitiva?": { facilidade: 0.8, complexidade: -0.2 },

  // Ecossistema
  "Qual linguagem tem melhor comunidade?": { popularidade: 1 },
  "Qual linguagem tem mais bibliotecas disponíveis?": { popularidade: 0.8, mercado: 0.2 },
  "Qual linguagem tem o melhor ecossistema?": { popularidade: 0.7, mercado: 0.3 },
  "Qual linguagem tem os melhores frameworks?": { popularidade: 0.6, performance: 0.4 },
  "Qual linguagem evolui mais rápido?": { popularidade: 0.6, mercado: 0.4 },
  "Qual linguagem tem as melhores ferramentas open source?": { popularidade: 1 },

  // Aplicações
  "Qual linguagem é melhor para backend?": { performance: 0.5, mercado: 0.3, complexidade: 0.2 },
  "Qual linguagem é melhor para sistemas web?": { popularidade: 0.6, mercado: 0.4 },
  "Qual linguagem é melhor para APIs?": { performance: 0.6, mercado: 0.4 },
  "Qual linguagem é melhor para automação?": { facilidade: 0.7, popularidade: 0.3 },
  "Qual linguagem é melhor para microserviços?": { performance: 0.6, complexidade: 0.4 },
  "Qual linguagem é melhor para cloud?": { mercado: 0.5, performance: 0.5 },

  // Polêmicas
  "Qual linguagem deveria desaparecer?": { popularidade: -0.6, mercado: -0.4 },
  "Qual linguagem é mais superestimada?": { popularidade: 0.7, performance: -0.3 },
  "Qual linguagem tem a pior sintaxe?": { facilidade: -0.7, complexidade: 0.3 },
  "Qual linguagem tem mais código feio na internet?": { popularidade: 0.6, facilidade: -0.4 },
  "Qual linguagem cria os piores projetos?": { facilidade: -0.5, complexidade: 0.5 },
  "Qual linguagem tem os desenvolvedores mais fanáticos?": { popularidade: 1 },
  "Qual linguagem tem a comunidade mais tóxica?": { popularidade: 1 },
  "Qual linguagem gera mais bugs em produção?": { complexidade: 0.6, performance: -0.4 },
  "Qual linguagem tem os desenvolvedores mais arrogantes?": { popularidade: 1 },
  "Qual linguagem tem mais dev que se acha senior?": { popularidade: 1 },
  "Qual linguagem tem mais dev que só copia do StackOverflow?": { popularidade: 0.7, facilidade: 0.3 },
  "Qual linguagem tem mais cursos vendendo promessa falsa?": { popularidade: 1 },
  "Qual linguagem tem mais hype do que resultado?": { popularidade: 0.7, performance: -0.3 },
  "Qual linguagem é mais usada por devs preguiçosos?": { facilidade: 0.8, complexidade: -0.2 },
  "Qual linguagem gera os sistemas mais difíceis de manter?": { complexidade: 0.7, facilidade: -0.3 },
  "Qual linguagem gera os projetos mais bagunçados?": { complexidade: 0.7, facilidade: -0.3 },
  "Qual linguagem vira mais 'spaghetti code'?": { complexidade: 0.8, facilidade: -0.2 },
  "Qual linguagem mais sofre com dependências quebradas?": { popularidade: 0.5, complexidade: 0.5 },
  "Qual linguagem tem os piores frameworks?": { popularidade: -0.5, performance: -0.5 },

  // Curiosidades
  "Qual linguagem tem os memes mais fortes?": { popularidade: 1 },
  "Qual linguagem tem os devs mais nerds?": { complexidade: 0.6, performance: 0.4 },
  "Qual linguagem mais aparece em tutorial no YouTube?": { popularidade: 1 },
  "Qual linguagem tem os devs mais puristas?": { complexidade: 0.7, performance: 0.3 },
  "Qual linguagem tem os devs mais religiosos?": { popularidade: 1 },
  "Qual linguagem é mais 'gambiarra'?": { facilidade: 0.7, performance: -0.3 },
  "Qual linguagem parece mágica demais?": { facilidade: 0.7, complexidade: -0.3 },
  "Qual linguagem é mais difícil de refatorar?": { complexidade: 0.7, facilidade: -0.3 },
  "Qual linguagem mais esconde bugs?": { complexidade: 0.6, performance: -0.4 },
  "Qual linguagem mais quebra em produção?": { performance: -0.7, complexidade: 0.3 }
}

// =============================================================================
// ESTADO GLOBAL DA PARTIDA
// Uma única partida acontece por vez neste servidor.
//
// players     — objeto { 1: ws, 2: ws } com os WebSockets ativos
//               (objeto em vez de array para preservar os IDs corretos
//                mesmo quando um jogador desconecta e reconecta)
// playerNames — objeto { 1: "nome", 2: "nome" }
// plays       — objeto { playerId: "nomeDaCarta" } com as cartas jogadas
// score       — pontuação acumulada { 1: n, 2: n }
// rematchVotes— contador de votos de revanche (precisa de 2 para reiniciar)
// =============================================================================
let gameState = createEmptyGameState()

/** Retorna um objeto de estado zerado para ser usado na inicialização e no reset. */
function createEmptyGameState() {
  return {
    players:      {},
    playerNames:  {},
    hands:        { 1: [], 2: [] },
    plays:        {},
    score:        { 1: 0, 2: 0 },
    rematchVotes: 0,
    currentQuestion: null,
    usedQuestions: new Set(),
  }
}

/**
 * Reseta apenas os dados da rodada/partida, preservando os jogadores conectados.
 * Usado quando um jogador desconecta (mantemos o socket do outro) e no rematch.
 */
function resetMatchData() {
  gameState.hands        = { 1: [], 2: [] }
  gameState.plays        = {}
  gameState.score        = { 1: 0, 2: 0 }
  gameState.rematchVotes = 0
  gameState.currentQuestion = null
  gameState.usedQuestions = new Set()
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

/**
 * Embaralha um array sem modificar o original (retorna nova cópia).
 * Usado para sortear cartas e perguntas.
 */

function inferWeightsFromQuestion(question) {
  if (!question) return null

  const q = String(question).toLowerCase()

  // Perguntas "negativas" (queremos o "pior"): inverter sinais para que o maior score
  // corresponda ao menor desempenho nos atributos relevantes.
  const isNegative =
    /\b(pior|desaparecer|superestimad|c[oó]digo feio|t[oó]xica|bugs|arrogant|bagun[cç]ad|spaghetti|depend[eê]ncias quebradas|questionar a vida)\b/.test(q)

  const weights = {}

  if (/(performance|alta performance|r[aá]pid|escala|cloud|microservi[cç]os|cr[ií]tic)/.test(q)) {
    weights.performance = 1
  }
  if (/(f[aá]cil|iniciante|sintaxe|produtiv|boilerplate|debug|autocomplete|dor de cabe[cç]a|intuitiv)/.test(q)) {
    weights.facilidade = 1
  }
  if (/(mercado|vaga|emprego|carreira|remot|oportunidad|exterior|brasil|entrevist|demanda|internacional)/.test(q)) {
    weights.mercado = 1
  }
  if (/(comunidade|biblioteca|ecossistema|framework|github|youtube|meme|material de estudo|documenta[cç][aã]o|tutorial)/.test(q)) {
    weights.popularidade = 1
  }
  if (/(dif[ií]cil|complex|refator|manter|ileg[ií]vel|legado)/.test(q)) {
    weights.complexidade = 1
  }

  // Se nada casou, usa uma média "geral" para não cair em random.
  if (Object.keys(weights).length === 0) {
    weights.performance   = 1
    weights.facilidade    = 1
    weights.mercado       = 1
    weights.complexidade  = 1
    weights.popularidade  = 1
  }

  if (isNegative) {
    Object.keys(weights).forEach((k) => {
      weights[k] = -weights[k]
    })
  }

  return weights
}

function getQuestionWeights(question) {
  return QUESTION_WEIGHTS[question] || inferWeightsFromQuestion(question)
}

function getWeightedScore(card, question) {
  const weights = getQuestionWeights(question)
  if (!weights) return 0

  return Object.entries(weights).reduce((total, [stat, weight]) => {
    return total + (card.stats?.[stat] || 0) * weight
  }, 0)
}

function getBestCard(cards, question) {
  return cards.reduce((best, current) => {
    return getWeightedScore(current, question) > getWeightedScore(best, question) ? current : best
  })
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5)
}

/**
 * Envia uma mensagem JSON para todos os jogadores com socket aberto (readyState === 1).
 */
function broadcast(data) {
  Object.values(gameState.players).forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data))
    }
  })
}

function sendPlayerCount() {
  const data = JSON.stringify({
    type: "playerCount",
    count: connectedPlayers
  })

  clients.forEach(client => {
    client.send(data)
  })
}

/**
 * Sorteia uma pergunta sem repetição dentro da mesma partida.
 * Quando esgota o pool de perguntas, reinicia o conjunto e volta a sortear.
 */
function pickRoundQuestion() {
  if (!Array.isArray(QUESTIONS) || QUESTIONS.length === 0) return null

  if (!(gameState.usedQuestions instanceof Set)) {
    gameState.usedQuestions = new Set()
  }

  let available = QUESTIONS.filter(q => !gameState.usedQuestions.has(q))
  if (available.length === 0) {
    gameState.usedQuestions.clear()
    available = QUESTIONS.slice()
  }

  const question = available[Math.floor(Math.random() * available.length)]
  gameState.usedQuestions.add(question)
  return question
}

// =============================================================================
// LÓGICA DA PARTIDA
// =============================================================================

/**
 * Distribui cartas únicas para cada jogador e inicia a primeira rodada.
 * Chamado assim que os dois jogadores informam seus nomes.
 */
function startMatch() {
  // Envia cartas distintas para cada jogador
  gameState.players[1].send(JSON.stringify({
    type:      "init",
    playerId:  1,
  }))

  gameState.players[2].send(JSON.stringify({
    type:      "init",
    playerId:  2,
  }))

  console.log("Partida iniciada com 2 jogadores")
  startRound()
}

function dealCards() {
  const shuffled = shuffle(LANGUAGES)

  const hand1 = shuffled.slice(0, CARDS_PER_PLAYER)
  const hand2 = shuffled.slice(CARDS_PER_PLAYER, CARDS_PER_PLAYER * 2)

  gameState.hands = { 1: hand1, 2: hand2 }

  gameState.players[1].send(JSON.stringify({
    type: "newCards",
    languages: hand1,
  }))

  gameState.players[2].send(JSON.stringify({
    type: "newCards",
    languages: hand2,
  }))
}

/**
 * Inicia uma nova rodada: limpa as jogadas anteriores e envia uma nova pergunta.
 */
function startRound() {
  gameState.plays = {}

  dealCards()

  const question = pickRoundQuestion()
  gameState.currentQuestion = question

  broadcast({
    type:        "question",
    question,
    score:       gameState.score,
    playerNames: gameState.playerNames,
  })
}

/**
 * Revela as cartas escolhidas por ambos os jogadores.
 * Chamado com um pequeno delay após os dois jogarem (para animar o ✓).
 */
function revealCards() {
  const played1 = gameState.plays[1]
  const played2 = gameState.plays[2]

  const card1 =
    gameState.hands?.[1]?.find(c => c.name === played1) ||
    LANGUAGES.find(c => c.name === played1)

  const card2 =
    gameState.hands?.[2]?.find(c => c.name === played2) ||
    LANGUAGES.find(c => c.name === played2)

  broadcast({
    type:    "reveal",
    player1Card: card1 || null,
    player2Card: card2 || null,
    question: gameState.currentQuestion,
  })

  // Após revelar, resolve automaticamente o vencedor da rodada.
  setTimeout(resolveRound, 900)
}

function resolveRound() {
  const played1 = gameState.plays[1]
  const played2 = gameState.plays[2]
  if (!played1 || !played2) return

  const question = gameState.currentQuestion

  const card1 =
    gameState.hands?.[1]?.find(c => c.name === played1) ||
    LANGUAGES.find(c => c.name === played1)

  const card2 =
    gameState.hands?.[2]?.find(c => c.name === played2) ||
    LANGUAGES.find(c => c.name === played2)

  if (!card1 || !card2) {
    console.warn("Não foi possível resolver a rodada (carta inválida):", { played1, played2 })
    broadcast({ type: "draw", score: gameState.score, playerNames: gameState.playerNames })
    return
  }

  const score1 = getWeightedScore(card1, question)
  const score2 = getWeightedScore(card2, question)

  const EPS = 1e-9
  if (Math.abs(score1 - score2) < EPS) {
    broadcast({
      type:        "draw",
      score:       gameState.score,
      playerNames: gameState.playerNames,
      scores:      { 1: score1, 2: score2 },
    })
    return
  }

  const winner = score1 > score2 ? 1 : 2
  gameState.score[winner]++

  if (gameState.score[winner] >= WIN_SCORE) {
    broadcast({
      type:        "gameover",
      winner,
      playerNames: gameState.playerNames,
      score:       gameState.score,
    })
    return
  }

  broadcast({
    type:        "result",
    winner,
    winnerCard:  winner === 1 ? card1.name : card2.name,
    score:       gameState.score,
    playerNames: gameState.playerNames,
    scores:      { 1: score1, 2: score2 },
  })
}

// =============================================================================
// SERVIDOR WEBSOCKET
// =============================================================================

const wss = new WebSocketServer({ server })

wss.on("connection", (ws) => {
  // Recusa a conexão se a sala já está cheia
  if (Object.keys(gameState.players).length >= 2) {
    console.log("Conexão recusada: sala cheia")
    ws.close(1008, "Sala cheia")
    return
  }

  // Atribui o slot livre (1 ou 2) em vez de depender do tamanho do array.
  // Isso garante que, se o jogador 1 desconectar, o próximo a entrar receba
  // o ID 1 (slot vago) e não o ID 2 (que já está ocupado pelo jogador 2).
  const playerId = gameState.players[1] ? 2 : 1
  gameState.players[playerId] = ws

  console.log(`Jogador ${playerId} conectado. Sala: ${Object.keys(gameState.players).length}/2`)
  connectedPlayers++
  clients.add(ws)

  sendPlayerCount()
  // ── Recepção de mensagens ──────────────────────────────────────────────────
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg)

      // "join" é tratado fora do switch por ter fluxo diferente (precisa de return)
      if (data.type === "join") {
        handleJoin(playerId, ws, data.name)
        return
      }

      switch (data.type) {
        // Jogador confirmou uma carta para esta rodada
        case "play": {
          if (!data.card || gameState.plays[playerId]) {
            console.warn(`Jogada inválida do jogador ${playerId}`)
            return
          }

          const inHand = gameState.hands?.[playerId]?.some(c => c.name === data.card)
          if (!inHand) {
            console.warn(`Jogador ${playerId} tentou jogar uma carta que não está na mão:`, data.card)
            return
          }

          gameState.plays[playerId] = data.card
          console.log(`Jogador ${playerId} jogou: ${data.card}`)

          // Notifica ambos com TODOS que já jogaram (para exibir o ✓ no placar).
          // Usa Object.keys após atribuir a jogada, então o array já inclui o
          // jogador atual e qualquer outro que tenha jogado antes.
          broadcast({
            type:      "waiting",
            playedBy:  Object.keys(gameState.plays).map(Number),
            whoPlayed: playerId,
          })

          // Se os dois já jogaram, revela após um pequeno delay
          if (gameState.plays[1] && gameState.plays[2]) {
            setTimeout(revealCards, 500)
          }
          break
        }

        // Jogador clicou em "Próxima rodada" (manual ou pelo timer)
        case "next":
          startRound()
          break

        // Jogador solicitou uma revanche após o fim de jogo
        case "rematch": {
          gameState.rematchVotes++
          console.log(`Voto de revanche: ${gameState.rematchVotes}/2`)
          
          const opponentId = playerId === 1 ? 2 : 1

          if (gameState.rematchVotes < 2) {
            // Ainda aguardando o outro jogador aceitar
            gameState.players[opponentId]?.send(JSON.stringify({
              type: "waitingRematch",
              from: playerId
            }))
            break
          }

          // Ambos aceitaram — reinicia a partida do zero (mantendo os jogadores)
          console.log("Revanche aprovada. Reiniciando partida...")
          resetMatchData()
          startMatch()
          break
        }

        default:
          console.warn(`Mensagem desconhecida: "${data.type}"`)
      }
    } catch (err) {
      console.error("Erro ao processar mensagem:", err.message)
    }
  })

  // ── Desconexão ────────────────────────────────────────────────────────────
  ws.on("close", () => {
    connectedPlayers--
    clients.delete(ws)
    sendPlayerCount()

    console.log(`Jogador ${playerId} desconectou`)

    // Notifica o adversário que ainda está na sala
    const opponentId = playerId === 1 ? 2 : 1
    gameState.players[opponentId]?.send(JSON.stringify({
      type: "playerDisconnected",
    }))

    // Remove o jogador desconectado e reseta os dados da partida
    delete gameState.players[playerId]
    delete gameState.playerNames[playerId]
    resetMatchData()
  })

  ws.on("error", (err) => {
    console.error(`Erro WebSocket (jogador ${playerId}):`, err.message)
  })
})

/**
 * Processa a mensagem "join" (registro de nome do jogador).
 *
 * Dois cenários possíveis:
 * 1. Primeiro acesso: registra o nome e aguarda o segundo jogador.
 * 2. Reentrada (após desconexão do adversário): atualiza o nome sem reiniciar o jogo.
 *
 * Quando os dois jogadores estão registrados, a partida é iniciada.
 */
function handleJoin(playerId, ws, name) {
  if (!name || !name.trim()) {
    console.warn(`Jogador ${playerId} tentou entrar sem nome`)
    return
  }

  const isRejoining = Boolean(gameState.playerNames[playerId])

  gameState.playerNames[playerId] = name.trim()
  console.log(`Jogador ${playerId} ${isRejoining ? "reentrando" : "entrou"} como: ${name}`)

  // Confirma para o jogador que entrou/voltou
  ws.send(JSON.stringify({
    type:        "joined",
    playerNames: gameState.playerNames,
  }))

  // Se está reentrado após queda do adversário, apenas aguarda — não reinicia a partida
  if (isRejoining) return

  // Se os dois jogadores estão registrados, inicia a partida
  const bothPlayersNamed = Object.keys(gameState.playerNames).length === 2

  if (bothPlayersNamed) {
    // Notifica ambos com os nomes finais antes de distribuir as cartas
    broadcast({
      type:        "joined",
      playerNames: gameState.playerNames,
    })
    startMatch()
  }
}

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Servidor HTTP  → http://localhost:${PORT}`)
  console.log(`Servidor WS    → ws://localhost:${PORT}`)
})
