import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en, type MessageKey } from './en'
import { ar } from './ar'

/**
 * Minimal locale layer — EN now, AR slots in later (CLAUDE.md §7).
 * RTL is structural from day one: LocaleProvider owns document dir/lang,
 * components use logical CSS properties, and numerals stay Western + LTR
 * via the `ltr-nums` / `nums-tabular` utilities.
 */
export type Locale = 'en' | 'ar'

type Messages = Record<MessageKey, string>

// AR dictionary is partial during the Arabic pass; `t()` falls back to EN for
// any key not yet translated (gender keys are translated, see ./ar).
const dictionaries: Record<Locale, Partial<Messages>> = {
  en,
  ar,
}

interface I18nContextValue {
  locale: Locale
  dir: 'ltr' | 'rtl'
  setLocale: (l: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('connect.locale') as Locale) || 'en')
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    localStorage.setItem('connect.locale', locale)
  }, [locale, dir])

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      let msg = dictionaries[locale][key] ?? en[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          msg = msg.replaceAll(`{${k}}`, String(v))
        }
      }
      return msg
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, dir, setLocale, t }) as I18nContextValue, [locale, dir, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within LocaleProvider')
  return ctx
}
