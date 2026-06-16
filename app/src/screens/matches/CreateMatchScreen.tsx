import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Coins, Lock, LockOpen, MailPlus, MapPin, Plus, Sparkles, TriangleAlert, Trophy, UserRound, Users, X } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { CTA, MiniMap, PlayerDots, Segmented, Slider, Toggle } from '@/components/controls'
import { SkillRangeSlider } from '@/components/SkillRangeSlider'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, getUser, matchInvites, useDB } from '@/lib/store'
import { clearPersistedState, usePersistedState } from '@/lib/usePersistedState'
import { writeHostedMatch, type HostedMatch } from '@/lib/hostedMatch'
import type { JoinMode, SkillTier, Sport } from '@/lib/types'
import { useI18n } from '@/i18n'
import { initials, skillLabel, skillTierLabel, skillTierLabelFull } from '@/lib/format'
import { diffMinutes, keyOf, labelFromKey } from '@/lib/datetime'
import { sportEmoji } from '@/lib/sports'
import { VenuePicker, type VenueSelection } from './VenuePicker'
import { InvitePicker } from './InvitePicker'
import { WhenCard } from './WhenCard'

/** Create / Edit Match — single long scroll (create-match-v1.jsx, Editorial
 *  Calm). Cost and Joining must be explicitly chosen before creating.
 *  Save-then-route: Create/Save/Cancel → Home + transient toast (CLAUDE.md §4). */

const SPORTS: { id: Sport; label: string }[] = [
  { id: 'padel', label: 'Padel' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'running', label: 'Running' },
]

const cardCls = 'rounded-[22px] border bg-card'
const cardStyle = { borderColor: 'rgba(26,26,26,0.10)' }

