import fs from "node:fs"
import path from "node:path"

// Em alguns ambientes Windows restritos (sandbox), o Vite tenta rodar `net use`
// para mapear drives de rede e isso pode falhar com EPERM. Para não bloquear os
// testes, aplicamos um patch leve no arquivo do Vite que adiciona um guard por
// env var e desabilitamos esse comportamento via VITE_DISABLE_NET_USE=1.
if (process.platform === "win32") {
  process.env.VITE_DISABLE_NET_USE = "1"

  const viteChunk = path.join(
    process.cwd(),
    "node_modules",
    "vite",
    "dist",
    "node",
    "chunks",
    "node.js"
  )

  try {
    let content = fs.readFileSync(viteChunk, "utf8")
    if (!content.includes("VITE_DISABLE_NET_USE")) {
      content = content.replace(
        'exec("net use", (error, stdout) => {',
        'if(process.env.VITE_DISABLE_NET_USE){safeRealpathSync=fs.realpathSync.native;return;}exec("net use", (error, stdout) => {'
      )
      fs.writeFileSync(viteChunk, content, "utf8")
    }
  } catch {
    // Se não conseguir patchar, seguimos; em ambientes normais isso não quebra.
  }
}

const { parseCLI, startVitest } = await import("vitest/node")

const { filter, options } = parseCLI(["vitest", ...process.argv.slice(2)], { allowUnknownOptions: true })
options.run = true
options.watch = false

// Workaround: em alguns ambientes, o provider de coverage (v8) tenta escrever em
// `coverage/.tmp` sem garantir que o diretÃ³rio exista. Criamos de antemÃ£o.
try {
  fs.mkdirSync(path.join(process.cwd(), "coverage", ".tmp"), { recursive: true })
} catch {
  // ignore
}

await startVitest("test", filter, options)
process.exit(process.exitCode || 0)
