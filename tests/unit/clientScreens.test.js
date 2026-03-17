import { describe, expect, it } from "vitest"

import { showLoginScreen, showWaitingScreen } from "../../client/screens.js"
import { createMockElement, installMockDocument } from "../helpers/dom.mock.js"

describe("client/screens", () => {
  it("showLoginScreen deve exibir login, focar input e setar valor", () => {
    const loginScreen = createMockElement({ id: "loginScreen" })
    const waitingScreen = createMockElement({ id: "waitingScreen" })
    const playerNameInput = createMockElement({ id: "playerNameInput", tagName: "INPUT" })

    let focused = false
    playerNameInput.focus = () => {
      focused = true
    }

    installMockDocument({ loginScreen, waitingScreen, playerNameInput })
    showLoginScreen({ playerName: "Alice" })

    expect(loginScreen.style.display).toBe("flex")
    expect(waitingScreen.style.display).toBe("none")
    expect(playerNameInput.value).toBe("Alice")
    expect(focused).toBe(true)
  })

  it("showLoginScreen nÃ£o deve quebrar quando input nÃ£o existe", () => {
    const loginScreen = createMockElement({ id: "loginScreen" })
    const waitingScreen = createMockElement({ id: "waitingScreen" })

    installMockDocument({ loginScreen, waitingScreen })
    expect(() => showLoginScreen({ playerName: "X" })).not.toThrow()
  })

  it("showWaitingScreen deve exibir waiting e setar nome quando fornecido", () => {
    const loginScreen = createMockElement({ id: "loginScreen" })
    const waitingScreen = createMockElement({ id: "waitingScreen" })
    const waitingPlayerName = createMockElement({ id: "waitingPlayerName" })

    installMockDocument({ loginScreen, waitingScreen, waitingPlayerName })
    showWaitingScreen({ playerName: "A" })

    expect(loginScreen.style.display).toBe("none")
    expect(waitingScreen.style.display).toBe("flex")
    expect(waitingPlayerName.innerText).toBe("A")
  })

  it("showWaitingScreen nÃ£o deve setar nome quando playerName estÃ¡ vazio", () => {
    const loginScreen = createMockElement({ id: "loginScreen" })
    const waitingScreen = createMockElement({ id: "waitingScreen" })
    const waitingPlayerName = createMockElement({ id: "waitingPlayerName" })
    waitingPlayerName.innerText = "antes"

    installMockDocument({ loginScreen, waitingScreen, waitingPlayerName })
    showWaitingScreen({ playerName: "" })

    expect(waitingPlayerName.innerText).toBe("antes")
  })
})
