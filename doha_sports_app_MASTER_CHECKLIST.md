# 🏟️ DOHA SPORTS APP — COMPLETE MASTER CHECKLIST
> Player Matching · Coach Booking · Court Booking
> Doha → Dubai → Saudi Arabia

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STAGE 1 — PLAYER MATCHING (FREE)
# Goal: 500+ active players in Doha
# Revenue: QAR 0 (free for all users)
# Company: Not needed yet
# Timeline: Month 1–10
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1.1 BUSINESS PREP
- [ ] Choose your app name
- [ ] Buy a domain name (e.g. playdoha.qa)
- [ ] Create Instagram account for the app
- [ ] Create TikTok account for the app
- [ ] Set up a Google Form for user feedback

## 1.2 DESIGN
- [ ] Choose brand colors and logo style
- [ ] Create logo (use Canva or hire designer)
- [ ] Sketch all screens on paper or Figma:
  - [ ] Splash / Welcome screen
  - [ ] Sign Up screen
  - [ ] Login screen
  - [ ] Home / Matches Feed screen
  - [ ] Post a Match screen
  - [ ] Match Detail screen
  - [ ] My Matches screen
  - [ ] Group Chat screen
  - [ ] Player Profile screen
  - [ ] Notifications screen
  - [ ] Settings screen
- [ ] Design Arabic RTL version of every screen
- [ ] Choose Arabic font: Tajawal or Cairo
- [ ] Review designs with 3–5 real users

## 1.3 TECH SETUP
- [ ] Create account on Bolt.new or Lovable.dev
- [ ] Create Supabase account and new project
- [ ] Create GitHub repository
- [ ] Connect GitHub to Vercel
- [ ] Create Stream Chat account (getstream.io)
- [ ] Create Firebase account (for push notifications)
- [ ] Store all API keys in environment variables

## 1.4 DATABASE — SUPABASE TABLES
- [ ] Create `users` table
  - [ ] id, name, email, phone, avatar_url
  - [ ] sport (Padel/Tennis/Squash/Basketball)
  - [ ] skill_level (Beginner/Intermediate/Advanced)
  - [ ] language preference (ar/en)
  - [ ] no_show_count, is_blocked, blocked_until
  - [ ] attendance_rate, created_at
- [ ] Create `matches` table
  - [ ] id, host_id, sport, venue_name
  - [ ] venue_location, date, time
  - [ ] skill_level, total_spots, spots_available
  - [ ] court_fee_total, fee_per_player (display only)
  - [ ] payment_method (cash)
  - [ ] status (open/full/cancelled/completed)
  - [ ] notes, created_at
- [ ] Create `match_players` table
  - [ ] id, match_id, player_id
  - [ ] joined_at, attended (true/false)
- [ ] Create `ratings` table
  - [ ] id, match_id, rater_id, rated_player_id
  - [ ] score (1–5), comment, created_at
- [ ] Create `no_shows` table
  - [ ] id, match_id, player_id, recorded_by
  - [ ] created_at
- [ ] Create `notifications` table
  - [ ] id, user_id, type, title_en, title_ar
  - [ ] body_en, body_ar, is_read, created_at
- [ ] Apply Row Level Security (RLS) on all tables
- [ ] Test all tables with dummy data

## 1.5 BUILD — AUTHENTICATION
- [ ] Build Splash / Welcome screen
- [ ] Build Sign Up screen
  - [ ] Name, email, password, phone
  - [ ] Sport preference selector
  - [ ] Skill level selector
  - [ ] Language preference (AR/EN)
- [ ] Build Login screen (email + password)
- [ ] Add Google Sign-In (Supabase OAuth)
- [ ] Add Apple Sign-In (Supabase OAuth)
- [ ] Build Forgot Password screen
- [ ] Build Reset Password screen
- [ ] Build user onboarding flow after sign up
- [ ] Build Profile screen (view own profile)
- [ ] Build Edit Profile screen
- [ ] Add phone number OTP verification
- [ ] Test login, logout, session persistence

