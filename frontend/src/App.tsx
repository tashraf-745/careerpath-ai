import { useState, useEffect } from 'react'
import Landing      from './screens/Landing'
import StageOptions from './screens/StageOptions'
import Chat         from './screens/Chat'
import AuthScreen   from './screens/AuthScreen'
import { AuthProvider, useAuth } from './context/AuthContext'
import { createSession } from './api'

type Screen = 'landing' | 'auth' | 'options' | 'chat'

interface AppState {
  screen:      Screen
  sessionId:   string
  mode:        'job_search' | 'career_guidance'
  isResumed:   boolean
  pendingMode: 'job_search' | 'career_guidance' | null
}

function AppInner() {
  const { isAuthenticated, user } = useAuth()
  const [state, setState] = useState<AppState>({
    screen:      'landing',
    sessionId:   '',
    mode:        'career_guidance',
    isResumed:   false,
    pendingMode: null,
  })
  const [creatingMode, setCreatingMode] = useState<string | null>(null)

  // After auth completes, auto-proceed with the mode the user originally clicked
  useEffect(() => {
    if (!isAuthenticated || !state.pendingMode || state.screen !== 'auth') return
    const mode = state.pendingMode
    setCreatingMode(mode)
    createSession(mode, user!.userId)
      .then(session => {
        setState({ screen: 'options', sessionId: session.session_id, mode, isResumed: false, pendingMode: null })
      })
      .catch(() => {
        setState(prev => ({ ...prev, screen: 'landing', pendingMode: null }))
      })
      .finally(() => setCreatingMode(null))
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleModeClick(mode: 'job_search' | 'career_guidance') {
    if (isAuthenticated) {
      // Already signed in — create session directly
      setCreatingMode(mode)
      createSession(mode, user!.userId)
        .then(session => setState({ screen: 'options', sessionId: session.session_id, mode, isResumed: false, pendingMode: null }))
        .catch(() => setCreatingMode(null))
        .finally(() => setCreatingMode(null))
    } else {
      // Not signed in — remember the mode and show auth
      setState(prev => ({ ...prev, screen: 'auth', pendingMode: mode }))
    }
  }

  function handleOptionsReady() {
    setState(prev => ({ ...prev, screen: 'chat' }))
  }

  function handleBack() {
    setState({ screen: 'landing', sessionId: '', mode: 'career_guidance', isResumed: false, pendingMode: null })
  }

  function handleReset() {
    setState({ screen: 'landing', sessionId: '', mode: 'career_guidance', isResumed: false, pendingMode: null })
  }

  function handleResume(sessionId: string, mode: 'job_search' | 'career_guidance') {
    setState({ screen: 'chat', sessionId, mode, isResumed: true, pendingMode: null })
  }

  switch (state.screen) {
    case 'landing':
      return (
        <Landing
          onSelect={handleModeClick}
          onResume={handleResume}
          userId={user?.userId || ''}
          creatingMode={creatingMode}
        />
      )
    case 'auth':
      return (
        <AuthScreen
          pendingMode={state.pendingMode}
          onBack={handleBack}
        />
      )
    case 'options':
      return (
        <StageOptions
          sessionId={state.sessionId}
          mode={state.mode}
          onReady={handleOptionsReady}
          onBack={handleBack}
        />
      )
    case 'chat':
      return (
        <Chat
          sessionId={state.sessionId}
          mode={state.mode}
          isResumed={state.isResumed}
          onReset={handleReset}
        />
      )
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
