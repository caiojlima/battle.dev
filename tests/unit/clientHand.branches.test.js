import { describe, expect, it } from "vitest"

import { renderCards } from "../../client/ui/hand.js"
import { createCardsContainer, installMockDocument } from "../helpers/dom.mock.js"

describe("client/ui/hand (branches)", () => {
  it("renderCards deve tratar cards falsy como lista vazia", () => {
    const cards = createCardsContainer()
    installMockDocument({ cards })

    renderCards({ cards: null, selectedCard: null })
    expect(cards.querySelectorAll(".card")).toHaveLength(0)
    expect(cards.innerHTML).toBe("")
  })
})

