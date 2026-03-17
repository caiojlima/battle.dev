export function createMockElement({ id, tagName = "DIV" } = {}) {
  const listeners = new Map()
  let removed = false

  const element = {
    id,
    tagName,
    style: {},
    dataset: {},
    value: "",
    innerText: "",
    _innerHTML: "",
    get textContent() {
      // Suficiente para os testes atuais (não precisamos de parse de HTML real).
      return this.innerText || String(this._innerHTML).replace(/<[^>]*>/g, "")
    },
    set textContent(v) {
      this.innerText = String(v ?? "")
    },
    classList: {
      _set: new Set(),
      add(cls) {
        this._set.add(cls)
      },
      remove(cls) {
        this._set.delete(cls)
      },
      toggle(cls, force) {
        const shouldAdd = force == null ? !this._set.has(cls) : Boolean(force)
        if (shouldAdd) this._set.add(cls)
        else this._set.delete(cls)
      },
      contains(cls) {
        return this._set.has(cls)
      },
    },
    focus() {},
    remove() {
      removed = true
    },
    get __removed() {
      return removed
    },
    addEventListener(type, cb) {
      listeners.set(type, cb)
    },
    dispatchEvent(type, event = {}) {
      const cb = listeners.get(type)
      cb?.(event)
    },
    querySelector() {
      return null
    },
    querySelectorAll() {
      return []
    },
    set innerHTML(v) {
      this._innerHTML = String(v ?? "")
    },
    get innerHTML() {
      return this._innerHTML
    },
  }

  return element
}

export function createCardsContainer() {
  const container = createMockElement({ id: "cards", tagName: "DIV" })
  container._cards = []

  container.querySelectorAll = (selector) => {
    if (selector === ".card") return container._cards
    return []
  }

  Object.defineProperty(container, "innerHTML", {
    get() {
      return container._innerHTML
    },
    set(v) {
      container._innerHTML = String(v ?? "")
      container._cards = []

      // Extrai `data-name="X"` do HTML gerado pelo renderer.
      const re = /data-name="([^"]+)"/g
      let m
      while ((m = re.exec(container._innerHTML))) {
        const card = createMockElement({ tagName: "DIV" })
        card.dataset.name = m[1]
        container._cards.push(card)
      }
    },
  })

  return container
}

export function createMockDocument(initialElements = {}) {
  const elements = new Map(Object.entries(initialElements))

  return {
    __elements: elements,
    getElementById(id) {
      return elements.get(id) || null
    },
    querySelectorAll() {
      return []
    },
    querySelector() {
      return null
    },
  }
}

export function installMockDocument(initialElements = {}) {
  const doc = createMockDocument(initialElements)
  globalThis.document = doc
  return doc
}
