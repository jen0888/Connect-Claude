import { useState } from 'react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { MatchCard } from '@/components/MatchCard'
import { useDB, actions, getUser, matchPlayers, pendingRequest, isJoined } from '@/lib/store'
import { useToast } from '@/components/Toast'

/** Dev-only component lab — eyeball the canonical card across states.
 *  Not part of the product's screen map; remove before launch. */
export function Lab() {
  const db = useDB()
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)

  return (
    <Shell>
      <div className="flex flex-col gap-4 px-6 pt-[60px] pb-[110px]">
        <h1 className="type-display-s">Component lab</h1>
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
    </Shell>
  )
}
