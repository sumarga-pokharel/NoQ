import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = '/private/tmp/claude-501/-Users-asimsmac-Documents-NoQ/be0f3f8b-e4f9-4e4a-96f7-ca5cc7ef0605/scratchpad/shots'
mkdirSync(OUT, { recursive: true })

const errors = []
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } })
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })

const provider = {
  id: 'p1',
  slug: 'ward-16',
  officeName: 'Ward 16 Office, Lalitpur',
  sector: 'government',
  email: 'demo@avishkaram.com',
}

await page.route('**/api/auth/me', (route) => {
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider }) })
})
await page.route('**/api/tickets/dashboard', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      counters: [],
      waitingNow: 0,
      averageWaitMinutes: 0,
      servedToday: 0,
      issuedToday: 0,
      noShows: 0,
      rejoinedAfterNoShow: 0,
      documentsReadyPercent: 0,
      documentsFlagged: 0,
    }),
  })
})
await page.route('**/api/services', (route) => {
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ services: [] }) })
})
await page.route('**/api/tickets/waiting**', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ tickets: [], page: 1, limit: 10, total: 0, totalPages: 1 }),
  })
})

await page.addInitScript((p) => {
  // Minimal 3-part JWT shape so AuthContext's exp-parsing try/catch takes
  // the "no exp" branch cleanly rather than throwing on a malformed token.
  const header = btoa(JSON.stringify({ alg: 'none' }))
  const payload = btoa(JSON.stringify({ id: p.id }))
  localStorage.setItem('noq.auth.token', `${header}.${payload}.sig`)
}, provider)

await page.goto('http://localhost:5176/dashboard', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.dash__qr-code[src]', { timeout: 15000 })
await page.waitForSelector('.dash__qr-caption')
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/dashboard-qr-caption.png` })

// Confirm the download link points at a composited (taller) image, not the
// raw QR — read both data URLs' natural dimensions in-page.
const dims = await page.evaluate(async () => {
  const img = document.querySelector('.dash__qr-code')
  const dl = document.querySelector('a[download$="-join-qr.png"]')
  const load = (src) => new Promise((resolve) => {
    const i = new Image()
    i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight })
    i.src = src
  })
  const plain = await load(img.src)
  const poster = await load(dl.href)
  return { plain, poster, sameSrc: img.src === dl.href }
})
console.log('dimensions:', JSON.stringify(dims))

await browser.close()
console.log('errors:', errors.length ? errors : 'none')
