import { initApp } from "./app.js"
import { createSocket } from "./ws.js"

initApp({ socket: createSocket() })

