/**
 * Constantes do jogo e dados das cartas.
 *
 * Este arquivo contém apenas dados (sem lógica) para facilitar manutenção/refactor.
 */

// =============================================================================
// CONSTANTES DO JOGO
// =============================================================================
export const WIN_SCORE = 5 // Pontos necessários para vencer
export const CARDS_PER_PLAYER = 6 // Quantas cartas cada jogador recebe por partida
export const OPPONENT_PICK_TIMEOUT_MS = 10_000

// =============================================================================
// DADOS DAS LINGUAGENS
//
// CRITÉRIOS DE BALANCEAMENTO (escala 0–100):
//
// performance   → velocidade de execução e eficiência de memória (benchmark real)
// facilidade    → curva de aprendizado + DX no dia a dia (não só sintaxe inicial)
// mercado       → volume de vagas ativas, salário médio e diversidade de setores
// complexidade  → profundidade conceitual, edge cases, manutenção de projetos grandes
// popularidade  → presença no GitHub, Stack Overflow, comunidade ativa, memes 😄
//
// MUDANÇAS EM RELAÇÃO À VERSÃO ANTERIOR (anotadas inline):
// =============================================================================
export const LANGUAGES = [
  {
    name: "JavaScript",
    personality: "O rei do caos organizado 👑",
    // Sem mudanças — números já representam bem a realidade.
    // Performance 70 é honesto: V8 é rápido para a categoria, mas não compete com C/Go.
    // Facilidade 85: fácil de começar, difícil de dominar (assincronismo, this, etc.) — ok.
    stats: { performance: 70, facilidade: 85, mercado: 95, complexidade: 60, popularidade: 98 }
  },
  {
    name: "Python",
    personality: "Simples, poderoso e amado por todos 🐍",
    // performance: 55 (era 65) — CPython é notoriamente lento; benchmarks colocam 10–50x
    //   mais lento que C/Go. 65 era generoso demais.
    // facilidade: 92 (era 95) — ainda altíssima, mas 95 rivalizava com "escrever inglês".
    //   Async, decoradores e tipagem opcional adicionam fricção real.
    stats: { performance: 55, facilidade: 92, mercado: 92, complexidade: 50, popularidade: 97 }
  },
  {
    name: "Java",
    personality: "Verbosidade é meu sobrenome ☕",
    // facilidade: 55 (era 60) — boilerplate, generics, checked exceptions, configuração de
    //   Maven/Gradle; é mais difícil do que o 60 sugeria para quem está começando.
    // complexidade: 78 (era 75) — JVM tuning, concorrência, frameworks corporativos.
    stats: { performance: 80, facilidade: 55, mercado: 90, complexidade: 78, popularidade: 85 }
  },
  {
    name: "Go",
    personality: "Simples, rápido e direto ao ponto 🚀",
    // facilidade: 82 (era 75) — Go foi projetado para ser aprendido em dias; a ausência de
    //   herança, generics simples e tooling excelente tornam a curva muito suave.
    // mercado: 82 (era 78) — crescimento forte em cloud/infra; Kubernetes, Docker, Terraform
    //   são Go. Vagas aumentaram bastante nos últimos anos.
    stats: { performance: 88, facilidade: 82, mercado: 82, complexidade: 55, popularidade: 72 }
  },
  {
    name: "Rust",
    personality: "Sem erros… depois de sofrer 😅",
    // facilidade: 30 (era 40) — borrow checker, lifetimes, traits: Rust tem a curva de
    //   aprendizado mais íngreme entre as linguagens modernas. 40 era otimista.
    // mercado: 72 (era 75) — crescendo (Mozilla, Linux kernel, AWS), mas ainda nicho.
    stats: { performance: 95, facilidade: 30, mercado: 72, complexidade: 92, popularidade: 65 }
  },
  {
    name: "C#",
    personality: "O queridinho da Microsoft 💚",
    // Sem mudanças significativas — bem balanceado. C# tem facilidade real de ~70
    //   (LINQ, async/await maduro, ótima IDE) e mercado forte em .NET/enterprise/games.
    stats: { performance: 82, facilidade: 70, mercado: 85, complexidade: 65, popularidade: 80 }
  },
  {
    name: "TypeScript",
    personality: "JavaScript com disciplina 😎",
    // facilidade: 65 (era 70) — TS adiciona uma camada real de complexidade sobre JS:
    //   generics, utility types, decoradores, configuração do tsconfig. Não é trivial.
    // complexidade: 68 (era 65) — sistema de tipos estrutural com muitas nuances.
    stats: { performance: 75, facilidade: 65, mercado: 88, complexidade: 68, popularidade: 90 }
  },
  {
    name: "PHP",
    personality: "Todo mundo usa, ninguém admite 😂",
    // performance: 72 (era 68) — PHP 8.x com JIT melhorou bastante; não é mais tão lento.
    // facilidade: 82 (era 80) — ainda uma das mais fáceis para web: deploy trivial, curva
    //   suave, Laravel é bem documentado.
    // mercado: 80 (era 85) — WordPress domina 43% da web, mas vagas de qualidade caíram;
    //   não compete mais com JS/Python em startups modernas.
    stats: { performance: 72, facilidade: 82, mercado: 80, complexidade: 55, popularidade: 75 }
  },
  {
    name: "C",
    personality: "Raiz, sem frescura 💀",
    // Sem mudanças — C já está bem calibrado.
    // performance 98 é correto (só perde para Assembly).
    // facilidade 40 reflete gestão manual de memória, ponteiros, UB.
    stats: { performance: 98, facilidade: 40, mercado: 70, complexidade: 95, popularidade: 72 }
  },
  {
    name: "C++",
    personality: "Poder absoluto… com sofrimento 😈",
    // Sem mudanças — C++ já estava bem calibrado.
    // complexidade 98 é justo: templates, RAII, move semantics, UB, ABI hell.
    stats: { performance: 97, facilidade: 35, mercado: 78, complexidade: 98, popularidade: 74 }
  },
  {
    name: "Kotlin",
    personality: "Android moderno e elegante 📱",
    // mercado: 75 (era 82) — forte em Android, mas fora disso o mercado é limitado.
    //   Java ainda domina backend enterprise; Kotlin server-side é crescente mas nicho.
    // facilidade: 76 (era 78) — coroutines e o sistema de tipos nullable adicionam
    //   complexidade que o 78 subestimava.
    stats: { performance: 80, facilidade: 76, mercado: 75, complexidade: 62, popularidade: 74 }
  },
  {
    name: "Swift",
    personality: "Apple vibes 🍎",
    // mercado: 72 (era 80) — mercado iOS é lucrativo, mas geograficamente concentrado
    //   e dependente do ecossistema Apple. 80 inflava demais a diversidade de vagas.
    // facilidade: 72 (era 75) — Optionals, protocolo-orientação e SwiftUI têm curva real.
    stats: { performance: 85, facilidade: 72, mercado: 72, complexidade: 62, popularidade: 73 }
  },
  {
    name: "Ruby",
    personality: "Produtividade acima de tudo 💎",
    // mercado: 70 (era 65) — Ruby/Rails ainda tem mercado relevante, especialmente no
    //   exterior (EUA, Europa). Startups como Shopify, GitHub, Basecamp. 65 era pessimista.
    // performance: 58 (era 60) — honestidade: Ruby é uma das mais lentas em produção.
    stats: { performance: 58, facilidade: 88, mercado: 70, complexidade: 50, popularidade: 68 }
  },
  {
    name: "Scala",
    personality: "Funcional, complexo e poderoso 🧠",
    // Sem mudanças — Scala está bem calibrado.
    // complexidade 88 é justo: implicits, type system avançado, duas paradigmas fundidas.
    stats: { performance: 85, facilidade: 45, mercado: 60, complexidade: 88, popularidade: 55 }
  },
  {
    name: "Dart",
    personality: "Flutter é minha casa 🎯",
    // mercado: 65 (era 70) — Dart fora do Flutter é praticamente inexistente.
    //   O mercado é real mas muito concentrado em mobile cross-platform.
    // facilidade: 80 (era 82) — Flutter tem curva de aprendizado de widgets que
    //   não é tão suave quanto parece inicialmente.
    stats: { performance: 78, facilidade: 80, mercado: 65, complexidade: 55, popularidade: 70 }
  },
  {
    name: "Lua",
    personality: "Pequena, leve e ninja 🥷",
    // facilidade: 72 (era 85) — a sintaxe básica é simples, mas o ecossistema é árido,
    //   índices começam em 1, metatables são contraintuitivas. 85 rivalizava com Python,
    //   o que é um exagero enorme para quem usa Lua no mundo real.
    // mercado: 48 (era 55) — Lua é nichos específicos: jogos (Roblox, WoW), Nginx,
    //   Redis scripting. Vagas abertas são raras.
    stats: { performance: 82, facilidade: 72, mercado: 48, complexidade: 45, popularidade: 58 }
  },
  {
    name: "COBOL",
    personality: "Eu movo bilhões diariamente 🏦",
    // mercado: 72 (era 85) — as vagas existem (bancos, governo), mas são nichos muito
    //   específicos e geograficamente concentrados. 85 colocava COBOL acima de Go e Ruby,
    //   o que distorcia muito perguntas de carreira.
    // performance: 70 (era 75) — COBOL moderno não é lento, mas também não é rápido.
    //   70 é mais honesto para batch processing típico.
    stats: { performance: 70, facilidade: 30, mercado: 72, complexidade: 80, popularidade: 40 }
  },
  {
    name: "Elixir",
    personality: "Concorrência é meu forte 🔥",
    // facilidade: 60 (era 65) — paradigma funcional + OTP + pattern matching têm
    //   curva real para quem vem de linguagens imperativas.
    // mercado: 58 (era 60) — crescendo, mas ainda muito nicho. Phoenix é excelente
    //   mas não compete em volume de vagas com Rails ou Django.
    stats: { performance: 85, facilidade: 60, mercado: 58, complexidade: 72, popularidade: 55 }
  },
  {
    name: "Haskell",
    personality: "Se não for puro, nem compila 🤓",
    // Sem mudanças — Haskell já está bem calibrado.
    // facilidade 30 e complexidade 95 são justos: mônadas, lazy evaluation, type classes.
    stats: { performance: 80, facilidade: 30, mercado: 50, complexidade: 95, popularidade: 45 }
  },
  {
    name: "Perl",
    personality: "Legível? Nunca ouvi falar 🕵️",
    // mercado: 38 (era 45) — Perl está em franca decadência. Vagas existem apenas
    //   em sistemas legados de telecom e bioinformática. 45 era otimista.
    // popularidade: 32 (era 38) — TIOBE e Stack Overflow mostram queda consistente.
    stats: { performance: 72, facilidade: 35, mercado: 38, complexidade: 85, popularidade: 32 }
  },
  {
    name: "R",
    personality: "Estatístico e orgulhoso disso 📊",
    // facilidade: 55 (era 60) — R tem peculiaridades reais: indexação 1-based,
    //   vetorização implícita, múltiplos sistemas de objetos (S3/S4/R5). Não é tão
    //   fácil quanto o 60 sugeria fora do contexto de análise de dados.
    // mercado: 68 (era 70) — Python comeu boa parte do mercado de data science de R.
    stats: { performance: 55, facilidade: 55, mercado: 68, complexidade: 65, popularidade: 62 }
  },
  {
    name: "Groovy",
    personality: "Java, mas na versão cool 😎",
    // mercado: 48 (era 55) — Groovy vive principalmente no contexto de Gradle e Jenkins.
    //   Fora disso, raramente aparece em vagas novas.
    stats: { performance: 68, facilidade: 75, mercado: 48, complexidade: 55, popularidade: 45 }
  },
  {
    name: "Objective-C",
    personality: "Aposentado, mas não esquecido 👴",
    // mercado: 38 (era 45) — praticamente só manutenção de apps iOS legados.
    //   Novos projetos usam Swift. 45 era generoso.
    stats: { performance: 82, facilidade: 38, mercado: 38, complexidade: 80, popularidade: 35 }
  },
  {
    name: "OCaml",
    personality: "Funcional com sotaque francês 🥐",
    // performance: 87 (era 83) — OCaml tem performance excelente, comparável a Go/Java.
    //   Usado no compilador do Flow e no sistema de tipos do Rust original. 83 subestimava.
    stats: { performance: 87, facilidade: 38, mercado: 42, complexidade: 88, popularidade: 36 }
  },
  {
    name: "Zig",
    personality: "C moderno sem desculpa 🔩",
    // facilidade: 42 (era 45) — comptime, manual memory, sem hidden control flow:
    //   Zig é deliberadamente explícito, o que é poderoso mas difícil.
    // mercado: 32 (era 35) — crescendo (Bun é escrito em Zig), mas ainda muito early.
    stats: { performance: 96, facilidade: 42, mercado: 32, complexidade: 82, popularidade: 42 }
  },
  {
    name: "Nim",
    personality: "Rápido, elegante e incompreendido 🌙",
    // Sem mudanças — Nim já estava calibrado de forma realista.
    stats: { performance: 90, facilidade: 60, mercado: 28, complexidade: 65, popularidade: 32 }
  },
  {
    name: "Clojure",
    personality: "Lisp na JVM, niche máximo 🌀",
    // facilidade: 32 (era 35) — Lisp syntax (parênteses), imutabilidade por padrão,
    //   modelo de concorrência com STM: barreira de entrada alta mesmo para devs experientes.
    stats: { performance: 75, facilidade: 32, mercado: 48, complexidade: 90, popularidade: 40 }
  },
  {
    name: "Erlang",
    personality: "99,9999% de uptime não é brincadeira ☎️",
    // Sem mudanças — bem calibrado. facilidade 32 e complexidade 88 são realistas
    //   para o modelo de atores e a sintaxe incomum.
    stats: { performance: 78, facilidade: 32, mercado: 45, complexidade: 88, popularidade: 37 }
  },
  {
    name: "Julia",
    personality: "Python rápido para quem sabe matemática 🔢",
    // facilidade: 65 (era 68) — Julia parece Python na superfície, mas multiple dispatch,
    //   macros e o sistema de tipos são conceitos não triviais.
    // mercado: 52 (era 55) — cresceu em ciência/academia mas não em indústria geral.
    stats: { performance: 91, facilidade: 65, mercado: 52, complexidade: 62, popularidade: 50 }
  },
  {
    name: "Solidity",
    personality: "Dinheiro na blockchain, bugs também 💸",
    // performance: 45 (era 60) — EVM é inerentemente lento; gas costs limitam o que
    //   você pode computar. 60 era muito generoso para um runtime de blockchain.
    // mercado: 62 (era 65) — mercado crypto volátil; vagas diminuíram após 2022.
    stats: { performance: 45, facilidade: 48, mercado: 62, complexidade: 78, popularidade: 58 }
  },
  {
    name: "Bash",
    personality: "Cola o universo Unix 🐚",
    // facilidade: 45 (era 50) — Bash parece simples mas é cheio de armadilhas:
    //   quoting hell, word splitting, arrays associativos, portabilidade sh vs bash.
    //   Escrever Bash seguro é genuinamente difícil.
    // complexidade: 75 (era 70) — scripts grandes em Bash ficam incompreensíveis rápido.
    stats: { performance: 60, facilidade: 45, mercado: 72, complexidade: 75, popularidade: 75 }
  },
  {
    name: "Crystal",
    personality: "Ruby compilado, sonho ou ilusão? 💎",
    // Sem mudanças — Crystal já estava bem calibrado para uma linguagem de nicho
    //   com ótima performance mas mercado quase inexistente.
    stats: { performance: 88, facilidade: 72, mercado: 30, complexidade: 60, popularidade: 35 }
  },
  {
    name: "Fortran",
    personality: "Mais velho que seu avô e mais rápido 🚀",
    // mercado: 35 (era 40) — Fortran existe em HPC/clima/física computacional.
    //   É real, mas extremamente nicho. 40 era levemente otimista.
    stats: { performance: 94, facilidade: 28, mercado: 35, complexidade: 78, popularidade: 30 }
  },
]

