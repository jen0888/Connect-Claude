import { Navigate, Route, Routes } from 'react-router-dom'
import { Lab } from '@/screens/Lab'
import { HomeScreen } from '@/screens/home/HomeScreen'
import { DiscoverScreen } from '@/screens/discover/DiscoverScreen'
import { AllMatchesScreen } from '@/screens/matches/AllMatchesScreen'
import { CreateMatchScreen } from '@/screens/matches/CreateMatchScreen'
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
  OnboardingSkillScreen,
  OnboardingSportScreen,
  ResetPasswordScreen,
  SignUpScreen,
  SplashScreen,
} from '@/screens/auth/AuthScreens'
import { CommunityStandardsScreen } from '@/screens/auth/CommunityStandardsScreen'

/** Route map — 3 tabs (Discover · Home · Chat), Home is the default
 *  landing tab (CLAUDE.md §4). Screens land here as they're built. */
function App() {
  return (
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
      <Route path="/onboarding/sport" element={<OnboardingSportScreen />} />
      <Route path="/onboarding/skill" element={<OnboardingSkillScreen />} />
      <Route path="/onboarding/guidelines" element={<CommunityStandardsScreen />} />
      <Route path="/onboarding/creating" element={<CreatingAccountScreen />} />
      <Route path="/onboarding/done" element={<AllSetScreen />} />
      <Route path="/lab" element={<Lab />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
