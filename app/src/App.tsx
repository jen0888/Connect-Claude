import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useHydrated } from '@/lib/store'
import { Lab } from '@/screens/Lab'
import { HomeScreen } from '@/screens/home/HomeScreen'
import { DiscoverScreen } from '@/screens/discover/DiscoverScreen'
import { AllMatchesScreen } from '@/screens/matches/AllMatchesScreen'
import { CreateMatchScreen } from '@/screens/matches/CreateMatchScreen'
import { EditMatchScreen } from '@/screens/matches/EditMatchScreen'
import { MatchDetailsScreen } from '@/screens/matches/MatchDetailsScreen'
import { PostMatchScreen } from '@/screens/postmatch/PostMatchScreen'
import { ChatListScreen } from '@/screens/chat/ChatListScreen'
import { MatchChatScreen } from '@/screens/chat/MatchChatScreen'
import { ConversationScreen } from '@/screens/chat/ConversationScreen'
import { NewMessageScreen } from '@/screens/chat/NewMessageScreen'
import { ProfileScreen } from '@/screens/profile/ProfileScreen'
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen'
import { SettingsScreen } from '@/screens/profile/SettingsScreen'
import { BlockedListScreen, GuidelinesScreen, ReportPlayerScreen, ReportProblemScreen } from '@/screens/safety/SafetyScreens'
import {
  AgeCheckScreen,
  AllSetScreen,
  CreatingAccountScreen,
  ForgotPasswordScreen,
  LoginScreen,
  OnboardingGenderScreen,
  OnboardingSkillScreen,
  OnboardingSportScreen,
  ResetPasswordScreen,
  SignUpScreen,
  SplashScreen,
} from '@/screens/auth/AuthScreens'
import { CommunityStandardsScreen } from '@/screens/auth/CommunityStandardsScreen'

/** public routes reachable without a session (auth + onboarding flow) */
const PUBLIC_PATHS = new Set([
  '/login', '/signup', '/forgot-password', '/reset-password', '/welcome',
  '/onboarding/age', '/onboarding/gender', '/onboarding/sport', '/onboarding/skill',
  '/onboarding/guidelines', '/onboarding/creating', '/onboarding/done',
])

/** Live-mode auth guard: with Supabase configured, an unauthenticated user is
 *  sent to /login (except on public auth/onboarding routes). In mock mode this
 *  is a no-op — the dev user is always "signed in". */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const hydrated = useHydrated()
  const { pathname } = useLocation()
  if (!isSupabaseConfigured) return <>{children}</>
  if (loading) return null // brief: waiting on getSession()
  if (!session && !PUBLIC_PATHS.has(pathname)) return <Navigate to="/login" replace />
  // session is ready but the live store hasn't loaded its first snapshot yet —
  // hold protected screens so they never render against an empty `db` (which
  // would make `getUser(db, currentUserId)` undefined and crash, e.g. Home's
  // greeting). Public auth/onboarding routes don't read the store, so let them through.
  if (session && !hydrated && !PUBLIC_PATHS.has(pathname)) return null
  return <>{children}</>
}

/** Route map — 3 tabs (Discover · Home · Chat), Home is the default
 *  landing tab (CLAUDE.md §4). Screens land here as they're built. */
function App() {
  return (
    <AuthGate>
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomeScreen />} />
      <Route path="/discover" element={<DiscoverScreen />} />
      <Route path="/chat" element={<ChatListScreen />} />
      <Route path="/chat/new" element={<NewMessageScreen />} />
      <Route path="/chat/match/:id" element={<MatchChatScreen />} />
      <Route path="/chat/dm/:userId" element={<ConversationScreen />} />
      <Route path="/matches/all" element={<AllMatchesScreen />} />
      <Route path="/matches/create" element={<CreateMatchScreen />} />
      <Route path="/matches/edit-demo" element={<EditMatchScreen />} />
      <Route path="/matches/create-demo" element={<EditMatchScreen mode="create" />} />
      <Route path="/matches/:id/edit" element={<CreateMatchScreen mode="edit" />} />
      <Route path="/matches/:id" element={<MatchDetailsScreen />} />
      <Route path="/post-match/:id" element={<PostMatchScreen />} />
      <Route path="/profile" element={<ProfileScreen own />} />
      <Route path="/profile/edit" element={<EditProfileScreen />} />
      <Route path="/players/:id" element={<ProfileScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/safety/blocked" element={<BlockedListScreen />} />
      <Route path="/safety/report" element={<ReportPlayerScreen />} />
      <Route path="/safety/report/:userId" element={<ReportPlayerScreen />} />
      <Route path="/safety/problem" element={<ReportProblemScreen />} />
      <Route path="/safety/guidelines" element={<GuidelinesScreen />} />
      <Route path="/welcome" element={<SplashScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignUpScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      {/* sign-up questionnaire — Q1 age (hard gate) → Q2 sport → Q3 skill */}
      <Route path="/onboarding/age" element={<AgeCheckScreen />} />
      <Route path="/onboarding/gender" element={<OnboardingGenderScreen />} />
      <Route path="/onboarding/sport" element={<OnboardingSportScreen />} />
      <Route path="/onboarding/skill" element={<OnboardingSkillScreen />} />
      <Route path="/onboarding/guidelines" element={<CommunityStandardsScreen />} />
      <Route path="/onboarding/creating" element={<CreatingAccountScreen />} />
      <Route path="/onboarding/done" element={<AllSetScreen />} />
      <Route path="/lab" element={<Lab />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
    </AuthGate>
  )
}

export default App