// =============================================================================
// PERGUNTAS DA RODADA
// Sorteadas aleatoriamente a cada rodada para manter a variedade.
// =============================================================================
export const QUESTIONS = [
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

// =============================================================================
// PESOS DAS PERGUNTAS
//
// CONVENÇÃO:
//   Peso positivo  → stat alto favorece ganhar a pergunta
//   Peso negativo  → stat alto prejudica (linguagem "vence" sendo a pior)
//
// OBJETIVO CULTURAL para perguntas polêmicas: o resultado deve bater com o que
//   devs brasileiros responderiam numa discussão no Twitter/Discord.
//   PHP, JavaScript e COBOL devem "vencer" perguntas negativas sobre legado/gambiarra;
//   Haskell/Rust/C++ devem vencer as de dificuldade e nerds; Python/JS as de hype.
// =============================================================================
export const QUESTION_WEIGHTS = {

  // ---------------------------------------------------------------------------
  // MERCADO E CARREIRA
  // ---------------------------------------------------------------------------

  "Qual linguagem tem mais vagas no mercado?": { mercado: 1 },

  // Salário alto → mercado forte + complexidade (especialistas em linguagens difíceis pagam mais)
  "Qual linguagem paga melhor atualmente?": { mercado: 0.6, complexidade: 0.4 },

  // Primeiro emprego → facilidade de aprender + mercado de entrada (não salário sênior)
  "Qual linguagem é melhor para conseguir o primeiro emprego?": { facilidade: 0.6, mercado: 0.4 },

  // Grandes empresas valorizam performance e mercado consolidado, não só popularidade
  "Qual linguagem é mais valorizada em grandes empresas?": { mercado: 0.5, performance: 0.3, complexidade: 0.2 },

  // Startups: velocidade de entrega + ecossistema de libs, não performance bruta
  "Qual linguagem é mais usada em startups?": { popularidade: 0.5, facilidade: 0.3, mercado: 0.2 },

  // Crescimento → popularidade crescente + mercado em expansão
  "Qual linguagem tem maior crescimento nos últimos anos?": { popularidade: 0.6, mercado: 0.4 },

  // Remoto: linguagens com mercado global forte + comunidade internacional ativa
  "Qual linguagem tem mais oportunidades remotas?": { mercado: 0.6, popularidade: 0.4 },

  // Internacional: mercado externo = mercado alto + reconhecimento global
  "Qual linguagem tem mais demanda internacional?": { mercado: 0.7, popularidade: 0.3 },

  // Estabilidade de carreira: linguagens que não morrem (mercado consolidado + não-nicho)
  // COBOL e Java devem vencer aqui, não JavaScript ou Python que mudam rápido
  "Qual linguagem garante carreira mais estável?": { mercado: 0.7, complexidade: 0.3 },

  // Difícil de substituir por IA: linguagens de baixo nível e alta complexidade
  // C, C++, Rust, Assembly são os mais difíceis de automatizar
  "Qual linguagem é mais difícil de substituir por IA?": { performance: 0.4, complexidade: 0.6 },

  // Exterior: mercado com demanda internacional forte + comunidade global
  "Qual linguagem mais abre portas no exterior?": { mercado: 0.6, popularidade: 0.4 },

  // Virar legado: linguagens antigas, muito usadas em sistemas velhos e difíceis de migrar
  // COBOL, Java, PHP, C devem vencer aqui
  "Qual linguagem tem mais chance de virar legado?": { mercado: 0.4, complexidade: 0.3, facilidade: -0.3 },

  // Crescimento Brasil: mercado nacional + popularidade local (PHP, Python, JS dominam)
  "Qual linguagem mais cresce no Brasil?": { mercado: 0.5, popularidade: 0.5 },

  // Entrevistas técnicas: linguagens que as grandes empresas pedem (Java, Python, JS, C++)
  "Qual linguagem mais aparece em entrevistas técnicas?": { mercado: 0.5, popularidade: 0.5 },

  // Reprovação em entrevistas: linguagens difíceis que as empresas pedem mas são hard
  // C++, Rust, Haskell, Scala devem vencer
  "Qual linguagem mais reprova candidatos em entrevistas?": { complexidade: 0.7, facilidade: -0.3 },

  // ---------------------------------------------------------------------------
  // EXPERIÊNCIA DE DESENVOLVIMENTO
  // ---------------------------------------------------------------------------

  // Diversão: facilidade alta + baixa frustração (complexidade baixa)
  "Qual linguagem é mais divertida de programar?": { facilidade: 0.6, complexidade: -0.4 },

  // Melhor sintaxe: facilidade de leitura + baixa cerimônia
  "Qual linguagem tem a melhor sintaxe?": { facilidade: 0.8, complexidade: -0.2 },

  // Elegância na cultura dev = expressividade + código limpo (Ruby, Elixir, Haskell ganham)
  // NÃO é sobre performance — C++ elegante seria ofensivo para qualquer dev
  "Qual linguagem é mais elegante?": { facilidade: 0.5, complexidade: -0.3, popularidade: 0.2 },

  // Produtividade: facilidade + performance (entregar rápido E o resultado ser bom)
  "Qual linguagem é mais produtiva para desenvolvedores?": { facilidade: 0.6, performance: 0.4 },

  // Menos boilerplate: facilidade alta, complexidade baixa (Python, Ruby, Elixir ganham)
  "Qual linguagem tem menos código boilerplate?": { facilidade: 0.8, complexidade: -0.2 },

  // Agradável de manter: facilidade de leitura + ecossistema maduro
  "Qual linguagem é mais agradável de manter?": { facilidade: 0.5, complexidade: -0.3, popularidade: 0.2 },

  // Debugar: tooling maduro (popularidade) + sintaxe clara (facilidade)
  "Qual linguagem é mais fácil de debugar?": { facilidade: 0.5, popularidade: 0.3, complexidade: -0.2 },

  // Melhores ferramentas: ecossistema rico + mercado que justifica investimento em tooling
  "Qual linguagem tem as melhores ferramentas?": { popularidade: 0.6, mercado: 0.4 },

  // Dor de cabeça baixa: facilidade alta + baixa complexidade
  "Qual linguagem dá menos dor de cabeça?": { facilidade: 0.7, complexidade: -0.3 },

  // Sentir mais inteligente: linguagens difíceis e elegantes (Haskell, Rust, C, APL)
  "Qual linguagem faz você se sentir mais inteligente?": { complexidade: 0.7, performance: 0.3 },

  // Cansa menos: facilidade no cotidiano + ferramentas que não travam você
  "Qual linguagem cansa menos no dia a dia?": { facilidade: 0.6, complexidade: -0.4 },

  // Autocomplete: linguagens com tipagem forte têm melhor autocomplete (TypeScript, C#, Java)
  "Qual linguagem tem o melhor autocomplete?": { facilidade: 0.3, popularidade: 0.4, complexidade: 0.3 },

  // Satisfatória de escrever: subjetivo, mas tende a linguagens com boa DX
  "Qual linguagem é mais satisfatória de escrever?": { facilidade: 0.5, complexidade: -0.2, popularidade: 0.3 },

  // Erros confusos: linguagens onde os erros de compilação/runtime são crípticos
  // C++, Haskell, Scala, Rust têm os erros mais famosos por serem confusos
  "Qual linguagem tem os erros mais confusos?": { complexidade: 0.7, facilidade: -0.3 },

  // ---------------------------------------------------------------------------
  // APRENDIZADO
  // ---------------------------------------------------------------------------

  "Qual linguagem é mais fácil para iniciantes?": { facilidade: 1 },

  "Qual linguagem é mais difícil de dominar?": { complexidade: 0.8, facilidade: -0.2 },

  // Documentação: comunidade grande gera mais docs (Python, MDN para JS são referência)
  "Qual linguagem tem melhor documentação?": { popularidade: 0.7, mercado: 0.3 },

  // Aprender programação: facilidade + boas práticas embutidas (não JS com suas pegadinhas)
  "Qual linguagem é melhor para aprender programação?": { facilidade: 0.7, complexidade: -0.3 },

  // Ensinar lógica: linguagens que forçam pensar (C, Java, Haskell, Python)
  // Não é sobre facilidade, é sobre estrutura e clareza de conceitos
  "Qual linguagem ensina melhor lógica de programação?": { complexidade: 0.4, performance: 0.3, facilidade: 0.3 },

  // Material de estudo: YouTube, livros, cursos — claramente Python e JS dominam
  "Qual linguagem tem mais material de estudo?": { popularidade: 1 },

  "Qual linguagem é mais intuitiva?": { facilidade: 0.9, complexidade: -0.1 },

  "Qual linguagem tem a curva de aprendizado mais suave?": { facilidade: 1 },

  // Desmotivar iniciantes: dificuldade alta + mercado que pode parecer inacessível
  // C++, Haskell, Rust são os campeões aqui
  "Qual linguagem mais desmotiva iniciantes?": { complexidade: 0.7, facilidade: -0.3 },

  // Parece fácil mas não é: alta facilidade aparente mas complexidade escondida
  // JavaScript é o caso clássico (fácil entrar, difícil dominar)
  "Qual linguagem parece fácil mas não é?": { facilidade: 0.6, complexidade: 0.4 },

  // Boas práticas: linguagens que forçam ou incentivam código limpo
  // Python (PEP8), Rust (ownership), Go (gofmt), Haskell (pureza)
  "Qual linguagem mais ensina boas práticas?": { complexidade: 0.4, facilidade: 0.3, performance: 0.3 },

  // Confunde iniciantes: complexidade alta + baixa facilidade + pouca documentação amigável
  "Qual linguagem mais confunde quem está começando?": { complexidade: 0.6, facilidade: -0.4 },

  // ---------------------------------------------------------------------------
  // ECOSSISTEMA
  // ---------------------------------------------------------------------------

  // Comunidade: popularidade é o fator dominante aqui
  "Qual linguagem tem melhor comunidade?": { popularidade: 0.8, mercado: 0.2 },

  // Bibliotecas: Python (pip), JS (npm) dominam em volume puro
  "Qual linguagem tem mais bibliotecas disponíveis?": { popularidade: 0.9, mercado: 0.1 },

  "Qual linguagem tem o melhor ecossistema?": { popularidade: 0.6, mercado: 0.4 },

  // Melhores frameworks: qualidade + adoção = popularidade + performance do resultado
  "Qual linguagem tem os melhores frameworks?": { popularidade: 0.5, performance: 0.3, mercado: 0.2 },

  // Evolui mais rápido: linguagens com comunidade ativa e empresa por trás
  "Qual linguagem evolui mais rápido?": { popularidade: 0.5, mercado: 0.5 },

  "Qual linguagem tem as melhores ferramentas open source?": { popularidade: 0.8, mercado: 0.2 },

  "Qual linguagem tem mais suporte da comunidade?": { popularidade: 1 },

  // Libs confiáveis: ecossistema maduro = popularidade + mercado consolidado
  "Qual linguagem tem as libs mais confiáveis?": { popularidade: 0.5, mercado: 0.3, performance: 0.2 },

  // Dependências inúteis: npm é o meme aqui — JS/Node ganham com folga
  // popularidade alta + facilidade excessiva = ecossistema de micro-pacotes absurdos
  "Qual linguagem tem mais dependências inúteis?": { popularidade: 0.7, facilidade: 0.3 },

  // Problemas de versão: linguagens com ecossistemas grandes e mudanças frequentes
  // Python (pip hell, 2 vs 3), Node (npm conflicts), PHP (Composer) são os top
  "Qual linguagem tem mais problemas de versão?": { popularidade: 0.6, complexidade: 0.4 },

  // Ecossistema bagunçado: muitas libs concorrentes + mudanças de paradigma frequentes
  // JavaScript/Node são o exemplo clássico aqui
  "Qual linguagem tem o ecossistema mais bagunçado?": { popularidade: 0.5, complexidade: 0.3, facilidade: -0.2 },

  // ---------------------------------------------------------------------------
  // APLICAÇÕES
  // ---------------------------------------------------------------------------

  // Backend: performance + mercado + capacidade de projetos complexos
  "Qual linguagem é melhor para backend?": { performance: 0.4, mercado: 0.4, complexidade: 0.2 },

  // Web: popularidade + mercado web (JS/TS dominam front+back, PHP ainda domina hosting)
  "Qual linguagem é melhor para sistemas web?": { popularidade: 0.5, mercado: 0.5 },

  // APIs: performance + facilidade de desenvolvimento + ecossistema de frameworks
  "Qual linguagem é melhor para APIs?": { performance: 0.5, facilidade: 0.3, mercado: 0.2 },

  // Automação: facilidade de scripting + libs disponíveis (Python domina)
  "Qual linguagem é melhor para automação?": { facilidade: 0.6, popularidade: 0.4 },

  // Microserviços: performance + concorrência + tooling cloud (Go, Java, Node)
  "Qual linguagem é melhor para microserviços?": { performance: 0.5, mercado: 0.3, facilidade: 0.2 },

  // Cloud: mercado cloud + performance (Go, Python, JS são os mais usados em cloud)
  "Qual linguagem é melhor para cloud?": { mercado: 0.5, performance: 0.3, popularidade: 0.2 },

  // Projetos grandes: linguagens com tipagem forte e refatoração segura
  "Qual linguagem é melhor para projetos grandes?": { complexidade: 0.3, performance: 0.3, mercado: 0.4 },

  // Escala: performance + concorrência + mercado de infra
  "Qual linguagem escala melhor?": { performance: 0.6, mercado: 0.4 },

  "Qual linguagem é melhor para alta performance?": { performance: 1 },

  // Sistemas críticos: performance + segurança de memória + confiabilidade
  "Qual linguagem é melhor para sistemas críticos?": { performance: 0.5, complexidade: 0.3, facilidade: -0.2 },

  // Projetos rápidos: facilidade de início + libs disponíveis
  "Qual linguagem é melhor para projetos rápidos?": { facilidade: 0.6, popularidade: 0.4 },

  // MVP: máxima velocidade de entrega — Python, Ruby, JS ganham
  "Qual linguagem é melhor para MVP?": { facilidade: 0.7, popularidade: 0.3 },

  // Freelas: mercado + facilidade (PHP e JS dominam o mercado de freela web)
  "Qual linguagem é melhor para freelas?": { mercado: 0.5, facilidade: 0.5 },

  // Side projects: facilidade + libs para experimentar rapidamente
  "Qual linguagem é melhor para side projects?": { facilidade: 0.6, popularidade: 0.4 },

  // ---------------------------------------------------------------------------
  // POLÊMICAS (critério cultural: o resultado deve bater com o senso comum dos devs)
  // ---------------------------------------------------------------------------

  // "Desaparecer": não é sobre quem tem piores stats genéricos, é sobre quem os devs
  // gostariam de banir. PHP, COBOL, Perl são as respostas culturalmente esperadas.
  // Alta popularidade + baixa performance = linguagem que "não merece" sua ubiquidade
  "Qual linguagem deveria desaparecer?": { popularidade: 0.4, performance: -0.4, facilidade: -0.2 },

  // Superestimada: muito hype (popularidade alta) mas entrega pouco (performance baixa)
  // JavaScript é o caso clássico; Python em ML também aparece bastante
  "Qual linguagem é mais superestimada?": { popularidade: 0.8, performance: -0.2 },

  // Pior sintaxe: baixa facilidade + alta complexidade visual (C++, Perl, COBOL ganham)
  "Qual linguagem tem a pior sintaxe?": { facilidade: -0.6, complexidade: 0.4 },

  // Código feio: linguagens muito populares e sem enforcement de estilo geram mais código ruim
  // PHP e JavaScript são os reis do código feio na internet
  "Qual linguagem tem mais código feio na internet?": { popularidade: 0.5, facilidade: 0.3, performance: -0.2 },

  // Piores projetos: linguagens fáceis sem disciplina geram projetos ruins em escala
  "Qual linguagem cria os piores projetos?": { facilidade: 0.5, popularidade: 0.3, performance: -0.2 },

  // Devs fanáticos: comunidades com maior identidade ideológica
  // Rust (evangelistas), Python (puristas), JavaScript (amor-ódio)
  "Qual linguagem tem os desenvolvedores mais fanáticos?": { popularidade: 0.6, complexidade: 0.4 },

  // Comunidade tóxica: onde o hype cria mais arrogância e gatekeeping
  "Qual linguagem tem a comunidade mais tóxica?": { popularidade: 0.7, complexidade: 0.3 },

  // Bugs em produção: facilidade excessiva + tipagem fraca = mais bugs
  // JavaScript (type coercion), PHP (inconsistências), Python (dinâmico)
  "Qual linguagem gera mais bugs em produção?": { facilidade: 0.4, popularidade: 0.4, performance: -0.2 },

  // Devs arrogantes: linguagens difíceis criam "sobreviventes" que se sentem superiores
  // C++, Haskell, Rust têm reputação de comunidades arrogantes
  "Qual linguagem tem os desenvolvedores mais arrogantes?": { complexidade: 0.7, performance: 0.3 },

  // Dev que se acha sênior: linguagens populares onde a barreira de entrada é baixa
  // JavaScript é o ícone aqui — qualquer um pode colocar no currículo
  "Qual linguagem tem mais dev que se acha senior?": { popularidade: 0.7, facilidade: 0.3 },

  // Copia do StackOverflow: linguagens com mais perguntas/respostas disponíveis
  "Qual linguagem tem mais dev que só copia do StackOverflow?": { popularidade: 0.8, facilidade: 0.2 },

  // Cursos com promessa falsa: linguagens que viram produto de marketing
  // Python (ML com 2 semanas) e JavaScript (dev em 30 dias) são os top
  "Qual linguagem tem mais cursos vendendo promessa falsa?": { popularidade: 0.9, facilidade: 0.1 },

  // Mais hype do que resultado: popularidade desproporcional à performance real
  "Qual linguagem tem mais hype do que resultado?": { popularidade: 0.7, performance: -0.3 },

  // Devs preguiçosos: facilidade máxima = linguagem que não te força a pensar
  "Qual linguagem é mais usada por devs preguiçosos?": { facilidade: 0.8, complexidade: -0.2 },

  // Difíceis de manter: complexidade alta + sintaxe não padronizada
  "Qual linguagem gera os sistemas mais difíceis de manter?": { complexidade: 0.6, facilidade: -0.4 },

  // Projetos bagunçados: facilidade excessiva + sem disciplina de projeto
  "Qual linguagem gera os projetos mais bagunçados?": { facilidade: 0.5, popularidade: 0.3, complexidade: 0.2 },

  // Spaghetti code: linguagens permissivas e muito populares (PHP, JS, Python)
  "Qual linguagem vira mais 'spaghetti code'?": { facilidade: 0.6, popularidade: 0.4 },

  // Dependências quebradas: ecossistemas com muitas libs e atualizações frequentes
  // npm/Node é o meme definitivo aqui
  "Qual linguagem mais sofre com dependências quebradas?": { popularidade: 0.7, facilidade: 0.3 },

  // Piores frameworks: popularidade alta gera mais frameworks medíocres concorrendo
  "Qual linguagem tem os piores frameworks?": { popularidade: 0.6, facilidade: 0.4 },

  // Gambiarra em produção: linguagens permissivas e com muito código legado
  "Qual linguagem tem mais 'gambiarra' em produção?": { facilidade: 0.5, popularidade: 0.4, performance: -0.1 },

  // Virar meme: popularidade + frustrações conhecidas = mais material para meme
  "Qual linguagem mais vira meme entre devs?": { popularidade: 0.8, facilidade: 0.2 },

  // Engana no currículo: linguagens onde é fácil colocar "experiente" sem ser
  "Qual linguagem mais engana no currículo?": { facilidade: 0.5, popularidade: 0.5 },

  // Parece fácil mas vira pesadelo: alta aparência de facilidade + complexidade real alta
  "Qual linguagem mais parece fácil mas vira pesadelo?": { facilidade: 0.5, complexidade: 0.5 },

  // Faz questionar a vida: linguagens que fazem o dev sofrer mais
  // C++, Haskell, Rust, COBOL são os campeões
  "Qual linguagem mais te faz questionar a vida?": { complexidade: 0.7, facilidade: -0.3 },

  // ---------------------------------------------------------------------------
  // CURIOSIDADES / HUMOR
  // ---------------------------------------------------------------------------

  // Memes fortes: popularidade é o único fator — quem tem mais devs tem mais memes
  "Qual linguagem tem os memes mais fortes?": { popularidade: 0.8, facilidade: 0.2 },

  // Devs nerds: linguagens que atraem perfis técnicos profundos
  // Haskell, Rust, C++, OCaml, Lisp são os ícones
  "Qual linguagem tem os devs mais nerds?": { complexidade: 0.8, performance: 0.2 },

  // YouTube: correlação direta com popularidade
  "Qual linguagem mais aparece em tutorial no YouTube?": { popularidade: 1 },

  // Puristas: linguagens com filosofia forte onde desvios são "pecado"
  // Haskell (pureza funcional), Rust (ownership), Go (gofmt), Python (Zen of Python)
  "Qual linguagem tem os devs mais puristas?": { complexidade: 0.6, performance: 0.4 },

  // Religiosos: combinação de popularidade + identidade ideológica forte
  "Qual linguagem tem os devs mais religiosos?": { popularidade: 0.5, complexidade: 0.5 },

  // Gambiarra: facilidade excessiva + sem tipagem rígida permite mais gambiarras
  "Qual linguagem é mais 'gambiarra'?": { facilidade: 0.7, performance: -0.3 },

  // Mágica demais: abstrações que escondem o que está acontecendo
  // Python (decoradores mágicos), Ruby (metaprogramação), JavaScript (type coercion)
  "Qual linguagem parece mágica demais?": { facilidade: 0.5, complexidade: -0.3, popularidade: 0.2 },

  // Difícil de refatorar: complexidade + falta de tipagem segura
  "Qual linguagem é mais difícil de refatorar?": { complexidade: 0.5, facilidade: -0.3, performance: 0.2 },

  // Esconde bugs: tipagem fraca + muita magia implícita
  // JavaScript (coerção de tipos), PHP (comparações malucas) são os clássicos
  "Qual linguagem mais esconde bugs?": { facilidade: 0.5, complexidade: -0.3, performance: -0.2 },

  // Quebra em produção: baixa performance + imprevisibilidade
  "Qual linguagem mais quebra em produção?": { performance: -0.5, facilidade: 0.3, complexidade: 0.2 },

  // Nomes estranhos de variável: linguagens sem enforcement + comunidades permissivas
  "Qual linguagem tem os nomes de variável mais estranhos?": { facilidade: 0.6, complexidade: 0.4 },

  // Códigos ilegíveis: baixa facilidade de leitura + alta expressividade condensada
  // Perl, APL, C++, Haskell são campeões históricos
  "Qual linguagem tem os códigos mais ilegíveis?": { complexidade: 0.6, facilidade: -0.4 },

  // Commits estranhos: associação com culturas de dev específicas — humor/nicho
  "Qual linguagem tem os commits mais estranhos?": { complexidade: 0.4, popularidade: 0.6 },

  // Devs noturnos: linguagens de nicho/técnicas têm mais devs apaixonados que programam de madrugada
  "Qual linguagem tem os devs mais noturnos?": { complexidade: 0.7, popularidade: 0.3 },

  // GitHub: dominância em repositórios públicos — JS e Python dominam
  "Qual linguagem domina mais o GitHub?": { popularidade: 1 },
}