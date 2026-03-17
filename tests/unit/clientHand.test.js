import { describe, expect, it, vi } from "vitest"

import { renderCards } from "../../client/ui/hand.js"
import { createCardsContainer, installMockDocument } from "../helpers/dom.mock.js"

describe("client/ui/hand", () => {
  it("renderCards deve ser no-op quando #cards nÃ£o existe", () => {
    installMockDocument({})
    expect(() =>
      renderCards({ cards: [{ name: "A", personality: "x", stats: { performance: 1 } }] })
    ).not.toThrow()
  })

  it("renderCards deve renderizar e chamar onSelectCard ao clicar", () => {
    const cards = createCardsContainer()
    installMockDocument({ cards })

    const onSelectCard = vi.fn()
    renderCards({
      cards: [
        { name: "A", personality: "x", stats: { performance: 1 } },
        { name: "B", personality: "y", stats: { performance: 2 } },
      ],
      selectedCard: null,
      onSelectCard,
    })

    expect(cards.querySelectorAll(".card")).toHaveLength(2)
    const [first] = cards.querySelectorAll(".card")
    first.dispatchEvent("click")
    expect(onSelectCard).toHaveBeenCalledWith("A", first)
  })

  it("renderCards nÃ£o deve quebrar sem onSelectCard (optional chaining)", () => {
    const cards = createCardsContainer()
    installMockDocument({ cards })

    renderCards({
      cards: [{ name: "A", personality: "x", stats: { performance: 1 } }],
      selectedCard: "A",
    })

    const [first] = cards.querySelectorAll(".card")
    expect(() => first.dispatchEvent("click")).not.toThrow()
  })
})
