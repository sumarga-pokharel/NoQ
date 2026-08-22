import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './LandingPage.css'

const SECTORS = [
  {
    title: 'Government offices',
    note: 'Document checks built in',
    color: '#1b4d3e',
    desc: 'License renewal · New license · Citizenship · Passport · Land registration · Property tax',
  },
  {
    title: 'Hospitals',
    note: 'Triage jumps the line',
    color: '#2a4c8f',
    desc: 'Emergency · General checkup · OPD by department · Lab & sample · Pharmacy · Follow-up',
  },
  {
    title: 'Banks',
    note: 'Multi-counter balancing',
    color: '#7a5210',
    desc: 'Account opening · Cash deposit · Remittance · Loan desk · Locker · KYC update',
  },
  {
    title: 'Other services',
    note: 'Table & party size',
    color: '#8a3e52',
    desc: 'Restaurant tables · Salon · Vehicle service · Ticket counters · Consulates',
  },
]

const FEATURES = [
  ['Travel-aware ETA', 'Queue time minus travel time. NoQ tells the visitor the minute to leave, and holds the token if traffic betrays them.'],
  ['Document readiness', 'A checklist per service. Visitors tick items off; staff see who is ready before calling them.'],
  ['SMS for those without data', 'Browser notifications when allowed; a plain Nepali SMS when not. One number, two reminders, no app.'],
  ['Priority queue', 'Senior citizens, pregnant women, disabled visitors and emergencies are weighted into the order — visibly.'],
  ['No-show handling', 'Two calls, then a grace window, then auto-skip with one tap to rejoin near the front.'],
  ['Load balancing', 'When a counter runs dry, NoQ moves the next compatible tokens across and updates every phone in the room.'],
  ['Works on bad connections', 'The ticket is cached on the phone. Offline it shows the last known position and the time it was true.'],
  ['Wait-time analytics', 'Peak hours, average handling time per service, abandonment — enough to justify a second counter.'],
  ['English and नेपाली', 'Every visitor screen, SMS and display board switches language in one tap.'],
]

const PLANS = [
  {
    name: 'Sadharan',
    price: 'Free',
    note: 'One counter, 60 tokens a day',
    items: ['QR & invite link', 'Live estimates', 'Browser notifications', 'Document checklist'],
  },
  {
    name: 'Karyalaya',
    price: 'रु 2,500',
    note: 'Up to 8 counters, unlimited tokens',
    highlight: true,
    items: ['Everything in Sadharan', 'SMS reminders (1,000/mo)', 'Display board', 'Priority queue & no-show rules', 'Analytics'],
  },
  {
    name: 'Sansthagat',
    price: 'Talk to us',
    note: 'Many branches, one console',
    items: ['Everything in Karyalaya', 'Multi-branch reporting', 'API & HMIS/CBS integration', 'On-site training in Nepali'],
  },
]

