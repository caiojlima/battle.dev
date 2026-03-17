export function el(id) {
  return document.getElementById(id)
}

export function show(id, display = "block") {
  const node = el(id)
  if (!node) return

  if (display == null) {
    node.style.display = ""
    return
  }

  // Quando `display` não é especificado, escolha um padrão melhor:
  // - botões devem aparecer centralizados (inline-block) no layout atual
  // - permite override via `data-display`
  const resolved =
    display === "block" && !node.dataset?.display
      ? node.tagName === "BUTTON"
        ? "inline-block"
        : "block"
      : display

  node.style.display = node.dataset?.display || resolved
}

export function hide(id) {
  const node = el(id)
  if (!node) return
  node.style.display = "none"
}

export function setResultHtml(html) {
  const resultEl = el("result")
  if (!resultEl) return

  resultEl.innerHTML = html || ""
  resultEl.style.display = resultEl.textContent.trim() ? "block" : "none"
}

export function setRoundOutcomeHtml(html) {
  const container = el("roundOutcome")
  if (container) {
    container.innerHTML = html
    return
  }
  setResultHtml(html)
}
