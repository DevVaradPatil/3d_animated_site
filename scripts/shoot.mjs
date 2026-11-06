// npm run dev, then: [URL=http://localhost:5173] node scripts/shoot.mjs <outDir> <waitMs> <stoneId...>
// Real-time headless Chrome screenshots via CDP (the in-app preview throttles WebGL when unfocused).
// Prints fps per stone + any uncaught exceptions. No deps (Node 22+ WebSocket).
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const [outDir, waitMs, ...hashes] = process.argv.slice(2)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9333', '--use-angle=d3d11', '--ignore-gpu-blocklist',
  '--hide-scrollbars', '--window-size=1440,860', `--user-data-dir=${process.env.TEMP ?? '/tmp'}/lithos-shoot-profile`, 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(2500)
const targets = await (await fetch('http://127.0.0.1:9333/json')).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id) }
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 860, deviceScaleFactor: 1, mobile: false })
const logs = []
await send('Runtime.enable')
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') logs.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]) })
for (const h of hashes) {
  await send('Page.navigate', { url: `${process.env.URL ?? 'http://localhost:5173'}/?shot=${Date.now()}#${h}` })
  await sleep(Number(waitMs))
  const fps = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `new Promise(r=>{let n=0;const t=performance.now();const f=()=>{n++;performance.now()-t<1000?requestAnimationFrame(f):r(n)};requestAnimationFrame(f)})` })
  const { result } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 })
  writeFileSync(`${outDir}/${h}.jpg`, Buffer.from(result.data, 'base64'))
  console.log(h, 'fps', fps.result?.result?.value)
}
console.log('exceptions:', logs.length ? logs.slice(0, 5) : 'none')
ws.close()
chrome.kill()
