export function createMockSocket() {
  const sent = []

  return {
    readyState: 1,
    sent,
    send(payload) {
      sent.push(payload)
    },
  }
}

export function getSentMessages(socket) {
  return socket.sent.map((m) => {
    try {
      return typeof m === "string" ? JSON.parse(m) : m
    } catch {
      return m
    }
  })
}

export function lastMessageOfType(socket, type) {
  const list = getSentMessages(socket)
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.type === type) return list[i]
  }
  return null
}

