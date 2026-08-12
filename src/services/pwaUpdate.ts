const UPDATE_NOTICE_ID = 'pwa-update-notice'
export const PWA_UPDATE_RELOAD_DELAY = 1000

type Schedule = (callback: () => void, delay: number) => unknown

const scheduleUpdateReload: Schedule = (callback, delay) => window.setTimeout(callback, delay)

export function checkForPwaUpdate(registration: ServiceWorkerRegistration | undefined) {
  void registration?.update().catch(() => undefined)
}

export function checkForPwaUpdateOnResume(
  registration: ServiceWorkerRegistration | undefined,
  windowRef: Window = window,
  documentRef: Document = document,
) {
  const check = () => checkForPwaUpdate(registration)

  windowRef.addEventListener('focus', check)
  documentRef.addEventListener('visibilitychange', () => {
    if (documentRef.visibilityState === 'visible') check()
  })
}

export function refreshForPwaUpdate(
  documentRef: Document = document,
  reload = () => window.location.reload(),
  schedule: Schedule = scheduleUpdateReload,
) {
  if (documentRef.getElementById(UPDATE_NOTICE_ID)) return

  const notice = documentRef.createElement('div')
  notice.id = UPDATE_NOTICE_ID
  notice.className = 'pwa-update-notice'
  notice.setAttribute('role', 'status')
  notice.textContent = '发现新版本，正在更新…'
  documentRef.body.append(notice)
  schedule(reload, PWA_UPDATE_RELOAD_DELAY)
}
