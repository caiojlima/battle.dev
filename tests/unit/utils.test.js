import { describe, expect, it } from "vitest"

import { escapeHtml, formatStatName, getColor } from "../../client/utils.js"
import { DEFAULT_CARD_COLOR } from "../../client/constants.js"

describe("client/utils", () => {
  it("escapeHtml deve escapar caracteres perigosos", () => {
    expect(escapeHtml(`<div class="x">& ' "</div>`)).toBe(
      "&lt;div class=&quot;x&quot;&gt;&amp; &#39; &quot;&lt;/div&gt;"
    )
  })

  it("formatStatName deve mapear stats conhecidos", () => {
    expect(formatStatName("performance")).toContain("Performance")
    expect(formatStatName("facilidade")).toContain("Facilidade")
    expect(formatStatName("mercado")).toContain("Mercado")
    expect(formatStatName("complexidade")).toContain("Complexidade")
    expect(formatStatName("popularidade")).toContain("Popularidade")
  })

  it("formatStatName deve manter chave desconhecida", () => {
    expect(formatStatName("xpto")).toBe("xpto")
  })

  it("getColor deve retornar cor padrão quando não existe", () => {
    expect(getColor("NãoExiste")).toBe(DEFAULT_CARD_COLOR)
  })

  it("getColor deve retornar cor cadastrada", () => {
    expect(getColor("Python")).not.toBe(DEFAULT_CARD_COLOR)
  })
})