export default function LandingPage() {
  const { isNp } = useLanguage()

  return (
    <main className="landing">
      <section className="landing__hero">
        <div>
          <div className="landing__hero-eyebrow">
            <span className="dot" />
            Built for Nepal · काठमाडौं
          </div>
          <h1 className="landing__title">
            Nobody should lose
            <br />a day to a line.
          </h1>
          <p className="landing__subtitle">
            {isNp
              ? 'NoQ ले काउन्टरको लाइनलाई भ्रमणकर्ताको फोनमा देखिने लाइभ नम्बर बनाउँछ — पर्खाइ, यात्रा समय र आवश्यक कागजातसहित। QR स्क्यान गर्नुहोस्। एप वा खाता आवश्यक छैन।'
              : "NoQ turns the queue at your counter into a live number on the visitor's phone — with the wait, the travel time and the documents they need to bring. They scan a QR. No app, no account, no sign-up."}
          </p>
          <div className="landing__hero-actions">
            <Link to="/signup" className="btn btn-primary">
              Set up your counter
            </Link>
            <Link to="/join" className="btn btn-secondary">
              See a live queue
            </Link>
            <span className="landing__hero-note">Free under 60 tokens/day</span>
          </div>
          <div className="landing__running">
            <div className="eyebrow">Running today at</div>
            <div className="landing__running-list">
              <span>Ward 16 Office, Lalitpur</span>
              <span>Himalaya General Hospital</span>
              <span>Machhapuchhre Bank · Pulchowk</span>
              <span>Trisara Kitchen, Jhamsikhel</span>
            </div>
          </div>
        </div>

        <div className="landing__phone-wrap">
          <div className="landing__phone">
            <div className="landing__phone-screen">
              <div className="landing__phone-status">
                <span>2:04</span>
                <span>NoQ</span>
              </div>
              <div className="landing__phone-body">
                <div className="eyebrow-plain">Ward 16 Office, Lalitpur</div>
                <div className="landing__phone-service">Property tax payment</div>
                <div className="landing__phone-token">
                  <div className="eyebrow-plain">Your number</div>
                  <div className="landing__phone-token-num">B-24</div>
                  <div className="landing__phone-token-sub">
                    Now serving <strong>B-17</strong> · 6 ahead
                  </div>
                </div>
                <div className="landing__phone-stats">
                  <div>
                    <div className="eyebrow-plain">Wait</div>
                    <div className="landing__phone-stat-val">
                      18–26 <span>min</span>
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow-plain">You&rsquo;re away</div>
                    <div className="landing__phone-stat-val">
                      22 <span>min</span>
                    </div>
                  </div>
                </div>
                <div className="landing__phone-notice">
                  <strong>Leave by 2:14 PM</strong> to reach on time by bike.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing__section landing__section--white">
        <h2>Four kinds of queue, one system.</h2>
        <p className="landing__section-lede">
          Pick your sector at setup. NoQ brings the right service list, the right document rules and the right tone of
          instruction for the people waiting.
        </p>
        <div className="landing__sector-grid">
          {SECTORS.map((s) => (
            <article className="landing__sector-card" key={s.title}>
              <div className="landing__sector-swatch" style={{ background: s.color }} />
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <div className="landing__sector-note">{s.note}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__section">
        <div className="landing__how">
          <div>
            <div className="eyebrow">For the office</div>
            <h3>Three minutes to open a counter</h3>
            <ol className="landing__steps">
              <li>
                <b>Create the day&rsquo;s services</b>
                <span>Counter 3 — License renewal, 10:00–16:00, 8 min average per person.</span>
              </li>
              <li>
                <b>List required documents</b>
                <span>Citizenship original + photocopy, old license. Visitors see it before they arrive.</span>
              </li>
              <li>
                <b>Print the QR, open the gate</b>
                <span>One poster at the door, one link for WhatsApp and Viber. Staff call tokens from any browser.</span>
              </li>
            </ol>
          </div>
          <div>
            <div className="eyebrow">For the visitor</div>
            <h3>Scan, then get on with your morning</h3>
            <ol className="landing__steps">
              <li>
                <b>Scan the QR or open the link</b>
                <span>The number is issued instantly. No download, no account, no OTP.</span>
              </li>
              <li>
                <b>Watch the estimate, not the door</b>
                <span>A range, not a false promise — it tightens as the counter moves.</span>
              </li>
              <li>
                <b>Get told when to leave home</b>
                <span>NoQ compares your travel time with the queue and nudges you by browser or SMS.</span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="landing__section landing__section--dark">
        <h2>The parts that make it work in practice</h2>
        <div className="landing__feature-grid">
          {FEATURES.map(([title, desc]) => (
            <div key={title} className="landing__feature">
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing__section">
        <h2>Priced for a ward office, not a bank alone</h2>
        <p className="landing__section-lede">Per branch, per month, in Nepali rupees. No hardware to buy.</p>
        <div className="landing__plans">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`landing__plan ${plan.highlight ? 'landing__plan--highlight' : ''}`}>
              {plan.highlight && <div className="landing__plan-tag">Most offices</div>}
              <div className="landing__plan-name">{plan.name}</div>
              <div className="landing__plan-price">{plan.price}</div>
              <div className="landing__plan-note">{plan.note}</div>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/signup" className={`btn btn-block ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
