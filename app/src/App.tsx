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
import { GroupChatScreen } from '@/screens/chat/GroupChatScreen'
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
  useHydrated() // keep subscribed so screens re-render when the snapshot lands
  const { pathname } = useLocation()
  if (!isSupabaseConfigured) return <>{children}</>
  if (loading) return null // brief: waiting on getSession()
  if (!session && !PUBLIC_PATHS.has(pathname)) return <Navigate to="/login" replace />
  // NOTE: we deliberately DO NOT block on `hydrated` anymore. Holding the screen
  // until the first snapshot lands meant a hung/failed hydrate left the app on a
  // permanent blank page. Screens are now crash-safe against an empty `db`
  // (Home falls back to FirstTimerHome when `getUser` is undefined), so we render
  // immediately and let the live data fill in on the next snapshot/emit.
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
      <Route path="/chat/group/:threadId" element={<GroupChatScreen />} />
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
