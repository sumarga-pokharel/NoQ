import { useLanguage } from '../context/LanguageContext'
import './PlaceholderPage.css'

// Plain shell for features that are planned but not built yet.
export default function PlaceholderPage({ eyebrow, title, titleNp, description, descriptionNp, points = [] }) {
  const { isNp } = useLanguage()

  return (
    <main className="placeholder">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{isNp && titleNp ? titleNp : title}</h1>
      <p>{isNp && descriptionNp ? descriptionNp : description}</p>
      <div className="card placeholder__card">
        <span className="placeholder__tag">{isNp ? 'निर्माणाधीन' : 'Not built yet'}</span>
        <ul>
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </main>
  )
}
