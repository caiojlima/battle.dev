import { describe, expect, it } from "vitest"

import { buildHandCardHtml, buildPreviewHandCardHtml } from "../../client/ui/cards.js"

describe("client/ui/cards", () => {
  it("buildPreviewHandCardHtml deve aceitar lang nulo (defaults) sem quebrar", () => {
    const html = buildPreviewHandCardHtml(null, "Alice")
    expect(html).toContain("Jogador:")
    expect(html).toContain("Alice")
  })

  it("buildPreviewHandCardHtml deve conter nome, jogador e stats", () => {
    const html = buildPreviewHandCardHtml(
      { name: "Python", personality: "x", stats: { performance: 10 } },
      "Alice"
    )
    expect(html).toContain("Python")
    expect(html).toContain("Alice")
    expect(html).toContain("Performance")
  })

  it("buildHandCardHtml deve marcar selected quando isSelected = true", () => {
    const html = buildHandCardHtml({ name: "A", personality: "", stats: { performance: 10 } }, 0, true)
    expect(html).toContain('class="card selected"')
  })

  it("buildHandCardHtml deve escapar data-name", () => {
    const html = buildHandCardHtml({ name: '\"><script>', personality: "", stats: { performance: 10 } }, 0, false)
    expect(html).toContain('data-name="&quot;&gt;&lt;script&gt;"')
  })
})
