import { useLanguage } from '../context/LanguageContext'
import './LanguageToggle.css'

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="lang-toggle" role="group" aria-label="Language / भाषा">
      <button
        type="button"
        className={lang === 'en' ? 'active' : ''}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={lang === 'np' ? 'active' : ''}
        onClick={() => setLang('np')}
      >
        नेपाली
      </button>
    </div>
  )
}