## 1.6 BUILD — PLAYER MATCHING
- [ ] Build Home / Matches Feed screen
  - [ ] Match cards (sport, date, time, venue)
  - [ ] Show spots left and fee per player
  - [ ] Show host name and avatar
  - [ ] Show payment method: 💵 Cash on arrival
  - [ ] Filter by sport / skill level / date
  - [ ] Real-time updates (Supabase Realtime)
  - [ ] Empty state when no matches found
- [ ] Build Post a Match screen
  - [ ] Sport selector
  - [ ] Date and time picker
  - [ ] Venue name input
  - [ ] Venue location pin (Google Maps)
  - [ ] Skill level required selector
  - [ ] Number of spots (2/3/4)
  - [ ] Total court fee in QAR input
  - [ ] Auto-calculate per player share
  - [ ] Notes field
  - [ ] Submit button
- [ ] Build Match Detail screen
  - [ ] Full match info display
  - [ ] List of joined players
  - [ ] Spots remaining counter
  - [ ] Fee per player display
  - [ ] Cash payment reminder message
  - [ ] Join Match button (free)
  - [ ] Cancel match button (host only)
  - [ ] Open Group Chat button
- [ ] Build My Matches screen
  - [ ] Tab: Matches I Created
  - [ ] Tab: Matches I Joined
  - [ ] Show match status badge
- [ ] Build Cancel Match flow
  - [ ] Confirmation dialog
  - [ ] Notify all joined players
- [ ] Build Post-Match flow
  - [ ] Host marks attendance for each player
  - [ ] Record no-shows automatically
  - [ ] Prompt rating screen after match

## 1.7 BUILD — NO-SHOW SYSTEM
- [ ] Host attendance checklist after match time passes
- [ ] Record no-show against player profile
- [ ] 1st no-show → send warning notification to player
- [ ] 2nd no-show → block player for 14 days
- [ ] 3rd no-show after unblock → permanent block
- [ ] Show no-show count on player profile
- [ ] Show attendance rate % on player profile
- [ ] Show attendance badge on profile:
  - [ ] 🟢 Perfect (100%)
  - [ ] 🔵 Reliable (90–99%)
  - [ ] 🟡 Average (75–89%)
  - [ ] 🔴 Unreliable (below 75%)
  - [ ] ⛔ Blocked
- [ ] Host can filter: only accept 90%+ attendance players
- [ ] Host can manually block a specific player
- [ ] Blocked player sees clear message with unblock date
- [ ] Appeal button after permanent block
- [ ] 2-hour confirmation button before match
- [ ] Notify host if player doesn't confirm

## 1.8 BUILD — GROUP CHAT (STREAM CHAT)
- [ ] Set up Stream Chat SDK
- [ ] Auto-create group channel when match is posted
- [ ] Auto-add players to chat when they join
- [ ] Build Group Chat screen
  - [ ] Chat header with match name and sport icon
  - [ ] Pinned banner: venue, date, time, fee info
  - [ ] Pinned message: "💵 Pay QAR [X] cash to host"
  - [ ] Message bubbles with avatar and name
  - [ ] Text input with send button
  - [ ] Emoji picker
  - [ ] Photo / image sharing
  - [ ] Location pin sharing
  - [ ] Read receipts
  - [ ] Online / offline indicators
- [ ] Build Chat List screen (all active chats)
- [ ] Unread badge on bottom nav icon
- [ ] System messages in chat:
  - [ ] "[Name] joined the match"
  - [ ] "[Name] left the match"
  - [ ] "Match has been cancelled"
  - [ ] "Match is now full"
- [ ] Host can remove player from chat
- [ ] Chat becomes read-only after match date
- [ ] Block user button inside chat
- [ ] Report user button inside chat

## 1.9 BUILD — ARABIC / ENGLISH SUPPORT
- [ ] Install react-i18next library
- [ ] Create en.json translations file (all UI text)
- [ ] Create ar.json translations file (all UI text)
- [ ] Translate all labels, buttons, placeholders
- [ ] Translate all error messages
- [ ] Translate all push notification text
- [ ] Translate email and SMS templates
- [ ] Implement RTL layout for Arabic
- [ ] Add language toggle in app header
- [ ] Add language selector in Settings screen
- [ ] Save language preference to user profile
- [ ] Auto-detect phone language on first launch
- [ ] Apply Tajawal font for Arabic text
- [ ] Test every screen in Arabic RTL
- [ ] Fix all RTL layout issues

