/**
 * Purpose: SPA entry — mount App under StrictMode.
 * Exports: none (side-effect entry)
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
