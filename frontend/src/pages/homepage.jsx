import { useState } from 'react'
import './homepage.css'

const services = [
  'Property tax payment',
  'New citizenship',
  'Recommendation letter',
]

export default function Homepage() {
  const [screen, setScreen] = useState('site')
  const [language, setLanguage] = useState('EN')
  const [joinStep, setJoinStep] = useState(1)
  const [ticket, setTicket] = useState(null)

  const [queue, setQueue] = useState([
    { token: 'B-17', service: 'Property tax payment', status: 'Serving' },
    { token: 'B-18', service: 'Property tax payment', status: 'Waiting' },
    { token: 'B-19', service: 'New citizenship', status: 'Waiting' },
  ])

  const copy =
    language === 'EN'
      ? {
          scan: 'Scan. Join. Go on with your day.',
          sub: 'NoQ turns the queue at your counter into a live number on a visitor’s phone. No app, no account, no sign-up.',
          join: 'Join the live queue',
          ready: 'Create your ReadyPass',
          docs: 'I have the required documents',
          submit: 'Get my token',
        }
      : {
          scan: 'स्क्यान गर्नुहोस्। लाइनमा जोडिनुहोस्। आफ्नो काम गर्नुहोस्।',
          sub: 'NoQ ले काउन्टरको लाइनलाई फोनमा देखिने लाइभ नम्बर बनाउँछ।',
          join: 'लाइभ लाइनमा जोडिनुहोस्',
          ready: 'ReadyPass बनाउनुहोस्',
          docs: 'मसँग आवश्यक कागजातहरू छन्',
          submit: 'टोकन लिनुहोस्',
        }

  const addTicket = () => {
    const newToken = `B-${24 + queue.length}`

    setTicket(newToken)
    setQueue([
      ...queue,
      {
        token: newToken,
        service: 'Property tax payment',
        status: 'Waiting',
      },
    ])
    setJoinStep(3)
  }

  const completeCurrentTicket = () => {
    setQueue(
      queue.map((item, index) => {
        if (index === 0) return { ...item, status: 'Completed' }
        if (index === 1) return { ...item, status: 'Serving' }
        return item
      }),
    )
  }

  return (
    <div className="app">
      <header className="nav">
        <div className="brand">
          NoQ <small>no queue</small>
        </div>

        <div className="tabs">
          {['site', 'visitor', 'staff', 'setup', 'display'].map((tab) => (
            <button
              key={tab}
              className={screen === tab ? 'active' : ''}
              onClick={() => setScreen(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <button
          className="ghost language-button"
          onClick={() => setLanguage(language === 'EN' ? 'नेपाली' : 'EN')}
        >
          {language}
        </button>
      </header>

      {screen === 'site' && (
        <main className="page">
          <section className="hero">
            <div>
              <div className="eyebrow">● Built for Nepal · काठमाडौं</div>

              <h1 className="title">Nobody should lose a day to a line.</h1>

              <p className="subtitle">{copy.sub}</p>

              <button className="primary" onClick={() => setScreen('setup')}>
                Set up your counter
              </button>

              <button className="ghost" onClick={() => setScreen('visitor')}>
                {copy.join}
              </button>
            </div>

            <div className="phone">
              <small>Ward 16 Office, Lalitpur</small>
              <h3>Property tax payment</h3>

              <div className="token">
                <small>YOUR NUMBER</small>
                <b>B-24</b>
                <span>Now serving B-17 · 6 ahead</span>
              </div>

              <div className="notice">
                <b>Leave by 2:14 PM</b>
                <br />
                to reach on time by bike.
              </div>
            </div>
          </section>

          <section className="grid">
            {[
              ['Government offices', 'Document checks built in'],
              ['Hospitals', 'Triage jumps the line'],
              ['Banks', 'Multi-counter balancing'],
            ].map(([title, description]) => (
              <article className="card" key={title}>
                <h2>{title}</h2>
                <p>{description}</p>
              </article>
            ))}
          </section>
        </main>
      )}

      {screen === 'visitor' && (
        <main className="page">
          <h1>{copy.scan}</h1>

          <div className="card form-card">
            <div className="steps">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`step ${joinStep >= step ? 'on' : ''}`}
                >
                  {step}
                </span>
              ))}
            </div>

            {joinStep === 1 && (
              <>
                <h2>Choose a service</h2>
                <label>Ward 16 Office, Lalitpur</label>

                <select>
                  {services.map((service) => (
                    <option key={service}>{service}</option>
                  ))}
                </select>

                <button className="primary" onClick={() => setJoinStep(2)}>
                  Continue
                </button>
              </>
            )}

            {joinStep === 2 && (
              <>
                <h2>{copy.ready}</h2>

                <label className="check">
                  <input type="checkbox" />
                  Citizenship/ID copy
                </label>

                <label className="check">
                  <input type="checkbox" />
                  Previous tax receipt
                </label>

                <label className="check">
                  <input type="checkbox" />
                  {copy.docs}
                </label>

                <button className="primary" onClick={addTicket}>
                  {copy.submit}
                </button>
              </>
            )}

            {joinStep === 3 && (
              <>
                <h2>Your ReadyPass</h2>

                <div className="token">
                  <small>YOUR NUMBER</small>
                  <b>{ticket}</b>
                  <span>6 ahead · about 18–26 minutes</span>
                </div>

                <div className="notice">
                  SMS alert simulated: We will notify you when you are close.
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {screen === 'staff' && (
        <main className="page">
          <h1>Today’s queue</h1>

          <div className="queue">
            <section className="card">
              {queue.map((item, index) => (
                <div className="row" key={item.token}>
                  <div>
                    <b>{item.token}</b>
                    <br />
                    <small>{item.service}</small>
                  </div>

                  <span className="status">{item.status}</span>

                  {index === 0 && item.status === 'Serving' && (
                    <button className="primary" onClick={completeCurrentTicket}>
                      Complete
                    </button>
                  )}
                </div>
              ))}
            </section>

            <aside className="card">
              <h2>Counter 1</h2>
              <p>
                Now serving: <b>B-17</b>
              </p>
              <p>
                Waiting:{' '}
                <b>{queue.filter((item) => item.status === 'Waiting').length}</b>
              </p>

              <button className="ghost full">Pause queue</button>
            </aside>
          </div>
        </main>
      )}

      {screen === 'setup' && (
        <main className="page">
          <h1>Set up your counter</h1>

          <div className="card setup-card">
            <label>Service centre name</label>
            <input placeholder="e.g. Ward 16 Office, Lalitpur" />

            <label>Service category</label>
            <select>
              <option>Government office</option>
              <option>Hospital</option>
              <option>Bank</option>
            </select>

            <label>Service name</label>
            <input placeholder="e.g. Property tax payment" />

            <label>Required documents</label>
            <input placeholder="e.g. Citizenship/ID copy" />

            <button className="primary">Save and generate QR</button>
          </div>
        </main>
      )}

      {screen === 'display' && (
        <main className="page">
          <div className="card display-card">
            <div className="eyebrow">WARD 16 OFFICE · LALITPUR</div>

            <h1 className="title">Now serving</h1>

            <div className="token">
              <b>B-17</b>
              <span>Counter 1 · Property tax payment</span>
            </div>

            <h2>Next: B-18 · B-19 · B-20</h2>

            <p className="subtitle display-message">
              Please keep your documents ready. कृपया आवश्यक कागजात तयार
              राख्नुहोस्।
            </p>
          </div>
        </main>
      )}
    </div>
  )
}