## 1.10 BUILD — PUSH NOTIFICATIONS (FIREBASE)
- [ ] Set up Firebase Cloud Messaging (FCM)
- [ ] Connect FCM to Supabase via Edge Functions
- [ ] Request notification permission on first login
- [ ] Save FCM device token to user profile
- [ ] Send notification: "Someone joined your match"
- [ ] Send notification: "Your match is now full"
- [ ] Send notification: "Match cancelled"
- [ ] Send notification: "New message in [Match] chat"
- [ ] Send notification: "2hr reminder before match"
- [ ] Send notification: "Please confirm attendance"
- [ ] Send notification: "No-show warning (1st)"
- [ ] Send notification: "You are blocked (2nd no-show)"
- [ ] Send notification: "Block lifted — welcome back"
- [ ] Build Notifications screen (in-app history)
- [ ] Mark notifications as read on tap
- [ ] Notification preferences in Settings

## 1.11 TESTING — STAGE 1
- [ ] Test sign up and login on mobile browser
- [ ] Test posting a match (all fields save)
- [ ] Test joining a match
- [ ] Test group chat between two accounts
- [ ] Test push notifications on real device
- [ ] Test Arabic RTL on every screen
- [ ] Test no-show recording and blocking
- [ ] Test match cancellation flow
- [ ] Test real-time feed when new match posted
- [ ] Test match full state (join button disabled)
- [ ] Test on iPhone Safari
- [ ] Test on Android Chrome
- [ ] Test on small screen (iPhone SE)
- [ ] Fix all bugs found

## 1.12 LAUNCH — STAGE 1
- [ ] Deploy to Vercel (production)
- [ ] Set up custom domain
- [ ] Set up SSL certificate (auto via Vercel)
- [ ] Set up Sentry for error tracking
- [ ] Set up Mixpanel for analytics
- [ ] Share in Doha sports WhatsApp groups
- [ ] Post launch on Instagram and TikTok
- [ ] Personally invite first 50 players
- [ ] Visit padel clubs in Doha physically
- [ ] Set up feedback Google Form
- [ ] Monitor daily: signups, matches, bugs

## 1.13 GROW — STAGE 1 (Month 4–10)
- [ ] Fix top bugs within 48 hours of reports
- [ ] Post on social media 3x per week
- [ ] Join every Doha sports group on WhatsApp
- [ ] Track weekly: active users, matches posted
- [ ] Interview users monthly for feedback
- [ ] Target: 100 users by Month 5
- [ ] Target: 250 users by Month 7
- [ ] Target: 500 users by Month 10
- [ ] Confirm app stable (less than 5 bugs/week)
- [ ] Confirm match success rate above 80%


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STAGE 2 — COACH BOOKING
# Goal: 20+ active coaches, QAR 5,000/month
# Revenue: 10% commission per session
# Company: Register DTEC Dubai
# Timeline: Month 10–18
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2.1 TRIGGER CHECKLIST (Before Starting Stage 2)
- [ ] 500+ active players confirmed
- [ ] Less than 5 bug reports per week
- [ ] Match success rate above 80%
- [ ] App stable — runs without daily fixing
- [ ] 5+ coaches already waiting to onboard
- [ ] All above ticked → START STAGE 2 ✅

## 2.2 BUSINESS — DUBAI COMPANY REGISTRATION
- [ ] Apply for DTEC license (Dubai Silicon Oasis)
  - [ ] Website: dtec.ae
  - [ ] Submit passport copy
  - [ ] Submit Qatar residency proof
  - [ ] Submit business plan summary
  - [ ] Pay AED 6,500–8,000 license fee
- [ ] Register trade name at DTEC
- [ ] Get virtual office address (AED 1,500)
- [ ] Open UAE business bank account
  - [ ] Try Airwallex (online, 48–72hrs)
  - [ ] Or Emirates NBD business account
