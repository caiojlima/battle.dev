import { escapeHtml, formatStatName, getColor } from "../utils.js"

export function buildPreviewHandCardHtml(lang, ownerName) {
  const name = lang?.name ?? ""
  const personality = lang?.personality ?? ""
  const stats = lang?.stats ?? {}
  const color = getColor(name)

  return `
    <div class="card calc-preview" style="
      border-top: 4px solid ${color};
      box-shadow: 0 6px 20px ${color}30;
    ">

      <h4 style="color:${color}">
        ${escapeHtml(name)}
      </h4>

      <p class="personality">
        ${escapeHtml(personality)}
      </p>

      <div class="card-info">
        <p><strong>Jogador:</strong> ${escapeHtml(ownerName)}</p>
      </div>

      <div class="stats">
        ${Object.entries(stats)
          .map(
            ([key, value]) => `
          <div class="stat">
            <span>${escapeHtml(formatStatName(key))}</span>
            <div class="bar">
              <div class="fill" style="width:${Number(value)}%"></div>
            </div>
            <strong>${Number(value)}</strong>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `
}

export function buildHandCardHtml(lang, index, isSelected) {
  const color = getColor(lang.name)
  return `
    <div class="card ${isSelected ? "selected" : ""}" data-name="${escapeHtml(lang.name)}" style="
      border-top: 4px solid ${color};
      box-shadow: 0 6px 20px ${color}30;
      animation-delay: ${index * 0.15}s;
    ">

      <h2 style="color:${color}">
        ${escapeHtml(lang.name)}
      </h2>

      <p class="personality">
        ${escapeHtml(lang.personality)}
      </p>

      <div class="stats">
        ${Object.entries(lang.stats)
          .map(
            ([key, value]) => `
          <div class="stat">
            <span>${escapeHtml(formatStatName(key))}</span>
            <div class="bar">
              <div class="fill" style="width:${Number(value)}%"></div>
            </div>
            <strong>${Number(value)}</strong>
          </div>
        `
          )
          .join("")}
      </div>

    </div>
  `
}

