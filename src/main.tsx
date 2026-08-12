import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { checkForPwaUpdate, checkForPwaUpdateOnResume, refreshForPwaUpdate } from './services/pwaUpdate'

createRoot(document.getElementById('root')!).render(
  <App />,
)

registerSW({
  immediate: true,
  onNeedReload: refreshForPwaUpdate,
  onRegisteredSW: (_swScriptUrl, registration) => {
    checkForPwaUpdate(registration)
    checkForPwaUpdateOnResume(registration)
  },
})
