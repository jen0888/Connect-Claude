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

  // Pending approval-request — withdraw CTA (Home "This week" card)
  'match.cancelRequest': 'إلغاء الطلب',

  // @mentions (Stage 1.8) — `mentionedYou` ready for the §1.10 push payload
  'chat.mentionedYou': 'ذكرك {name}',
  'chat.mention.empty': 'لا يوجد أعضاء للإشارة إليهم',

  // Ladies-only gender restriction (CLAUDE.md §6/§7)
  'match.ladiesOnly': 'للسيدات فقط',
  'match.gender.womenOnly': 'للسيدات فقط',
  'match.gender.blockedInline': 'هذه المباراة للسيدات فقط.',
  'match.gender.blockedToast': 'هذه المباراة مفتوحة للسيدات فقط.',
  'match.invite.ladiesNotice': 'مباراة للسيدات فقط — يمكن دعوة اللاعبات فقط.',
  'match.invite.ineligible': 'غير مؤهّل لمباراة السيدات — يُرجى الإزالة.',

  // Skill ladder — 7 tiers, lowest → highest (sign-up, profile, match range)
  'skill.baby': 'مبتدئ تمامًا',
  'skill.beginner': 'مبتدئ',
  'skill.low_int': 'متوسط منخفض',
  'skill.int': 'متوسط',
  'skill.high_int': 'متوسط عالٍ',
  'skill.advance': 'متقدم',
  'skill.pro': 'محترف',
  // Full-word labels for a SINGLE selected level (Arabic spells these out the
  // same as the abbreviated form; ranges keep the abbreviated keys). LTR-safe.
  'skill.baby.full': 'مبتدئ تمامًا',
  'skill.beginner.full': 'مبتدئ',
  'skill.low_int.full': 'متوسط منخفض',
  'skill.int.full': 'متوسط',
  'skill.high_int.full': 'متوسط عالٍ',
  'skill.advance.full': 'متقدم',
  'skill.pro.full': 'محترف',
  // skill range header + helper line on the create form
  'skill.range.single': '{x} فقط',
  'skill.range.span': 'من {x} إلى {y}',
  'skill.range.help': 'اضغط على مستوى لاختياره — واضغط على مستوى ثانٍ لتحديد نطاق، أو اضغط على أي نقطة للعودة إلى مستوى واحد.',

  // Sign-up Q2 — gender. titleB is the brand-italic emphasis word.
  'onb.gender.titleA': 'ما هو ',
  'onb.gender.titleB': 'جنسك',
  'onb.gender.titleC': '؟',
  'onb.gender.sub': 'يظهر في ملفك الشخصي ليعرف اللاعبون من سيقابلون.',
}
