import { el } from "../dom.js"
import { buildHandCardHtml } from "./cards.js"

export function renderCards({ cards, selectedCard, onSelectCard }) {
  const container = el("cards")
  if (!container) return

  container.innerHTML = (cards || [])
    .map((lang, index) => buildHandCardHtml(lang, index, selectedCard === lang.name))
    .join("")

  container.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const name = card.dataset.name
      onSelectCard?.(name, card)
    })
  })
}

