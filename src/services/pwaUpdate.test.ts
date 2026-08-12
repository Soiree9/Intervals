import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkForPwaUpdate, checkForPwaUpdateOnResume, PWA_UPDATE_RELOAD_DELAY, refreshForPwaUpdate } from './pwaUpdate'

describe('PWA updates', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('checks for a new service worker whenever the app registers', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    checkForPwaUpdate({ update } as unknown as ServiceWorkerRegistration)
    await Promise.resolve()
    expect(update).toHaveBeenCalledOnce()
  })

  it('checks again when the app returns to the foreground', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const windowRef = new EventTarget() as unknown as Window
    const documentRef = new EventTarget() as unknown as Document

    Object.defineProperty(documentRef, 'visibilityState', { value: 'visible' })
    checkForPwaUpdateOnResume({ update } as unknown as ServiceWorkerRegistration, windowRef, documentRef)
    windowRef.dispatchEvent(new Event('focus'))
    documentRef.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(update).toHaveBeenCalledTimes(2)
  })

  it('announces a ready update once before reloading', () => {
    const reload = vi.fn()
    const schedule = vi.fn()

    refreshForPwaUpdate(document, reload, schedule)
    refreshForPwaUpdate(document, reload, schedule)

    expect(document.querySelector('[role="status"]')).toHaveTextContent('发现新版本，正在更新…')
    expect(schedule).toHaveBeenCalledOnce()
    expect(schedule).toHaveBeenCalledWith(reload, PWA_UPDATE_RELOAD_DELAY)
  })
})