- [ ] Apply for Tap Payments merchant account
  - [ ] Website: tappayments.com
  - [ ] Submit Dubai trade license
  - [ ] Enable QAR currency (Qatar)
  - [ ] Enable AED currency (UAE future)
  - [ ] Enable NAPS (Qatar local debit)
  - [ ] Enable Apple Pay
  - [ ] Enable Google Pay
  - [ ] Get sandbox API keys first
  - [ ] Test all payments in sandbox
  - [ ] Switch to live mode before launch

## 2.3 RECRUIT COACHES (Before Building)
- [ ] Reach out to padel coaches in Doha
- [ ] Reach out to tennis coaches in Doha
- [ ] Set commission terms (you take 10%)
- [ ] Get 10–15 coaches committed before launch
- [ ] Collect coach documents for verification:
  - [ ] Qatar ID or QID copy
  - [ ] Coaching certification
  - [ ] Profile photo
  - [ ] Bank IBAN for payouts

## 2.4 DATABASE — NEW SUPABASE TABLES
- [ ] Create `coaches` table
  - [ ] id, user_id, sport, bio, certifications
  - [ ] hourly_rate, rating, total_sessions
  - [ ] is_verified, is_active, created_at
- [ ] Create `coach_availability` table
  - [ ] id, coach_id, day_of_week
  - [ ] start_time, end_time, is_blocked
- [ ] Create `coach_sessions` table
  - [ ] id, coach_id, player_id, date, time
  - [ ] session_type, duration, price, commission
  - [ ] status, payment_status, created_at
- [ ] Create `coach_packages` table
  - [ ] id, coach_id, name, sessions_count
  - [ ] total_price, is_active
- [ ] Create `coach_reviews` table
  - [ ] id, coach_id, player_id, session_id
  - [ ] rating, comment, coach_reply, created_at
- [ ] Create `payments` table
  - [ ] id, user_id, reference_id, reference_type
  - [ ] amount, currency, tap_payment_id
  - [ ] status, created_at
- [ ] Create `payouts` table
  - [ ] id, recipient_id, recipient_type
  - [ ] amount, currency, iban
  - [ ] status, created_at

## 2.5 BUILD — COACH ONBOARDING
- [ ] Build coach sign up flow
- [ ] Build coach profile setup screen
  - [ ] Photo upload
  - [ ] Sport speciality selector
  - [ ] Bio and experience text
  - [ ] Certification upload
  - [ ] Hourly rate input
  - [ ] Session types offered
  - [ ] Courts they work at in Doha
- [ ] Build coach availability calendar
  - [ ] Set weekly recurring availability
  - [ ] Block specific dates
  - [ ] Set session duration options
- [ ] Build coach IBAN input for payouts
- [ ] Build coach verification submission screen
- [ ] Admin approves coach in admin panel
- [ ] Send approval notification to coach
- [ ] Verified badge shown on coach profile

## 2.6 BUILD — COACH DISCOVERY (PLAYER SIDE)
- [ ] Build Coaches listing page
  - [ ] Coach cards (photo, name, sport, rating, price)
  - [ ] Filter by sport / price / rating / availability
  - [ ] Sort by rating / price / most booked
  - [ ] Search by coach name
- [ ] Build Coach profile page
  - [ ] Full bio and certifications
  - [ ] Rating and total sessions count
  - [ ] Player reviews section
  - [ ] Availability calendar
  - [ ] Session packages offered
  - [ ] Book Now button

## 2.7 BUILD — COACH BOOKING FLOW
- [ ] Build date and time slot selector
- [ ] Build session type selector
  - [ ] Individual (1-on-1)
  - [ ] Group session
- [ ] Build booking summary screen
  - [ ] Session details
  - [ ] Price breakdown:
    - [ ] Session fee
    - [ ] Platform fee (10%)
    - [ ] Total to pay
  - [ ] Cancellation policy display
- [ ] Build Tap Payments checkout screen
  - [ ] Card payment form
  - [ ] Apple Pay button
  - [ ] Google Pay button
  - [ ] NAPS button
