import { useEffect } from 'react'
import { useToast } from './Toast'
import { useI18n } from '@/i18n'
import { subscribeRpcError } from '@/lib/store'

/** Bridges the store's RPC-error channel to a transient toast. Mounted once
 *  under ToastProvider. The only code today is 'gender_restricted' — the
 *  server-side "Ladies only" gate. The UI normally blocks a male from ever
 *  reaching the join/request/waitlist/accept RPC, so this is the deep-link /
 *  race / direct-API safety net (CLAUDE.md §6). Renders nothing. */
export function RpcErrorListener() {
  const { showToast } = useToast()
  const { t } = useI18n()
  useEffect(
    () =>
      subscribeRpcError((code) => {
        if (code === 'gender_restricted') showToast(t('match.gender.blockedToast'))
      }),
    [showToast, t],
  )
  return null
}
