import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Coins,
  Lock,
  LockOpen,
  MailPlus,
  MapPin,
  Plus,
  Sparkles,
  TriangleAlert,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { CTA, DualSlider, MiniMap, PlayerDots, Segmented, Slider, Toggle } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { getUser, useDB } from '@/lib/store'
import { clearPersistedState, usePersistedState } from '@/lib/usePersistedState'
import type { JoinMode, Sport } from '@/lib/types'
import { clearHostedMatch, readHostedMatch, writeHostedMatch, type HostedMatch } from '@/lib/hostedMatch'
import { keyOf, labelFromKey } from '@/lib/datetime'
import { sportEmoji } from '@/lib/sports'
import { VenuePicker, type VenueSelection } from './VenuePicker'
import { InvitePicker } from './InvitePicker'
import { WhenCard } from './WhenCard'

/** Edit Match — the create-match form rendered in "edit" mode (Editorial Calm).
 *  Same single long scroll as create, pre-filled from the live match, with
 *  edit-specific header copy ("Edit your match") and footer actions
 *  (Save changes + Cancel match). Self-contained around the seed below so it
 *  renders faithfully without touching the create flow or the store schema. */

const SPORTS: { id: Sport; label: string }[] = [
  { id: 'padel', label: 'Padel' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'running', label: 'Running' },
]

const LEVEL_NAMES = ['Baby', 'Beginner', 'Low int.', 'High int.', 'Advanced']
const cardCls = 'rounded-[22px] border bg-card'
const cardStyle = { borderColor: 'rgba(26,26,26,0.10)' }
const hairline = 'rgba(26,26,26,0.10)'

function FieldRow({
  label,
  hint,
  rightLabel,
  children,
}: {
  label: string
  hint?: string
  rightLabel?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-[13.5px] font-medium text-ink">{label}</div>
          {hint && (
            <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
              {hint}
            </div>
          )}
        </div>
        {rightLabel}
      </div>
      {children}
    </div>
  )
}

const Divider = () => <div className="h-px" style={{ background: hairline }} />

/** Pre-filled match (the live match the host is editing). */
const SEED = {
  sport: 'padel' as Sport,
  name: 'Thursday singles',
  dateKey: '2024-05-23',
  startTime: '19:00',
  endTime: '20:00',
  matchType: 'casual' as 'casual' | 'competition',
  gender: 'mixed' as 'mixed' | 'ladies',
  joinMode: 'open' as JoinMode,
  invitedPlayerIds: [] as string[],
  isFree: false,
  pricePerPlayer: '25',
  players: 2,
  minLevel: 2,
  maxLevel: 4,
  waitlistOpen: false,
  waitlistSize: 3,
  description: '',
  venue: { id: 'custom', name: 'Padel In', area: 'Aspire Zone', setting: 'Indoor', court: '2' } as VenueSelection,
}

/** Create mode opens blank/new — no pre-loaded match data. Same shape as SEED. */
const CREATE_DEFAULTS = {
  sport: 'padel' as Sport,
  name: '',
  dateKey: '2024-05-20',
  startTime: '18:30',
  endTime: '20:00',
  matchType: 'casual' as 'casual' | 'competition',
  gender: 'mixed' as 'mixed' | 'ladies',
  joinMode: 'open' as JoinMode,
  invitedPlayerIds: [] as string[],
  isFree: false,
  pricePerPlayer: '',
  players: 4,
  minLevel: 2,
  maxLevel: 4,
  waitlistOpen: false,
  waitlistSize: 1,
  description: '',
  venue: null as VenueSelection | null,
}

/** Shared Create/Edit match form (Editorial Calm). One component, `mode`-driven
 *  so create and edit never drift: edit pre-fills from the live match
 *  (localStorage source of truth) and saves "Save changes"; create opens blank
 *  and saves "Create match". Both write the hosted match and route to Home. */