- [ ] Build booking confirmation screen
- [ ] Send confirmation to player (notification + email)
- [ ] Send booking notification to coach
- [ ] Block booked time in coach calendar
- [ ] Build My Sessions screen (player view)
  - [ ] Upcoming sessions tab
  - [ ] Past sessions tab
  - [ ] Cancel session button
- [ ] Build My Bookings screen (coach view)
  - [ ] Upcoming bookings
  - [ ] Past bookings
  - [ ] Player details per booking

## 2.8 BUILD — PAYMENTS AND PAYOUTS
- [ ] Integrate Tap Payments SDK fully
- [ ] Build escrow logic (hold payment until session)
- [ ] Auto-release payment to coach 24hrs after session
- [ ] Deduct 10% commission before payout
- [ ] Build refund logic:
  - [ ] Player cancels 48h+ → 100% refund
  - [ ] Player cancels 24–48h → 50% refund
  - [ ] Player cancels under 24h → no refund
  - [ ] Coach cancels → 100% refund + QAR 20 credit
- [ ] Build coach earnings dashboard
  - [ ] Total earned this month
  - [ ] Pending payouts
  - [ ] Session history with amounts
- [ ] Build player payment history screen
- [ ] Save all transactions to payments table

## 2.9 BUILD — REVIEWS
- [ ] Prompt player to rate coach after session
- [ ] Build rating screen
  - [ ] 1–5 star rating
  - [ ] Written review (optional)
- [ ] Display reviews on coach profile
- [ ] Allow coach to reply to reviews
- [ ] Auto-update coach overall rating

## 2.10 BUILD — COACH CHAT
- [ ] Auto-create 1-on-1 chat after booking confirmed
- [ ] Player can message coach pre-session
- [ ] Coach can share training notes post-session

## 2.11 NOTIFICATIONS — STAGE 2 NEW
- [ ] Booking confirmed (player + coach)
- [ ] Session reminder 24hrs before (player + coach)
- [ ] Session reminder 2hrs before (player + coach)
- [ ] Payment received (coach)
- [ ] Payout sent to bank (coach)
- [ ] New review received (coach)
- [ ] Session cancelled (player + coach)
- [ ] Refund issued (player)

## 2.12 ADMIN PANEL — STAGE 2
- [ ] Build basic web admin dashboard
- [ ] View and approve coach applications
- [ ] View all coach bookings
- [ ] View all commission earned
- [ ] Manage refund disputes
- [ ] Suspend or remove coaches
- [ ] View coach payouts

## 2.13 TESTING — STAGE 2
- [ ] Test full coach booking flow end to end
- [ ] Test Tap Payments in sandbox mode
- [ ] Test auto-payout to coach IBAN
- [ ] Test 10% commission calculation
- [ ] Test refund for each cancellation scenario
- [ ] Test calendar blocking after booking
- [ ] Test review submission
- [ ] Test all new notifications
- [ ] Switch to Tap live mode
- [ ] Do one real test booking with real money

## 2.14 LAUNCH — STAGE 2
- [ ] Announce coach booking on Instagram/TikTok
- [ ] Notify all existing players via push notification
- [ ] Onboard first 10 coaches live
- [ ] Monitor payments daily first week
- [ ] Fix any payment issues within 24 hours

## 2.15 GROW — STAGE 2 (Month 10–18)
- [ ] Target: 10 active coaches by Month 12
- [ ] Target: 20 active coaches by Month 15
- [ ] Target: QAR 3,000/month by Month 13
- [ ] Target: QAR 5,000/month by Month 16
- [ ] Collect coach feedback monthly
- [ ] When stable → prepare Stage 3


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STAGE 3 — COURT BOOKING
# Goal: 5+ venues, QAR 10,000+/month
# Revenue: 10% commission per booking
# Company: Same Dubai company
# Timeline: Month 18–24
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3.1 TRIGGER CHECKLIST (Before Starting Stage 3)
- [ ] Stage 2 making QAR 3,000+/month consistently
- [ ] 800+ active players
- [ ] 20+ active coaches
- [ ] 3+ venue partners signed and ready
- [ ] App fully stable
- [ ] All above ticked → START STAGE 3 ✅

