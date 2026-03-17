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

- `server.js` — servidor HTTP + WebSocket e lógica do jogo
- `client.js` — lógica do cliente (UI + eventos WS)
- `index.html` — interface (HTML + CSS)

