import { describe, expect, it, vi } from "vitest"

const hoisted = vi.hoisted(() => {
  return {
    initApp: vi.fn(),
    createSocket: vi.fn(() => ({ id: 123 })),
  }
})

vi.mock("../../client/app.js", () => ({ initApp: hoisted.initApp }))
vi.mock("../../client/ws.js", () => ({ createSocket: hoisted.createSocket }))

describe("client/main", () => {
  it("deve chamar initApp com socket criado", async () => {
    vi.resetModules()

    await import("../../client/main.js")

    expect(hoisted.createSocket).toHaveBeenCalledTimes(1)
    expect(hoisted.initApp).toHaveBeenCalledWith({ socket: { id: 123 } })
  })
})