## 3.2 BUSINESS — VENUE PARTNERSHIPS
- [ ] Sign partnership agreement with 5+ Doha venues
- [ ] Agree 10% commission terms with each venue
- [ ] Collect venue bank IBAN for payouts
- [ ] Get venue photos, info, and court details
- [ ] Set up venue admin access to manage slots

## 3.3 DATABASE — NEW SUPABASE TABLES
- [ ] Create `venues` table
  - [ ] id, name, description, location
  - [ ] google_maps_link, sport_types
  - [ ] indoor_outdoor, facilities, photos
  - [ ] opening_hours, contact_info
  - [ ] is_verified, rating, created_at
- [ ] Create `courts` table
  - [ ] id, venue_id, name, sport_type
  - [ ] surface_type, indoor_outdoor
  - [ ] price_per_hour, max_players
- [ ] Create `court_availability` table
  - [ ] id, court_id, date
  - [ ] start_time, end_time
  - [ ] is_available, is_blocked
- [ ] Create `court_bookings` table
  - [ ] id, court_id, player_id, match_id
  - [ ] date, start_time, end_time, duration
  - [ ] total_price, commission, status
  - [ ] payment_status, qr_code, created_at
- [ ] Create `venue_reviews` table
  - [ ] id, venue_id, player_id, booking_id
  - [ ] rating, comment, venue_reply, created_at
- [ ] Create `wallet` table
  - [ ] id, user_id, balance, currency (QAR)
- [ ] Create `wallet_transactions` table
  - [ ] id, wallet_id, type, amount
  - [ ] description, reference_id, created_at
- [ ] Update `matches` table (add court_booking_id)

## 3.4 BUILD — VENUE ONBOARDING
- [ ] Build venue sign up flow
- [ ] Build venue profile setup screen
  - [ ] Name, description, location
  - [ ] Sport types, indoor/outdoor
  - [ ] Facilities checklist
  - [ ] Opening hours
  - [ ] Photo gallery upload
  - [ ] Contact info
- [ ] Build court setup screen per venue
- [ ] Build venue availability management
  - [ ] Set opening/closing times
  - [ ] Block dates (maintenance/holidays)
- [ ] Build venue IBAN input
- [ ] Admin approves venue in admin panel
- [ ] Send approval notification to venue

## 3.5 BUILD — COURT DISCOVERY (PLAYER SIDE)
- [ ] Build Venues listing page
  - [ ] Venue cards (photo, name, sport, rating, price)
  - [ ] Map view (Google Maps with pins)
  - [ ] List view toggle
  - [ ] Filter by sport / indoor-outdoor / price / rating
  - [ ] Sort by price / rating / distance
  - [ ] Search by venue name
- [ ] Build Venue detail page
  - [ ] Photo gallery
  - [ ] Venue info and facilities
  - [ ] Location map
  - [ ] Player reviews
  - [ ] Courts available
  - [ ] Book a Court button
- [ ] Build Court selection screen

## 3.6 BUILD — COURT BOOKING FLOW
- [ ] Build date picker screen
- [ ] Build time slot grid
  - [ ] Green: available
  - [ ] Grey: booked
  - [ ] Red: blocked
  - [ ] Real-time updates (Supabase Realtime)
- [ ] Build duration selector (1hr/1.5hr/2hr)
- [ ] Build booking summary screen
  - [ ] Court and venue details
  - [ ] Date, time, duration
  - [ ] Price breakdown (fee + 10%)
  - [ ] Cancellation policy
- [ ] Build Tap Payments checkout
  - [ ] Card / Apple Pay / Google Pay / NAPS
  - [ ] Pay from wallet balance option
- [ ] Build booking confirmation screen
  - [ ] Booking reference number
  - [ ] QR code for court entry
  - [ ] Add to calendar button
  - [ ] Share via WhatsApp button
  - [ ] "Find players for this match" prompt
- [ ] Block booked slot in real time
- [ ] Notify venue of new booking

## 3.7 BUILD — PLAYER MATCHING INTEGRATION
- [ ] After court booking → prompt to post open match
- [ ] Pre-fill match details from court booking
- [ ] Auto-calculate fee per player from booking
- [ ] While posting match → prompt to book a court
- [ ] Show court details on match card
- [ ] Show QR code in group chat for all players

