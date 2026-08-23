import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = '/private/tmp/claude-501/-Users-asimsmac-Documents-NoQ/be0f3f8b-e4f9-4e4a-96f7-ca5cc7ef0605/scratchpad/shots'
mkdirSync(OUT, { recursive: true })

const errors = []
const browser = await chromium.launch()

// ---- 1. Display board: public, no auth needed ----
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } })
  page.on('pageerror', (e) => errors.push(`[display][pageerror] ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[display][console] ${m.text()}`) })

  await page.route('**/api/public/offices/**/display', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        office: { id: 'off1', officeName: 'Ward 16 Office, Lalitpur' },
        counters: [],
        servingCount: 3,
        waitingCount: 12,
        nextUp: ['B-23', 'B-24'],
      }),
    })
  })
  await page.goto('http://localhost:5176/display?office=ward-16', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.board__scan-code-caption')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/display-caption.png` })
  await page.close()
}

// ---- 2. Browse page: per-service QR with office + service caption ----
{
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
  page.on('pageerror', (e) => errors.push(`[browse][pageerror] ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[browse][console] ${m.text()}`) })

  await page.route('**/api/public/directory**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sectors: [],
        offices: [
          {
            id: 'off1',
            officeName: 'Ward 16 Office, Lalitpur',
            address: 'Lalitpur-16',
            isAcceptingJoins: true,
            requiredDocuments: [],
            slug: 'ward-16',
            services: [
              { _id: 'svc1', name: 'Property tax payment', category: 'Tax', prefix: 'B', avgMinutes: 8, isEmergency: false },
            ],
          },
        ],
      }),
    })
  })
  await page.goto('http://localhost:5176/browse', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.browse__qr-caption')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/browse-caption.png` })
  await page.close()
}

await browser.close()
console.log('errors:', errors.length ? errors : 'none')