function FieldRow({ label, hint, rightLabel, children }: { label: string; hint?: string; rightLabel?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
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

export function CreateMatchScreen({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const isEdit = mode === 'edit'
  const { id } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t } = useI18n()
  const existing = isEdit ? db.matches.find((m) => m.id === id) : undefined

  // Draft persistence: only "create" keeps a draft across refreshes — in edit
  // mode `dk()` returns null so the form always reflects the live match, never
  // a stale draft. The draft is cleared once a match is actually created.
  const dk = (field: string) => (isEdit ? null : `match:create:${field}`)
  const initialVenue: VenueSelection | null = existing
    ? existing.sport === 'running' && existing.route_start
      ? { id: 'route', name: existing.route_start, endName: existing.route_end ?? '', loop: existing.round_trip, km: '', area: '', setting: '', court: '' }
      : { id: existing.venue_id ?? 'custom', name: existing.venue_name, area: existing.venue_location ?? '', setting: '', court: existing.court_number ?? '' }
    : null

  const [sport, setSport] = usePersistedState<Sport>(dk('sport'), existing?.sport ?? 'padel')
  const [name, setName] = usePersistedState(dk('name'), existing?.name ?? '')
  const [dateKey, setDateKey] = usePersistedState(dk('dateKey'), existing ? existing.start_time.slice(0, 10) : keyOf(new Date()))
  const [startTime, setStartTime] = usePersistedState(dk('startTime'), existing ? existing.start_time.slice(11, 16) : '18:30')
  const [endTime, setEndTime] = usePersistedState(dk('endTime'), existing ? existing.end_time.slice(11, 16) : '20:00')
  // Match length the host picks first; End is derived from Start + duration. Kept
  // in the shared draft (not WhenCard-local) so it persists across the flow and
  // the computed end_time written in save() can't drift.
  const [duration, setDuration] = usePersistedState(
    dk('duration'),
    existing ? diffMinutes(existing.start_time.slice(11, 16), existing.end_time.slice(11, 16)) : 90,
  )
  // The host chooses how many players they still NEED (spots for others); the
  // host occupies one more spot, so total roster = needed + 1. The card then
  // reads "{needed} spots left" right after create. (Stored draft key kept as
  // 'players' for back-compat; existing matches map back via total_spots - 1.)
  const [needed, setNeeded] = usePersistedState(dk('players'), existing ? existing.total_spots - 1 : 3)
  const totalSpots = needed + 1
  // skill (carry-forward §4): persists across the create flow, pre-filled from
  // the saved min/max in edit mode. Create starts with NOTHING selected — the
  // host taps to set a level (then a second tap makes a range); required before
  // create. min === max ⇒ a single level.
  const [skillMin, setSkillMin] = usePersistedState<SkillTier | null>(dk('skillMin'), existing?.skill_min ?? null)
  const [skillMax, setSkillMax] = usePersistedState<SkillTier | null>(dk('skillMax'), existing?.skill_max ?? null)
  const [matchType, setMatchType] = usePersistedState<'casual' | 'competition'>(dk('matchType'), 'casual')
  const [gender, setGender] = usePersistedState<'mixed' | 'ladies'>(dk('gender'), 'mixed')
  const [isFree, setIsFree] = usePersistedState<boolean | null>(dk('isFree'), existing ? existing.fee_per_player == null : null)
  const [pricePerPlayer, setPricePerPlayer] = usePersistedState(dk('pricePerPlayer'), existing?.fee_per_player ? String(existing.fee_per_player) : '')
  const [joinMode, setJoinMode] = usePersistedState<JoinMode | null>(dk('joinMode'), existing ? existing.join_mode : null)
  const [waitlistOpen, setWaitlistOpen] = usePersistedState(dk('waitlistOpen'), existing?.waitlist_open ?? false)
  const [waitlistSize, setWaitlistSize] = usePersistedState(dk('waitlistSize'), existing?.waitlist_size ?? 1)
  const [description, setDescription] = usePersistedState(dk('description'), existing?.notes ?? '')
  const [venue, setVenue] = usePersistedState<VenueSelection | null>(dk('venue'), initialVenue)

  // In edit mode, preload the players the host has already invited (any still-
  // standing invite) so the form shows them under the Invite button instead of
  // an empty picker. Create opens empty.
  const initialInvited = existing
    ? matchInvites(db, existing.id)
        .filter((r) => r.status !== 'declined' && r.status !== 'expired' && r.status !== 'left')
        .map((r) => r.player_id)
    : []
  const [invitedIds, setInvitedIds] = usePersistedState<string[]>(dk('invitedIds'), initialInvited)

  const [showVenue, setShowVenue] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showReminder, setShowReminder] = useState(false)

  const isRoute = venue?.id === 'route' || !!venue?.endName
  const venueCompatible = venue != null && (sport === 'running' ? isRoute : !isRoute)
  const allChosen = isFree !== null && joinMode !== null && skillMin !== null && skillMax !== null
  // "Ladies only" is offered ONLY to female hosts; for everyone else the option
  // isn't rendered and the value is locked to 'mixed' (the server rejects a
  // ladies match from a non-female host too, CLAUDE.md §6).
  const canLadies = getUser(db, currentUserId)?.gender === 'female'
  const effectiveGender: 'mixed' | 'ladies' = canLadies ? gender : 'mixed'

  const save = async () => {
    if (!allChosen) {
      setShowReminder(true)
      return
    }
    const dayIso = dateKey
    const start = `${dayIso}T${startTime}:00`
    const end = `${dayIso}T${endTime}:00`
    const price = isFree ? null : parseFloat(pricePerPlayer) || null
    const base = {
      sport,
      name: name.trim() || null,
      venue_id: venue && venue.id !== 'custom' && venue.id !== 'route' ? venue.id : null,
      venue_name: venue?.name ?? '',
      venue_location: venue?.area || null,
      court_number: venue?.court || null,
      route_start: sport === 'running' ? (venue?.name ?? null) : null,
      route_end: sport === 'running' ? (venue?.loop ? venue.name : (venue?.endName ?? null)) : null,
      round_trip: sport === 'running' ? (venue?.loop ?? false) : false,
      distance_km: sport === 'running' && typeof venue?.km === 'number' ? venue.km : null,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      skill_min: skillMin!, // guaranteed by the allChosen guard above
      skill_max: skillMax!,
      total_spots: totalSpots,
      fee_per_player: price,
      fee_total: price ? price * totalSpots : null,
      join_mode: (joinMode ?? 'open') as JoinMode,
      gender_restriction: effectiveGender,
      waitlist_open: waitlistOpen,
      waitlist_size: waitlistOpen ? waitlistSize : undefined,
      notes: description.trim() || null,
    }
    if (isEdit && existing) {
      // Editing the player count changes total_spots, so spots_available must be
      // recomputed or "spots left" / the avatar fill would drift from the new
      // total. Preserve however many players have already joined (host included).
      const joined = existing.total_spots - existing.spots_available
      actions.updateMatch(existing.id, { ...base, spots_available: Math.max(totalSpots - joined, 0) })
      showToast('Changes saved')
    } else {
      const newId = await actions.createMatch({ ...base, host_id: currentUserId })
      // invite-only: send the picked invites (live: real invites that auto-notify;
      // mock: the demo sim has each accept a beat later)
      if (newId && base.join_mode === 'invite') invitedIds.forEach((id) => actions.invitePlayer(newId, id))
      clearPersistedState('match:create:') // draft committed — reset for next time
      showToast(base.join_mode === 'invite' && invitedIds.length ? `Match created · ${invitedIds.length} invited` : 'Match created')
    }
    // Also write the localStorage source-of-truth so Home's "You're hosting" card
    // shows this match (and survives reload) — Home prefers this over the
    // in-memory store.
    const hosted: HostedMatch = {
      sport,
      name: name.trim() || 'Untitled match',
      dateKey,
      dateLabel: labelFromKey(dateKey),
      startTime,
      endTime,
      matchType,
      gender: effectiveGender,
      joinMode: (joinMode ?? 'open') as JoinMode,
      requireApproval: joinMode === 'approval',
      invitedPlayerIds: joinMode === 'invite' ? invitedIds : [],
      isFree: isFree === true,
      pricePerPlayer: isFree === true ? '' : pricePerPlayer,
      players: totalSpots,
      filled: 1, // host always holds the first spot
      skillMin: skillMin!,
      skillMax: skillMax!,
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
    writeHostedMatch(hosted)
    navigate('/home') // save-then-route: Match edit/create → Home + toast
  }

  const cancelMatch = () => {
    if (existing) {
      actions.cancelMatch(existing.id)
      showToast('Match cancelled')
      navigate('/home')
    }
  }

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        <div className="scroll-area relative z-1 flex-1 overflow-y-auto px-[22px] pt-14 pb-[130px]">
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

          {/* hero copy */}
          <div className="pt-2 pb-[22px]">
            <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
              {isEdit ? `You're hosting · ${labelFromKey(dateKey)}` : 'Step one of one'}
            </div>
            <h1 className="m-0 font-display text-[40px] font-normal leading-none" style={{ letterSpacing: '-0.022em', textWrap: 'balance' }}>
              {isEdit ? (
                <>
                  Edit <span className="italic text-brand">your match</span>.
                </>
              ) : (
                <>
                  Let's set up <span className="italic text-brand">your match</span>.
                </>
              )}
            </h1>
          </div>

          {/* sport pills */}
          <div className="scroll-area -ms-0.5 flex gap-2 overflow-x-auto pb-3.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
              duration={duration}
              onDuration={setDuration}
              restrictPast={!isEdit}
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

              {/* "Ladies only" is host-gated: only a female host can restrict a
                  match to women. Male hosts don't see the toggle and the value
                  stays 'mixed' (server-enforced too, CLAUDE.md §6). */}
              {canLadies && (
                <>
                  <div className="h-px" style={{ background: 'rgba(26,26,26,0.10)' }} />

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
                </>
              )}
            </div>
          </div>

          {/* Players + level */}
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

              <div className="h-px" style={{ background: 'rgba(26,26,26,0.10)' }} />

              <FieldRow
                label="Skill level"
                rightLabel={
                  skillMin && skillMax ? (
                    <span className="text-[12.5px] font-medium text-ink ltr-nums">
                      {skillMin === skillMax
                        ? t('skill.range.single').replace('{x}', skillTierLabelFull(skillMin))
                        : t('skill.range.span').replace('{x}', skillTierLabel(skillMin)).replace('{y}', skillTierLabel(skillMax))}
                    </span>
                  ) : (
                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Tap to choose</span>
                  )
                }
              >
                <div className="mt-2.5">
                  <SkillRangeSlider min={skillMin} max={skillMax} onChange={(lo, hi) => { setSkillMin(lo); setSkillMax(hi) }} />
                  <p className="mt-2 text-[11.5px] leading-[1.4]" style={{ color: 'var(--color-text-muted)' }}>
                    {t('skill.range.help')}
                  </p>
                </div>
              </FieldRow>
            </div>
          </div>

          {/* Rules */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Rules</Eyebrow>
            <div className={`mt-3 flex flex-col gap-[18px] p-[18px] ${cardCls}`} style={cardStyle}>
              <FieldRow
                label="Cost"
                hint={isFree === null ? 'Choose how players cover the court.' : isFree ? 'No cost per player.' : 'Players will split the cost.'}
              >
                <Segmented
                  value={isFree}
                  onChange={setIsFree}
                  options={[
                    { value: true, label: 'Free to join', icon: <Sparkles size={14} strokeWidth={1.8} /> },
                    { value: false, label: 'Split the cost', icon: <Coins size={14} strokeWidth={1.8} /> },
                  ]}
                />
                {isFree === false && (
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

              <div className="h-px" style={{ background: 'rgba(26,26,26,0.10)' }} />

              <FieldRow
                label="Joining"
                hint={
                  joinMode === null
                    ? 'Choose how players get in.'
                    : joinMode === 'open'
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
                    { value: 'approval', label: 'Request', icon: <Lock size={14} strokeWidth={1.8} /> },
                    { value: 'invite', label: 'Invite', icon: <MailPlus size={14} strokeWidth={1.8} /> },
                  ]}
                />

                {/* invite-only: pick the specific players you're inviting (the
                    invite holds no slot — first to accept fills the match, §5) */}
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
                        {invitedIds.length === 0 ? 'Choose who can join this match.' : 'Tap to add or remove players.'}
                      </div>
                    </div>
                    {invitedIds.length > 0 ? (
                      <span className="inline-flex shrink-0 items-center rounded-pill bg-brand px-2.5 py-1 text-[11px] font-semibold text-onbrand nums-tabular">
                        {invitedIds.length} invited
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-pill px-3 py-1.5 text-[12px] font-medium text-brand" style={{ border: '1.5px solid color-mix(in srgb, var(--color-brand) 33%, transparent)' }}>
                        <Plus size={13} strokeWidth={2.2} /> Add
                      </span>
                    )}
                  </button>
                )}

                {/* the invited players, listed under the button so the host can
                    see (and remove) exactly who's been invited */}
                {joinMode === 'invite' && invitedIds.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {invitedIds.map((pid) => {
                      const u = getUser(db, pid)
                      if (!u) return null
                      return (
                        <div
                          key={pid}
                          className="flex items-center gap-2.5 rounded-[14px] border bg-page px-3 py-2"
                          style={{ borderColor: 'rgba(26,26,26,0.10)' }}
                        >
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[13px] italic text-onbrand" style={{ background: 'var(--color-accent)' }}>
                            {initials(u)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-ink">{u.name}</div>
                            <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                              {skillLabel(u.skill_level)}
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${u.name}`}
                            onClick={() => setInvitedIds(invitedIds.filter((x) => x !== pid))}
                            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent text-ink"
                            style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
                          >
                            <X size={13} strokeWidth={2} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </FieldRow>

              <div className="h-px" style={{ background: 'rgba(26,26,26,0.10)' }} />

              {/* Waitlist — available for all join modes; on a full match players
                  queue FIFO and auto-promote (approval still gates promotion, §5) */}
              <div>
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
                    <div className="my-[18px] h-px" style={{ background: 'rgba(26,26,26,0.10)' }} />
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

        {/* sticky footer CTA */}
        <div
          className="absolute inset-x-0 bottom-0 z-5 flex flex-col items-center gap-2.5 px-[22px] pt-4 pb-[22px]"
          style={{ background: 'linear-gradient(180deg, transparent, var(--surface-page) 30%)' }}
        >
          {isEdit ? (
            <>
              <CTA onClick={save}>Save changes</CTA>
              <button
                type="button"
                onClick={cancelMatch}
                className="cursor-pointer border-none bg-transparent px-2.5 py-1.5 text-[13px] font-medium tracking-[0.01em] underline underline-offset-3"
                style={{ color: '#9b2f1f', textDecorationColor: 'rgba(155,47,31,0.35)' }}
              >
                Cancel match
              </button>
            </>
          ) : (
            <CTA onClick={save}>
              Create match <ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />
            </CTA>
          )}
        </div>

        {/* required-choice reminder sheet */}
        {showReminder && (
          <div
            onClick={() => setShowReminder(false)}
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
                A couple of choices first.
              </h3>
              <p className="m-0 mb-4 text-[13.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                Before you create this match, please set:
              </p>
              <div className="mb-5 flex flex-col gap-2.5">
                {[
                  { ok: isFree !== null, label: 'Cost — free or split' },
                  { ok: joinMode !== null, label: 'Joining — open, request or invite' },
                  { ok: skillMin !== null, label: 'Skill level — tap one or a range' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-2.5 text-[13.5px] font-medium" style={{ color: r.ok ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: r.ok ? 'var(--color-brand)' : 'transparent',
                        border: r.ok ? 'none' : '1.5px solid rgba(155,47,31,0.5)',
                        color: r.ok ? 'var(--color-text-onbrand)' : '#9b2f1f',
                      }}
                    >
                      {r.ok ? <Check size={11} strokeWidth={3.2} /> : <span className="text-[12px] font-bold">*</span>}
                    </span>
                    <span style={{ textDecoration: r.ok ? 'line-through' : 'none', opacity: r.ok ? 0.7 : 1 }}>{r.label}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowReminder(false)}
                className="w-full cursor-pointer rounded-pill border-none bg-ink py-3.5 text-[14px] font-semibold text-onbrand"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* venue / court picker */}
        {showVenue && <VenuePicker sport={sport} current={venueCompatible ? venue : null} onClose={() => setShowVenue(false)} onSelect={(v) => { setVenue(v); setShowVenue(false) }} />}

        {showInvite && (
          <InvitePicker
            selected={invitedIds}
            femaleOnly={effectiveGender === 'ladies'}
            onClose={() => setShowInvite(false)}
            onConfirm={(ids) => { setInvitedIds(ids); setShowInvite(false) }}
          />
        )}
      </div>
    </Shell>
  )
}