## 3.8 BUILD — IN-APP WALLET
- [ ] Build My Wallet screen
  - [ ] Current balance display
  - [ ] Top up button
  - [ ] Transaction history
- [ ] Build wallet top-up flow via Tap Payments
- [ ] Enable pay from wallet on all checkouts
- [ ] Build referral credit system
  - [ ] Invite friend → both get QAR 20 credit
  - [ ] Track referrals in Supabase
- [ ] Refunds go to wallet balance

## 3.9 BUILD — VENUE PAYOUT SYSTEM
- [ ] Auto-release payment to venue 24hrs after booking
- [ ] Deduct 10% commission before payout
- [ ] Build venue earnings dashboard
  - [ ] Total earned this month
  - [ ] Pending payouts
  - [ ] Booking history with commission
- [ ] Cancellation logic:
  - [ ] Player cancels 48h+ → 100% refund
  - [ ] Player cancels 24–48h → 50% refund
  - [ ] Player cancels under 24h → no refund
  - [ ] Venue cancels → 100% refund + QAR 20 credit

## 3.10 BUILD — VENUE REVIEWS
- [ ] Prompt player to rate venue after booking
- [ ] Build venue rating screen (stars per category)
- [ ] Display reviews on venue listing
- [ ] Allow venue to reply to reviews
- [ ] Auto-update venue overall rating

## 3.11 NOTIFICATIONS — STAGE 3 NEW
- [ ] Court booking confirmed (player + venue)
- [ ] Booking reminder 24hrs before (player)
- [ ] Booking reminder 2hrs before (player)
- [ ] New booking received (venue)
- [ ] Payout sent to bank (venue)
- [ ] Booking cancelled (player + venue)
- [ ] Refund issued (player)
- [ ] Wallet top-up confirmed
- [ ] Wallet credit received (referral)

## 3.12 ADMIN PANEL — STAGE 3 ADDITIONS
- [ ] Approve venue applications
- [ ] View all court bookings
- [ ] View combined commission (courts + coaches)
- [ ] Manage venue disputes
- [ ] Suspend or remove venues
- [ ] View wallet balances
- [ ] Manage referral credits

## 3.13 TESTING — STAGE 3
- [ ] Test full court booking end to end
- [ ] Test real-time slot blocking (2 devices)
- [ ] Test Tap Payments for court bookings
- [ ] Test wallet top-up and payment
- [ ] Test auto-payout to venue IBAN
- [ ] Test player matching + court integration
- [ ] Test QR code generation
- [ ] Test all new notifications
- [ ] Test on iPhone and Android
- [ ] Do real test booking with real venue

## 3.14 LAUNCH — STAGE 3
- [ ] Announce court booking on social media
- [ ] Notify all players via push notification
- [ ] Go live with first 3–5 venue partners
- [ ] Monitor bookings and payments daily
- [ ] Fix any issues within 24 hours

## 3.15 GROW — STAGE 3 (Month 18–24)
- [ ] Target: 5 venues by Month 19
- [ ] Target: 10 venues by Month 22
- [ ] Target: QAR 8,000/month by Month 20
- [ ] Target: QAR 15,000/month by Month 24
- [ ] Target: 1,000+ active players by Month 24


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STAGE 4 — EXPAND TO DUBAI
# Goal: Same app, add Dubai city
# Revenue: AED commissions added
# Company: Same DTEC Dubai company
# Timeline: Month 24+
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4.1 TRIGGER CHECKLIST (Before Expanding)
- [ ] Doha running without daily attention
- [ ] Making QAR 10,000+/month from Doha
- [ ] Less than 3 bug reports per week
- [ ] Strong positive user reviews
- [ ] Energy and bandwidth to manage 2 cities
- [ ] All above ticked → START STAGE 4 ✅

## 4.2 APP CHANGES FOR DUBAI
- [ ] Add city selector (Doha / Dubai / All)
- [ ] Add city field to all match and venue data
- [ ] Add AED currency display for Dubai
- [ ] Filter matches/coaches/venues by city
- [ ] Separate push notifications per city
- [ ] Add Dubai venues to listing
- [ ] Add Dubai coaches to directory

