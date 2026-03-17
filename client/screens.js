import { el, hide, show } from "./dom.js"

export function setLoginError(message = "") {
  const nameInput = el("playerNameInput")
  const errorEl = el("playerNameError")

  if (nameInput) nameInput.classList.toggle("is-invalid", Boolean(message))
  if (errorEl) {
    errorEl.innerText = message
    errorEl.style.display = message ? "block" : "none"
  }
}

export function showLoginScreen({ playerName }) {
  show("loginScreen", "flex")
  hide("waitingScreen")
  setLoginError("")

  const nameInput = el("playerNameInput")
  if (nameInput) {
    nameInput.value = playerName ? playerName : ""
    nameInput.focus()
  }
}

export function showWaitingScreen({ playerName }) {
  hide("loginScreen")
  show("waitingScreen", "flex")
  setLoginError("")

  const nameEl = el("waitingPlayerName")
  if (nameEl && playerName) nameEl.innerText = playerName
}
