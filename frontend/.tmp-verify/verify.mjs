import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5173'
const OUT = '/private/tmp/claude-501/-Users-asimsmac-Documents-NoQ/be0f3f8b-e4f9-4e4a-96f7-ca5cc7ef0605/scratchpad/shots'
mkdirSync(OUT, { recursive: true })

const errors = []

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text()}`)
})

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot:', name)
}

// 1. Landing page
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForSelector('text=Nobody should lose')
await shot('01-landing')

// 2. Join flow -> ticket
await page.goto(BASE + '/join', { waitUntil: 'networkidle' })
await page.waitForSelector('text=Join the queue')
await shot('02-join-step1')
await page.click('button:has-text("Continue")')
await page.waitForSelector('text=Bring these with you')
await shot('03-join-step2')
await page.click('button:has-text("Get my token")')
await page.waitForSelector('text=Your number')
await shot('04-ticket')

// 3. Login page
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.waitForSelector('text=Log in to your office')
await shot('05-login')

// 4. Signup -> setup -> dashboard
await page.goto(BASE + '/signup', { waitUntil: 'networkidle' })
await page.waitForSelector('text=Set up your counter')
await shot('06-signup')
await page.fill('#officeName', 'Ward 16 Office, Lalitpur')
await page.fill('#email', 'demo@avishkaram.com')
await page.fill('#password', 'password123')
await page.click('button:has-text("Create office account")')
await page.waitForSelector('text=What kind of service is this?')
await shot('07-setup-step1')
await page.click('button:has-text("Continue")')
await page.waitForSelector('text=Services running today')
await shot('08-setup-step2')
await page.click('button:has-text("Continue")')
await page.waitForSelector('text=Required documents')
await page.click('button:has-text("Continue")')
await page.waitForSelector('text=Publish your QR')
await shot('09-setup-step4')
await page.click('button:has-text("Finish setup")')
await page.waitForURL('**/dashboard')
await page.waitForSelector('h1:has-text("Today")')
await shot('10-dashboard')

// dashboard interaction: call next / skip
await page.click('.dash__counter:has-text("Counter 3") button:has-text("Call again")')
await shot('11-dashboard-after-call')

// 5. Direct nav to /setup while authenticated (should work, not redirect)
await page.goto(BASE + '/setup', { waitUntil: 'networkidle' })
await page.waitForSelector('text=What kind of service is this?')
await shot('12-setup-revisit')

// 6. RequireAuth redirect check: logout then hit /dashboard directly
await page.click('button:has-text("Log out")')
await page.waitForSelector('text=Log in to your office')
await shot('13-after-logout-redirected')

await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
await page.waitForSelector('text=Log in to your office')
await shot('14-dashboard-guarded')

// 7. Display board
await page.goto(BASE + '/display', { waitUntil: 'networkidle' })
await page.waitForSelector('text=Ward 16 Office')
await shot('15-display')

// 8. 404
await page.goto(BASE + '/nonexistent-route', { waitUntil: 'networkidle' })
await page.waitForSelector("text=doesn")
await shot('16-notfound')

await browser.close()

console.log('\n--- console/page errors ---')
if (errors.length) {
  errors.forEach((e) => console.log(e))
  process.exitCode = 1
} else {
  console.log('none')
}
