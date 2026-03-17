import { DEFAULT_CARD_COLOR, LANGUAGE_COLORS } from "./constants.js"

export function getColor(name) {
  return LANGUAGE_COLORS[name] || DEFAULT_CARD_COLOR
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function formatStatName(key) {
  const map = {
    performance: "⚡ Performance",
    facilidade: "📚 Facilidade",
    mercado: "💼 Mercado",
    complexidade: "🧠 Complexidade",
    popularidade: "🚀 Popularidade",
    tooling: "🛠️ Tooling",
    verbosidade: "🗣️ Verbosidade",
    mobile: "📱 Mobile",
  }

  return map[key] || key
}