## 4.3 DUBAI MARKET SETUP
- [ ] Activate AED currency on Tap Payments
- [ ] Find 5+ Dubai venue partners
- [ ] Recruit 10+ Dubai coaches before launch
- [ ] Join Dubai padel and tennis WhatsApp groups
- [ ] Create Dubai-specific Instagram content
- [ ] Soft launch with 50 beta users in Dubai
- [ ] Monitor Dubai-specific issues separately

## 4.4 GROW — DUBAI (Month 24–30)
- [ ] Target: 300 active Dubai players by Month 26
- [ ] Target: 10 Dubai coaches by Month 26
- [ ] Target: 3 Dubai venues by Month 27
- [ ] Target: AED 5,000/month from Dubai by Month 28
- [ ] Combined Doha + Dubai: QAR 20,000+/month


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STAGE 5 — EXPAND TO SAUDI ARABIA
# Goal: Riyadh first, then Jeddah
# Revenue: SAR commissions
# Timeline: Month 30+
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5.1 TRIGGER CHECKLIST
- [ ] Dubai stable and profitable
- [ ] Making QAR 20,000+/month combined
- [ ] Team or support to manage Saudi
- [ ] All above ticked → START STAGE 5 ✅

## 5.2 SAUDI APP CHANGES
- [ ] Add Riyadh and Jeddah to city selector
- [ ] Add SAR currency via Tap Payments
- [ ] Add Mada payment method (Saudi local)
- [ ] Add STC Pay
- [ ] Review Arabic translations for Saudi dialect
- [ ] Add gender-aware scheduling if needed
- [ ] Research Saudi company requirements

## 5.3 SAUDI MARKET SETUP
- [ ] Research Vision 2030 sports initiatives
- [ ] Find Riyadh venue partners
- [ ] Recruit Riyadh coaches
- [ ] Hire local Saudi community manager
- [ ] Launch Riyadh first → then Jeddah


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ONGOING — ALL STAGES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ONGOING OPERATIONS
- [ ] Monitor Sentry for errors daily
- [ ] Check Mixpanel analytics weekly
- [ ] Respond to user feedback within 24hrs
- [ ] Push app updates every 2 weeks
- [ ] Post on Instagram and TikTok 3x/week
- [ ] Run Ramadan promotions every year
- [ ] Monthly review: revenue vs costs
- [ ] Quarterly review: features to add

## FUTURE FEATURES (After Stage 3)
- [ ] Tournament and league management
- [ ] Corporate packages and team events
- [ ] Sports equipment rental
- [ ] Loyalty points system
- [ ] Premium player subscription (QAR 39/month)
- [ ] Featured venue listings (QAR 500/month)
- [ ] Video coaching sessions
- [ ] Live match scoring

---

# REVENUE SUMMARY

| Stage | Monthly Revenue | Company Cost | Net Profit |
|---|---|---|---|
| Stage 1 | QAR 0 | QAR 0 | QAR 0 |
| Stage 2 | QAR 3,000–5,000 | QAR 917 | QAR 2,000–4,000 |
| Stage 3 | QAR 10,000–15,000 | QAR 917 | QAR 9,000–14,000 |
| Stage 4 (+ Dubai) | QAR 20,000–30,000 | QAR 917 | QAR 19,000–29,000 |
| Stage 5 (+ Saudi) | QAR 50,000–80,000 | QAR 917 | QAR 49,000–79,000 |

---

# TIMELINE SUMMARY

| Month | Milestone |
|---|---|
| 1–2 | Build Stage 1 app |
| 3 | Beta test Doha |
| 4 | 🚀 Launch Stage 1 Doha (free) |
| 4–10 | Grow to 500+ active players |
| 10 | Register DTEC Dubai company |
| 11 | 🚀 Launch Stage 2 — Coach booking |
| 15 | 🚀 Launch Stage 3 — Court booking |
| 18 | Doha fully stable + profitable |
| 20 | 🚀 Soft launch Dubai |
| 24 | Dubai stable |
| 30 | 🚀 Launch Saudi Arabia |
