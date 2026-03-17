import { describe, expect, it } from "vitest"

import { el, hide, setResultHtml, setRoundOutcomeHtml, show } from "../../client/dom.js"
import { createMockElement, installMockDocument } from "../helpers/dom.mock.js"

describe("client/dom", () => {
  it("el deve retornar elemento por id", () => {
    const node = createMockElement({ id: "x" })
    installMockDocument({ x: node })
    expect(el("x")).toBe(node)
  })

  it("show/hide deve ser no-op quando elemento nÃ£o existe", () => {
    installMockDocument({})

    expect(() => show("missing")).not.toThrow()
    expect(() => hide("missing")).not.toThrow()
  })

  it("show/hide deve ajustar display (botÃ£o centralizado)", () => {
    const btn = createMockElement({ id: "b", tagName: "BUTTON" })
    installMockDocument({ b: btn })

    show("b")
    expect(btn.style.display).toBe("inline-block")

    hide("b")
    expect(btn.style.display).toBe("none")
  })

  it("show deve usar display block para elementos nÃ£o-button quando nÃ£o hÃ¡ data-display", () => {
    const node = createMockElement({ id: "x", tagName: "DIV" })
    installMockDocument({ x: node })

    show("x")
    expect(node.style.display).toBe("block")
  })

  it("show deve respeitar data-display e display null", () => {
    const node = createMockElement({ id: "x", tagName: "DIV" })
    node.dataset.display = "flex"
    installMockDocument({ x: node })

    show("x")
    expect(node.style.display).toBe("flex")

    show("x", null)
    expect(node.style.display).toBe("")
  })

  it("setResultHtml deve ser no-op quando #result nÃ£o existe", () => {
    installMockDocument({})
    expect(() => setResultHtml("OK")).not.toThrow()
  })

  it("setResultHtml deve controlar display pelo conteÃºdo", () => {
    const result = createMockElement({ id: "result" })
    installMockDocument({ result })

    setResultHtml("")
    expect(result.style.display).toBe("none")

    setResultHtml("OK")
    expect(result.style.display).toBe("block")
  })

  it("setRoundOutcomeHtml deve preferir roundOutcome quando existe", () => {
    const roundOutcome = createMockElement({ id: "roundOutcome" })
    const result = createMockElement({ id: "result" })
    installMockDocument({ roundOutcome, result })

    setRoundOutcomeHtml("X")
    expect(roundOutcome.innerHTML).toBe("X")
  })

  it("setRoundOutcomeHtml deve cair para result quando roundOutcome nÃ£o existe", () => {
    const result = createMockElement({ id: "result" })
    installMockDocument({ result })

    setRoundOutcomeHtml("OK")
    expect(result.style.display).toBe("block")
  })
})