export function EditMatchScreen({ mode = 'edit' }: { mode?: 'create' | 'edit' } = {}) {
  const isCreate = mode === 'create'
  const fallback = isCreate ? CREATE_DEFAULTS : SEED
  const navigate = useNavigate()
  const { showToast } = useToast()
  const db = useDB()

  // Edit pre-fills from the live match (localStorage source of truth); create
  // opens from blank defaults with nothing pre-loaded. Read once on mount.
  const stored = useMemo(() => (isCreate ? null : readHostedMatch()), [isCreate])
  const storedVenue: VenueSelection | null = stored
    ? stored.isRoute
      ? { id: 'route', name: stored.venueName, area: '', setting: '', court: '', endName: stored.routeEnd ?? '', loop: stored.loop, km: stored.km }
      : { id: 'custom', name: stored.venueName, area: stored.area, setting: stored.setting as VenueSelection['setting'], court: stored.court }
    : fallback.venue

  // Draft persistence: only "create" (the New match path) keeps a draft across
  // refreshes — edit mode reads from the live hosted match, so `dk()` returns
  // null there. The draft is cleared once a match is created.
  const dk = (field: string) => (isCreate ? `match:create-demo:${field}` : null)

  const [sport, setSport] = usePersistedState<Sport>(dk('sport'), stored?.sport ?? fallback.sport)
  const [name, setName] = usePersistedState(dk('name'), stored?.name ?? fallback.name)
  const [dateKey, setDateKey] = usePersistedState(dk('dateKey'), stored?.dateKey ?? (isCreate ? keyOf(new Date()) : fallback.dateKey))
  const [startTime, setStartTime] = usePersistedState(dk('startTime'), stored?.startTime ?? fallback.startTime)
  const [endTime, setEndTime] = usePersistedState(dk('endTime'), stored?.endTime ?? fallback.endTime)
  const [matchType, setMatchType] = usePersistedState(dk('matchType'), stored?.matchType ?? fallback.matchType)
  const [gender, setGender] = usePersistedState(dk('gender'), stored?.gender ?? fallback.gender)
  // Host picks how many players they NEED (others); they hold one more spot, so
  // total roster = needed + 1 and the card reads "{needed} spots left". Stored
  // HostedMatch.players stays the total; map it back to needed on load.
  const [needed, setNeeded] = usePersistedState(dk('players'), (stored?.players ?? fallback.players) - 1)
  const totalSpots = needed + 1
  const [minLevel, setMinLevel] = usePersistedState(dk('minLevel'), stored?.minLevel ?? fallback.minLevel)
  const [maxLevel, setMaxLevel] = usePersistedState(dk('maxLevel'), stored?.maxLevel ?? fallback.maxLevel)
  const [isFree, setIsFree] = usePersistedState(dk('isFree'), stored?.isFree ?? fallback.isFree)
  const [pricePerPlayer, setPricePerPlayer] = usePersistedState(dk('pricePerPlayer'), stored?.pricePerPlayer ?? fallback.pricePerPlayer)
  // joinMode supersedes the old binary requireApproval; fall back to it for
  // any match persisted before invite-only existed.
  const [joinMode, setJoinMode] = usePersistedState<JoinMode>(dk('joinMode'), stored?.joinMode ?? (stored?.requireApproval ? 'approval' : undefined) ?? fallback.joinMode)
  const [invitedPlayerIds, setInvitedPlayerIds] = usePersistedState<string[]>(dk('invitedPlayerIds'), stored?.invitedPlayerIds ?? fallback.invitedPlayerIds)
  const [waitlistOpen, setWaitlistOpen] = usePersistedState(dk('waitlistOpen'), stored?.waitlistOpen ?? fallback.waitlistOpen)
  const [waitlistSize, setWaitlistSize] = usePersistedState(dk('waitlistSize'), stored?.waitlistSize ?? fallback.waitlistSize)
  const [description, setDescription] = usePersistedState(dk('description'), stored?.description ?? fallback.description)
  const [venue, setVenue] = usePersistedState<VenueSelection | null>(dk('venue'), storedVenue)

  const [showVenue, setShowVenue] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  const isRoute = venue?.id === 'route' || !!venue?.endName
  const venueCompatible = venue != null && (sport === 'running' ? isRoute : !isRoute)
  const dateLabel = labelFromKey(dateKey)

  const save = () => {
    const next: HostedMatch = {
      sport,
      name: name.trim() || 'Untitled match',
      dateKey,
      dateLabel,
      startTime,
      endTime,
      matchType,
      gender,
      joinMode,
      requireApproval: joinMode === 'approval', // derived for older readers
      invitedPlayerIds: joinMode === 'invite' ? invitedPlayerIds : [],
      isFree,
      pricePerPlayer: isFree ? '' : pricePerPlayer,
      players: totalSpots,
      filled: 1, // host always holds the first spot
      minLevel,
      maxLevel,
      waitlistOpen,
      waitlistSize,
      description: description.trim(),
      venueName: venue?.name ?? '',
      area: venue?.area ?? '',
      setting: venue?.setting ?? '',
      court: venue?.court ?? '',
      isRoute,
      routeEnd: isRoute ? (venue?.loop ? venue?.name : venue?.endName) : undefined,
      loop: isRoute ? venue?.loop : undefined,
      km: isRoute ? venue?.km : undefined,
    }
    writeHostedMatch(next)
    if (isCreate) clearPersistedState('match:create-demo:') // draft committed — reset for next time
    showToast(isCreate ? 'Match created' : 'Changes saved')
    navigate('/home') // save-then-route: Create/Edit → Home + transient toast
  }
  const cancelMatch = () => {
    setShowCancel(false)
    clearHostedMatch() // removing the hosted match hides the Home card
    showToast('Match cancelled')
    navigate('/home')
  }

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        <div className="scroll-area relative z-1 flex-1 overflow-y-auto px-[22px] pt-14 pb-[140px]">
          {/* back */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="mb-2 inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.05)' }}
          >
            <ArrowLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>

          {/* hero */}
          <div className="pt-2 pb-[22px]">
            <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
              {isCreate ? 'New match' : "You're hosting"} · {dateLabel}
            </div>
            <h1 className="m-0 font-display text-[40px] font-normal leading-none" style={{ letterSpacing: '-0.022em', textWrap: 'balance' }}>
              {isCreate ? (
                <>
                  Host <span className="italic text-brand">a match</span>.
                </>
              ) : (
                <>
                  Edit <span className="italic text-brand">your match</span>.
                </>
              )}
            </h1>
          </div>

          {/* sport pills */}
          <div className="hscroll -ms-0.5 gap-2 pb-3.5">
            {SPORTS.map((s) => {
              const on = sport === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSport(s.id)}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-pill px-4 py-2.5 text-[13px] font-medium tracking-[0.01em]"
                  style={{
                    border: `1.5px solid ${on ? 'var(--color-brand)' : 'rgba(26,26,26,0.18)'}`,
                    background: on ? 'var(--color-brand)' : 'transparent',
                    color: on ? 'var(--color-text-onbrand)' : 'var(--color-text)',
                  }}
                >
                  <span className="text-[16px] leading-none">{sportEmoji(s.id)}</span>
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* match name */}
          <div className="mt-3">
            <label className="text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
              Match name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name your match"
              className="mt-1.5 block w-full border-0 border-b bg-transparent pb-2 font-display text-[24px] leading-tight text-ink outline-none placeholder:opacity-40"
              style={{ borderBottomColor: 'rgba(26,26,26,0.18)' }}
            />
          </div>

          {/* When */}
          <div className="mt-6">
            <WhenCard
              dateKey={dateKey}
              onDateKey={setDateKey}
              startTime={startTime}
              onStartTime={setStartTime}
              endTime={endTime}
              onEndTime={setEndTime}
              restrictPast={isCreate}
            />
          </div>

          {/* Where */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Where</Eyebrow>
            <div className={`mt-3 overflow-hidden ${cardCls}`} style={cardStyle}>
              <div className="relative h-[110px]">
                <MiniMap height={110} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.18))' }} />
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  {!venueCompatible ? (
                    <>
                      <div className="font-display text-[20px] leading-[1.15]" style={{ color: 'rgba(26,26,26,0.45)' }}>
                        Add a location
                      </div>
                      <div className="mt-1 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                        {sport === 'running' ? 'Set a start and finish point.' : 'Pick a court for your match.'}
                      </div>
                    </>
                  ) : isRoute ? (
                    <div className="flex gap-[11px]">
                      {/* route spine */}
                      <div className="flex shrink-0 flex-col items-center pt-[5px]">
                        <span className="h-[9px] w-[9px] rounded-full bg-brand" />
                        <span className="my-[3px] min-h-5 w-0.5 flex-1 rounded-pill opacity-60" style={{ background: 'rgba(26,26,26,0.18)' }} />
                        <span className="box-border h-[9px] w-[9px] rounded-full" style={{ border: '1.5px solid rgba(26,26,26,0.18)' }} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
                        <div>
                          <div className="mb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
                            Start
                          </div>
                          <div className="font-display text-[17px] leading-[1.15]" style={{ letterSpacing: '-0.01em' }}>
                            {venue!.name}
                          </div>
                        </div>
                        <div>
                          <div className="mb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
                            Finish
                          </div>
                          <div className="font-display text-[17px] leading-[1.15]" style={{ letterSpacing: '-0.01em' }}>
                            {venue!.loop ? <span className="italic text-brand">Loop · back to start</span> : venue!.endName}
                          </div>
                        </div>
                        {!!venue!.km && (
                          <span
                            className="mt-0.5 inline-flex w-fit items-center rounded-pill px-2.5 py-1 text-[11px] font-semibold nums-tabular"
                            style={{ background: 'rgba(199,106,72,0.12)', color: 'var(--color-brand)' }}
                          >
                            {venue!.km} km loop
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-display text-[20px] leading-[1.15]">
                        {venue!.name}
                        {venue!.court && <span className="italic text-brand"> · Court {venue!.court}</span>}
                      </div>
                      {(venue!.area || venue!.setting) && (
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="inline-flex min-w-0 items-center gap-1 truncate">
                            <MapPin size={12} strokeWidth={1.8} className="shrink-0" /> {venue!.area}
                          </span>
                          {venue!.setting && (
                            <>
                              <span className="opacity-40">·</span>
                              <span>{venue!.setting}</span>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowVenue(true)}
                  className="shrink-0 cursor-pointer rounded-pill bg-transparent px-3.5 py-2 text-[12px] font-medium text-ink"
                  style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
                >
                  {venueCompatible ? 'Change' : 'Choose a location'}
                </button>
              </div>
            </div>
          </div>

          {/* Vibe */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Vibe</Eyebrow>
            <div className={`mt-3 flex flex-col gap-[18px] p-[18px] ${cardCls}`} style={cardStyle}>
              <FieldRow label="Match type" hint={matchType === 'casual' ? 'Just for fun.' : 'Ranked & rated.'}>
                <Segmented
                  value={matchType}
                  onChange={setMatchType}
                  options={[
                    { value: 'casual', label: 'Casual', icon: <Sparkles size={14} strokeWidth={1.8} /> },
                    { value: 'competition', label: 'Competition', icon: <Trophy size={14} strokeWidth={1.8} /> },
                  ]}
                />
              </FieldRow>

              <Divider />

              <FieldRow label="Open to" hint={gender === 'mixed' ? 'Any gender welcome.' : 'Female players only.'}>
                <Segmented
                  value={gender}
                  onChange={setGender}
                  options={[
                    { value: 'mixed', label: 'Mixed', icon: <Users size={14} strokeWidth={1.8} /> },
                    { value: 'ladies', label: 'Ladies only', icon: <UserRound size={14} strokeWidth={1.8} /> },
                  ]}
                />
              </FieldRow>
            </div>
          </div>

          {/* Players */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Players</Eyebrow>
            <div className={`mt-3 flex flex-col gap-[18px] p-[18px] ${cardCls}`} style={cardStyle}>
              <FieldRow
                label="Players needed"
                hint="Not counting you — you're already in."
                rightLabel={
                  <span className="font-display text-[28px] leading-none nums-tabular">
                    {needed}
                    <span className="text-[14px] italic" style={{ color: 'var(--color-text-muted)' }}>
                      {' '}
                      {needed === 1 ? 'player' : 'players'}
                    </span>
                  </span>
                }
              >
                <div className="mt-2 flex items-center gap-3.5">
                  <PlayerDots filled={1} total={totalSpots} size={28} />
                </div>
                <div className="mt-3">
                  <Slider value={needed} min={1} max={7} onChange={setNeeded} ticks={['1', '2', '3', '4', '5', '6', '7']} />
                </div>
              </FieldRow>

              <Divider />

              <FieldRow
                label="Skill level"
                rightLabel={
                  <span className="text-[12.5px] font-medium text-ink">
                    {LEVEL_NAMES[minLevel - 1]} <span style={{ color: 'var(--color-text-muted)' }}>→</span> {LEVEL_NAMES[maxLevel - 1]}
                  </span>
                }
              >
                <div className="mt-2.5">
                  <DualSlider
                    value={[minLevel, maxLevel]}
                    min={1}
                    max={5}
                    onChange={([lo, hi]) => {
                      setMinLevel(lo)
                      setMaxLevel(hi)
                    }}
                    ticks={['Baby', 'Beg', 'Low int.', 'High int.', 'Adv']}
                  />
                </div>
              </FieldRow>
            </div>
          </div>

          {/* Rules */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Rules</Eyebrow>
            <div className={`mt-3 flex flex-col gap-[18px] p-[18px] ${cardCls}`} style={cardStyle}>
              <FieldRow label="Cost" hint={isFree ? 'No cost per player.' : 'Players will split the cost.'}>
                <Segmented
                  value={isFree}
                  onChange={setIsFree}
                  options={[
                    { value: true, label: 'Free to join', icon: <Sparkles size={14} strokeWidth={1.8} /> },
                    { value: false, label: 'Split the cost', icon: <Coins size={14} strokeWidth={1.8} /> },
                  ]}
                />
                {!isFree && (
                  <div className="mt-3.5">
                    <div className="flex items-center gap-3.5">
                      <div className="flex-1">
                        <div className="text-[13.5px] font-medium">Price per player</div>
                        <div className="mt-0.5 text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                          Total court fee · QAR {((parseFloat(pricePerPlayer) || 0) * totalSpots).toFixed(0)}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-md bg-page px-3.5 py-2" style={{ border: '1px solid rgba(26,26,26,0.10)' }}>
                        <span className="text-[12.5px] font-semibold leading-none tracking-[0.06em]" style={{ color: 'var(--color-text-muted)' }}>
                          QAR
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={pricePerPlayer}
                          onChange={(e) => setPricePerPlayer(e.target.value.replace(/[^0-9]/g, ''))}
                          className="num w-16 border-none bg-transparent py-0.5 text-end font-display text-[24px] leading-none text-ink outline-none"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2.5 rounded-[14px] px-3.5 py-3" style={{ background: 'rgba(26,26,26,0.06)' }}>
                      <Coins size={14} strokeWidth={1.8} className="mt-px shrink-0 text-brand" />
                      <div className="text-[11.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                        Connect doesn't handle payments. Players settle with you directly —{' '}
                        <span className="font-medium text-ink">cash to the host or bank transfer</span>.
                      </div>
                    </div>
                  </div>
                )}
              </FieldRow>

              <Divider />

              <FieldRow
                label="Joining"
                hint={
                  joinMode === 'open'
                    ? 'Anyone can join instantly.'
                    : joinMode === 'approval'
                      ? "You'll review each join request."
                      : 'Private — only players you invite can join.'
                }
              >
                <Segmented
                  value={joinMode}
                  onChange={setJoinMode}
                  columns={3}
                  options={[
                    { value: 'open', label: 'Open', icon: <LockOpen size={14} strokeWidth={1.8} /> },
                    { value: 'approval', label: 'Approval', icon: <Lock size={14} strokeWidth={1.8} /> },
                    { value: 'invite', label: 'Invite', icon: <MailPlus size={14} strokeWidth={1.8} /> },
                  ]}
                />

                {/* invite-only: pick the specific players you're inviting (the
                    dropdown holds no slot — first to accept fills the match, §5) */}
                {joinMode === 'invite' && (
                  <button
                    type="button"
                    onClick={() => setShowInvite(true)}
                    className="mt-3.5 flex w-full cursor-pointer items-center gap-3 rounded-[16px] border bg-page px-3.5 py-3 text-start"
                    style={{ borderColor: 'rgba(26,26,26,0.10)' }}
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(26,26,26,0.06)', color: 'var(--color-text)' }}>
                      <MailPlus size={16} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-ink">Invite players</div>
                      <div className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                        {invitedPlayerIds.length === 0
                          ? 'Choose who can join this match.'
                          : invitedPlayerIds
                              .map((pid) => getUser(db, pid)?.name.split(' ')[0])
                              .filter(Boolean)
                              .join(', ')}
                      </div>
                    </div>
                    {invitedPlayerIds.length > 0 ? (
                      <span className="inline-flex shrink-0 items-center rounded-pill bg-brand px-2.5 py-1 text-[11px] font-semibold text-onbrand nums-tabular">
                        {invitedPlayerIds.length} invited
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-pill px-3 py-1.5 text-[12px] font-medium text-brand" style={{ border: '1.5px solid color-mix(in srgb, var(--color-brand) 33%, transparent)' }}>
                        <Plus size={13} strokeWidth={2.2} /> Add
                      </span>
                    )}
                  </button>
                )}
              </FieldRow>

              <Divider />

              <div>
                {/* RowToggle */}
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'rgba(26,26,26,0.06)', color: 'var(--color-text)' }}
                  >
                    <Users size={16} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium text-ink">Waitlist open</div>
                    <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                      {waitlistOpen ? "Players can queue once it's full." : 'No queue — full means closed.'}
                    </div>
                  </div>
                  <Toggle value={waitlistOpen} onChange={setWaitlistOpen} />
                </div>

                {waitlistOpen && (
                  <>
                    <div className="my-[18px]">
                      <Divider />
                    </div>
                    {/* size stepper */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-ink">Waitlist size</div>
                        <div className="mt-0.5 text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                          Up to {waitlistSize} {waitlistSize === 1 ? 'player' : 'players'} can queue.
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          aria-label="Fewer"
                          disabled={waitlistSize <= 1}
                          onClick={() => setWaitlistSize((n) => Math.max(1, n - 1))}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink disabled:opacity-40"
                          style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
                        >
                          –
                        </button>
                        <span className="min-w-[18px] text-center font-display text-[22px] leading-none nums-tabular">{waitlistSize}</span>
                        <button
                          type="button"
                          aria-label="More"
                          disabled={waitlistSize >= 8}
                          onClick={() => setWaitlistSize((n) => Math.min(8, n + 1))}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink disabled:opacity-40"
                          style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
                        >
                          <Plus size={14} strokeWidth={2.2} />
                        </button>
                      </div>
                    </div>
                    {/* contextual note — depends on Joining */}
                    <div className="mt-3.5 rounded-[14px] px-3.5 py-3 text-[11.5px] leading-normal" style={{ background: 'rgba(26,26,26,0.06)', color: 'var(--color-text-muted)' }}>
                      {joinMode === 'approval' ? (
                        <>
                          If a player drops out, the next person on the waitlist <span className="font-medium text-ink">still needs your approval</span> before they join — they'll move up the queue and wait for your OK.
                        </>
                      ) : (
                        <>
                          If a player drops out, the next person on the waitlist <span className="font-medium text-ink">joins automatically</span> — no action needed from you.
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Description</Eyebrow>
            <div className={`mt-3 px-4 py-3.5 ${cardCls}`} style={cardStyle}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 240))}
                placeholder="Add a note for players — vibe, tactics, anything they should know…"
                rows={3}
                className="block min-h-16 w-full resize-none border-none bg-transparent p-0 text-[13.5px] leading-relaxed text-ink outline-none placeholder:italic"
                style={{ letterSpacing: '0.005em' }}
              />
              <div className="mt-1.5 flex justify-end text-[11px] font-medium nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                {description.length}/240
              </div>
            </div>
          </div>
        </div>

        {/* sticky footer */}
        <div
          className="absolute inset-x-0 bottom-0 z-5 flex flex-col items-center gap-2.5 px-[22px] pt-4 pb-[22px]"
          style={{ background: 'linear-gradient(180deg, transparent, var(--surface-page) 30%)' }}
        >
          <CTA onClick={save}>{isCreate ? 'Create match' : 'Save changes'}</CTA>
          {/* Cancel match is destructive (clears the hosted match) — only an
              existing match can be cancelled, so it's hidden while creating. */}
          {!isCreate && (
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="cursor-pointer border-none bg-transparent px-2.5 py-1.5 text-[13px] font-medium tracking-[0.01em] underline underline-offset-3"
              style={{ color: '#9b2f1f', textDecorationColor: 'rgba(155,47,31,0.35)' }}
            >
              Cancel match
            </button>
          )}
        </div>

        {/* cancel-match confirm */}
        {showCancel && (
          <div
            onClick={() => setShowCancel(false)}
            className="absolute inset-0 z-40 flex items-end justify-center p-4 backdrop-blur-[2px]"
            style={{ background: 'rgba(26,26,26,0.45)' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-[26px] bg-card px-[22px] pt-6 pb-[18px]"
              style={{ boxShadow: '0 30px 60px -20px rgba(26,26,26,0.6)' }}
            >
              <div className="mb-3.5 inline-flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ background: 'rgba(155,47,31,0.1)', color: '#9b2f1f' }}>
                <TriangleAlert size={22} strokeWidth={2} />
              </div>
              <h3 className="m-0 mb-2 font-display text-[26px] font-normal leading-[1.1]" style={{ letterSpacing: '-0.01em' }}>
                Cancel this match?
              </h3>
              <p className="m-0 mb-5 text-[13.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                Players who already joined will be notified. This can't be undone.
              </p>
              <button
                type="button"
                onClick={cancelMatch}
                className="w-full cursor-pointer rounded-pill border-none py-3.5 text-[14px] font-semibold text-onbrand"
                style={{ background: '#9b2f1f' }}
              >
                Cancel match
              </button>
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                className="mt-2 w-full cursor-pointer rounded-pill border-none bg-transparent py-3 text-[14px] font-semibold text-ink"
              >
                Keep it running
              </button>
            </div>
          </div>
        )}

        {/* venue / court picker */}
        {showVenue && (
          <VenuePicker
            sport={sport}
            current={venueCompatible ? venue : null}
            onClose={() => setShowVenue(false)}
            onSelect={(v) => {
              setVenue(v)
              setShowVenue(false)
            }}
          />
        )}

        {/* invite players picker (invite-only matches) */}
        {showInvite && (
          <InvitePicker
            selected={invitedPlayerIds}
            onClose={() => setShowInvite(false)}
            onConfirm={(ids) => {
              setInvitedPlayerIds(ids)
              setShowInvite(false)
            }}
          />
        )}
      </div>
    </Shell>
  )
}
