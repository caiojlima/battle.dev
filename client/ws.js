export function createSocket() {
  return new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host)
}

export function sendMessage(socket, payload) {
  socket.send(JSON.stringify(payload))
}

