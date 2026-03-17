import { describe, expect, it } from "vitest"

import { buildHandCardHtml, buildPreviewHandCardHtml } from "../../client/ui/cards.js"

describe("client/ui/cards", () => {
  it("buildPreviewHandCardHtml deve aceitar lang nulo (defaults) sem quebrar", () => {
    const html = buildPreviewHandCardHtml(null)
    expect(html).toContain('class="card calc-preview"')
  })

  it("buildPreviewHandCardHtml deve conter nome e stats sem jogador", () => {
    const html = buildPreviewHandCardHtml({ name: "Python", personality: "x", stats: { performance: 10 } })
    expect(html).toContain("Python")
    expect(html).toContain("Performance")
    expect(html).not.toContain("Jogador:")
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
