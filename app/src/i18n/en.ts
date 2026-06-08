/**
 * EN strings. Keys are added screen-by-screen as they're implemented;
 * the AR dictionary mirrors these keys in the Arabic pass
 * (terms must follow Connect_AR_Glossary.md).
 */
export const en = {
  // Navigation
  'nav.discover': 'Discover',
  'nav.home': 'Home',
  'nav.chat': 'Chat',

  // Match card / lifecycle
  'match.status.open': 'Open',
  'match.status.full': 'Full',
  'match.status.live': 'Live',
  'match.status.completed': 'Just played',
  'match.status.closed': 'Closed',
  'match.status.cancelled': 'Cancelled',
  'match.action.join': 'Join',
  'match.action.request': 'Request',
  'match.action.view': 'View',
  'match.action.attend': 'Attend',
  'match.action.attended': 'Attended',
  'match.action.cancel': 'Cancel',
  'match.action.edit': 'Edit',
  'match.action.recordResult': 'Record result',
  'match.action.openChat': 'Open chat',
  'match.spotsLeft': '{count} spots left',
  'match.spotLeft': '1 spot left',
  'match.hostedBy': 'Hosted by {name}',

  // Sports
  'sport.padel': 'Padel',
  'sport.tennis': 'Tennis',
  'sport.badminton': 'Badminton',
  'sport.running': 'Running',

  // Skill levels — 7-step player ladder (sign-up Q3, Edit Profile)
  'skill.baby_beginner': 'Baby Beginner',
  'skill.baby_beginner.desc': 'Never played — total fresh start',
  'skill.beginner': 'Beginner',
  'skill.beginner.desc': 'Learning the ropes',
  'skill.low_intermediate': 'Low Intermediate',
  'skill.low_intermediate.desc': 'Rallies are coming together',
  'skill.intermediate': 'Intermediate',
  'skill.intermediate.desc': 'Solid rallies, fair serves',
  'skill.high_intermediate': 'High Intermediate',
  'skill.high_intermediate.desc': 'Consistent, starting to play tactically',
  'skill.advanced': 'Advanced',
  'skill.advanced.desc': 'Competitive, consistent',
  'skill.pro': 'Pro',
  'skill.pro.desc': 'Tournament level — bring it',

  // Auth — shared
  'auth.continueGoogle': 'Continue with Google',
  'auth.continueApple': 'Continue with Apple',
  'auth.or': 'or',
  'auth.back': 'Back',
  'auth.socialSoon': 'Social sign-in comes with Supabase',
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',
  'auth.field.name': 'Name',
  'auth.field.email': 'Email',
  'auth.field.password': 'Password',
  'auth.field.newPassword': 'New password',
  'auth.field.confirmPassword': 'Confirm password',
  'auth.ph.name': 'Your name',
  'auth.ph.email': 'you@example.com',
  'auth.ph.password': '8+ characters',
  'auth.ph.confirmPassword': 'Repeat it',
  'auth.err.invalidEmail': "That doesn't look like an email address.",
  'auth.err.weakPassword': 'Too weak — use at least 8 characters.',
  'auth.err.emailInUse': 'An account with this email already exists. Log in instead?',
  'auth.err.mismatch': "Passwords don't match.",
  'auth.err.wrongCredentials': "That email and password don't match. Try again, or reset your password.",

  // Splash
  'splash.tagline': 'Your match, your people, your community',
  'splash.getStarted': 'Get Started',
  'splash.logIn': 'Log In',

  // Sign up / Login
  'signup.cta': 'Next',
  'signup.haveAccount': 'Already have an account?',
  'signup.logInLink': 'Log in',
  'login.cta': 'Log in',
  'login.forgot': 'Forgot password?',
  'login.new': 'New here?',
  'login.createLink': 'Create an account',

  // Forgot / Reset password
  'forgot.titleA': 'Forgot your ',
  'forgot.titleB': 'password',
  'forgot.titleC': '?',
  'forgot.sub': "Enter your email and we'll send a reset link.",
  'forgot.cta': 'Send reset link',
  'forgot.sentTitle': 'Check your inbox.',
  'forgot.sentBody': 'We sent a reset link to {email}. It expires in 1 hour.',
  'forgot.resend': 'Resend link',
  'forgot.backToLogin': 'Back to log in',
  'forgot.toastSent': 'Reset link sent',
  'reset.titleA': 'Set a new ',
  'reset.titleB': 'password',
  'reset.titleC': '.',
  'reset.sub': 'Make it 8+ characters — something only you would know.',
  'reset.cta': 'Update password',
  'reset.toastDone': 'Password updated — log in',

  // Onboarding — shared
  'onb.step': 'Step {step} of {total}',
  'onb.next': 'Next',
  'onb.tapHint': 'Tap an option to continue',
  'onb.saved': 'Saved — {value}',

  // Q1 — age check (DOB, 18+ hard gate)
  'onb.age.titleA': "When's your ",
  'onb.age.titleB': 'birthday',
  'onb.age.titleC': '?',
  'onb.age.sub': 'You need to be 18 or older to use Connect! We only use this to confirm your age.',
  'onb.age.month': 'Month',
  'onb.age.day': 'Day',
  'onb.age.year': 'Year',
  'onb.age.prompt': 'Select your date of birth.',
  'onb.age.ok': "Great — you're {age}.",
  'onb.age.under': "You'll need to be 18+ to continue.",
  'onb.age.blockTitleA': 'See you at ',
  'onb.age.blockTitleB': '18',
  'onb.age.blockTitleC': '.',
  'onb.age.blockBody': "Connect! is for adults only right now. We'd love to have you when you're older.",
  'onb.age.blockCta': 'Got it',

  // Q2 — sport
  'onb.sport.titleA': 'Pick your ',
  'onb.sport.titleB': 'sport',
  'onb.sport.titleC': '.',
  'onb.sport.sub': 'Your main one — you can play them all.',

  // Q3 — skill level
  'onb.skill.titleA': "What's your ",
  'onb.skill.titleB': 'level',
  'onb.skill.titleC': '?',
  'onb.skill.sub': 'Be honest — it makes for better matches.',

  // Community standards review — chrome only; copy lives in content/standardsScreen.ts
  'onb.rules.lastStep': 'Last step',
  'onb.rules.agreeA': 'I agree to follow ',
  'onb.rules.agreeBold': "Connect!'s community standards",
  'onb.rules.agreeB': ' and play in good faith.',
  'onb.rules.cta': 'Agree & create account',
  'onb.rules.creating': 'Creating your account…',

  // All set
  'onb.done.eyebrow': 'Profile complete',
  'onb.done.titleA': "You're ",
  'onb.done.titleB': 'all set',
  'onb.done.titleC': '.',
  'onb.done.body': "We'll line up matches, partners and courts around what you just picked. Welcome to Connect!",
  'onb.done.cta': 'Enter Connect!',
} as const

export type MessageKey = keyof typeof en
