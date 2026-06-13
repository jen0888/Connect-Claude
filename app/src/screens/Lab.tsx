import { useState } from 'react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { MatchCard } from '@/components/MatchCard'
import { InviteApprovalSheet, type Invite } from '@/components/InviteApprovalSheet'
import { useDB, actions, getUser, matchPlayers, pendingRequest, isJoined } from '@/lib/store'
import { useToast } from '@/components/Toast'

/** Spec demo data for the invite-approval sheet (Sam T. → padel doubles). */
const SAMPLE_INVITE: Invite = {
  person: { name: 'Sam T.', first: 'Sam', init: 'ST', accent: '#7E2D2D', level: 'High int.', rating: 4.9, reviews: 12, played: 96, km: 3.2, note: 'Need one more for our after-work doubles — you in?' },
  match: { sport: 'Padel', type: 'padel', kind: 'Friendly doubles', court: 'Court 1', venue: 'Padel 91 West Walk', when: 'Thu · 19:00', span: '19:00–20:30', max: 4, filled: 2 },
}

/** Dev-only component lab — eyeball the canonical card across states.
 *  Not part of the product's screen map; remove before launch. */
export function Lab() {
  const db = useDB()
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteFull, setInviteFull] = useState(false)

  const labBtn = 'cursor-pointer rounded-pill border-none px-4 py-2.5 text-[13px] font-semibold text-onbrand'

  return (
    <Shell>
      <div className="flex flex-col gap-4 px-6 pt-[60px] pb-[110px]">
        <h1 className="type-display-s">Component lab</h1>

        {/* InviteApprovalSheet — exact spec demo (Sam T.) + full-match path */}
        <div className="flex flex-col gap-2.5">
          <Eyebrow>InviteApprovalSheet</Eyebrow>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className={labBtn} style={{ background: 'var(--color-brand)' }} onClick={() => { setInviteFull(false); setInviteOpen(true) }}>
              Open invite
            </button>
            <button type="button" className={labBtn} style={{ background: 'var(--color-info)' }} onClick={() => { setInviteFull(true); setInviteOpen(true) }}>
              Full match → waitlist
            </button>
          </div>
        </div>

        {db.matches.map((m) => {
          const joined = isJoined(db, m.id)
          const pending = pendingRequest(db, m.id)
          return (
            <div key={m.id} className="flex flex-col gap-2.5">
              <Eyebrow>{m.id}</Eyebrow>
              <MatchCard
                match={m}
                host={getUser(db, m.host_id)}
                players={matchPlayers(db, m.id)}
                action={joined ? 'view' : 'join'}
                joinStatus={joined ? 'joined' : pending ? 'requested' : null}
                onAct={() => {
                  if (m.join_mode === 'approval') {
                    actions.requestToJoin(m.id)
                    showToast('Request sent')
                  } else {
                    actions.joinMatch(m.id)
                    showToast('Joined')
                  }
                }}
                saved={saved}
                onToggleSave={() => setSaved((v) => !v)}
              />
            </div>
          )
        })}
      </div>

      <InviteApprovalSheet
        invite={inviteFull ? { ...SAMPLE_INVITE, match: { ...SAMPLE_INVITE.match, filled: 4 } } : SAMPLE_INVITE}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onResolve={(state) => showToast(state === 'accepted' ? "You're in" : state === 'waitlist' ? 'Added to waitlist' : 'Invitation declined')}
      />
    </Shell>
  )
}
