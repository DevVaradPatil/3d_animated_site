// npm run dev, then: [URL=http://localhost:5173] node scripts/og.mjs
// Renders public/og.jpg (1200×630 social card, from the live scene) and public/apple-touch-icon.png (180×180).
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const URL_ = process.env.URL ?? 'http://localhost:5173'
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9335', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--hide-scrollbars',
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/lithos-og-profile`, 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(2500)
const page = (await (await fetch('http://127.0.0.1:9335/json')).json()).find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id) }
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })
const shot = async (file, format) => {
  const { result } = await send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 90 } : {}) })
  writeFileSync(file, Buffer.from(result.data, 'base64'))
}

// headless Chrome reports reduced motion by default; we want the full scene
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })

// social card: hero diamond, chrome stripped back to wordmark + name + one line
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: `${URL_}/?og=${Date.now()}#diamond` })
await sleep(9000) // intro + reveal
await send('Runtime.evaluate', {
  expression: `(() => {
    const css = document.createElement('style')
    css.textContent = '.rail, .specs, .idx, .nav nav, .cta, .cursor-dot, .cursor-ring, .skip { display: none !important }'
    document.head.append(css)
    document.querySelector('.story').textContent = 'Seven stones, seven origins. Rendered in real-time light.'
  })()`,
})
await sleep(600)
await shot('public/og.jpg', 'jpeg')

// touch icon from the favicon
await send('Emulation.setDeviceMetricsOverride', { width: 180, height: 180, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 5, g: 5, b: 6, a: 1 } }) // behind the rounded corners
await send('Page.navigate', { url: `${URL_}/favicon.svg` }) // viewBox-only SVG fills the 180px viewport
await sleep(1200)
await shot('public/apple-touch-icon.png', 'png')

console.log('wrote public/og.jpg, public/apple-touch-icon.png')
ws.close()
chrome.kill()
