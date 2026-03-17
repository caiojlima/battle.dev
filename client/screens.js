import { el, hide, show } from "./dom.js"

export function showLoginScreen({ playerName }) {
  show("loginScreen", "flex")
  hide("waitingScreen")

  const nameInput = el("playerNameInput")
  if (nameInput) {
    nameInput.value = playerName ? playerName : ""
    nameInput.focus()
  }
}

export function showWaitingScreen({ playerName }) {
  hide("loginScreen")
  show("waitingScreen", "flex")

  const nameEl = el("waitingPlayerName")
  if (nameEl && playerName) nameEl.innerText = playerName
}

