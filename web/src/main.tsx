import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// fonts are self-hosted: no render-blocking request to a third party
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/alegreya/wght-italic.css'
import '@fontsource-variable/schibsted-grotesk/wght.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
