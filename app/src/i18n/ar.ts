import type { MessageKey } from './en'

/**
 * Arabic (AR) strings — friendly MSA, per Connect_AR_Glossary.md register for UI.
 * The full AR pass is still pending (CLAUDE.md §7); for now this is a PARTIAL
 * dictionary and `t()` falls back to EN for any key not yet translated. Western
 * numerals only; RTL is structural (LocaleProvider sets dir/lang).
 *
 * The gender label + both options (and the sign-up gender step) are the first
 * keys translated here so the new required gender field is bilingual on day one.
 */
export const ar: Partial<Record<MessageKey, string>> = {
  // Gender — friendly MSA (glossary has no gender row yet; standard terms)
  'gender.label': 'الجنس',
  'gender.male': 'ذكر',
  'gender.female': 'أنثى',

  // Sign-up Q2 — gender. titleB is the brand-italic emphasis word.
  'onb.gender.titleA': 'ما هو ',
  'onb.gender.titleB': 'جنسك',
  'onb.gender.titleC': '؟',
  'onb.gender.sub': 'يظهر في ملفك الشخصي ليعرف اللاعبون من سيقابلون.',
}
