import { createContext, useContext, useMemo, useState } from 'react'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')

  const value = useMemo(
    () => ({
      lang,
      isNp: lang === 'np',
      toggle: () => setLang((l) => (l === 'en' ? 'np' : 'en')),
      setLang,
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
