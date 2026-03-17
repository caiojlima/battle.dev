import { describe, expect, it, vi } from "vitest"

import { createSocket, sendMessage } from "../../client/ws.js"

describe("client/ws", () => {
  it("createSocket deve criar WebSocket com ws:// quando protocolo Ã© http", () => {
    const ctor = vi.fn()
    globalThis.WebSocket = class MockWebSocket {
      constructor(url) {
        ctor(url)
        this.url = url
      }
    }
    globalThis.location = { protocol: "http:", host: "localhost:3000" }

    const ws = createSocket()
    expect(ctor).toHaveBeenCalledWith("ws://localhost:3000")
    expect(ws.url).toBe("ws://localhost:3000")
  })

  it("createSocket deve criar WebSocket com wss:// quando protocolo Ã© https", () => {
    const ctor = vi.fn()
    globalThis.WebSocket = class MockWebSocket {
      constructor(url) {
        ctor(url)
        this.url = url
      }
    }
    globalThis.location = { protocol: "https:", host: "example.com" }

    const ws = createSocket()
    expect(ctor).toHaveBeenCalledWith("wss://example.com")
    expect(ws.url).toBe("wss://example.com")
  })

  it("sendMessage deve serializar JSON", () => {
    const socket = { send: vi.fn() }
    sendMessage(socket, { type: "x", a: 1 })
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "x", a: 1 }))
  })
})
