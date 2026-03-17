# Battle.dev

Jogo multiplayer (2 jogadores) em tempo real via WebSocket, com cartas de linguagens de programação.

## Requisitos

- Node.js 18+ (recomendado)
- npm

## Rodando localmente

1. Instale as dependências:
   - `npm install`
2. Suba o servidor:
   - `npm run dev`
3. Abra no navegador:
   - `http://localhost:3000`

Dica: para testar multiplayer local, abra a URL em duas abas/janelas.

## Scripts

- `npm start` — inicia o servidor (`server.js`)
- `npm run dev` — atalho para iniciar o servidor em modo dev
- `npm test` — roda testes automatizados (Vitest)
- `npm run test:coverage` — gera relatório de coverage em `coverage/`
- `npm run rebalance` — roda simulação (vencedor por pergunta + perguntas mais apertadas)
- `npm run rebalance:suggest` — sugere rebalanceamento automático dos `stats` (não aplica automaticamente)

## Como funciona

- O `server.js` serve `index.html` e `client.js` via HTTP.
- A comunicação do jogo é via WebSocket no mesmo host/porta do HTTP.
- O estado da partida fica em memória no servidor (não há banco).

## Deploy

Este projeto precisa rodar como **Web Service** (Node) que mantenha conexão WebSocket.

### Render (exemplo)

- Tipo: **Web Service**
- Build command: `npm ci` (ou `npm install`)
- Start command: `npm start`
- Porta: o Render injeta `PORT` automaticamente (o servidor usa `process.env.PORT || 3000`)

### Observações importantes

- Por manter estado em memória, o jogo deve rodar com **apenas 1 instância** (sem autoscaling horizontal).
- Se usar proxy (Nginx/Cloudflare), ele precisa permitir WebSocket (headers `Upgrade` / `Connection`).

## Estrutura do projeto

- `server.js` — servidor HTTP + WebSocket (entrypoint)
- `server/room-store.js` — gerenciamento de salas/estado e helpers de broadcast/reset
- `server/game-engine.js` — engine do jogo (rodadas, reveal, pontuação, timer/auto-pick)
- `server/game-service.js` — roteador de mensagens WS (join/play/next/rematch/disconnect)
- `game/constants.js` — constantes e dados (cartas, perguntas, pesos)
- `game/scoring.js` — lógica de pontuação e seleção de perguntas
- `client.js` — entrypoint do cliente (carrega módulos)
- `client/` — módulos do cliente (UI, estado, WebSocket, telas)
- `index.html` — interface (HTML + CSS)

## Testes (Vitest)

- Estrutura: `tests/unit` e `tests/integration`
- Mocks: `tests/mocks/socket.mock.js`
- Coverage: requer `@vitest/coverage-v8` (instalado como devDependency)

