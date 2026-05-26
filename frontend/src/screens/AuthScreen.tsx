import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface Props {
  pendingMode?: 'job_search' | 'career_guidance' | null
  onBack?:      () => void
}

const MODE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  career_guidance: { icon: '🧭', label: 'Career Guidance', color: '#7c3aed' },
  job_search:      { icon: '🔍', label: 'Job Search',      color: '#0d9488' },
}

export default function AuthScreen({ pendingMode, onBack }: Props) {
  const { login, register } = useAuth()
  const [mode,     setMode]     = useState<'login' | 'register'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (mode === 'register') {
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
      if (password !== confirm) { setError('Passwords do not match.'); return }
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.root}>
      {/* Hero background image */}
      <img
        src="/career-path.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          width:         '100%',
          height:        '100%',
          objectFit:     'cover',
          objectPosition:'center',
          opacity:       0.35,
          pointerEvents: 'none',
          userSelect:    'none',
          zIndex:        0,
        }}
      />

      {/* Blobs */}
      <div style={{ ...s.blob, top: '-100px', left: '-100px', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)' }} />
      <div style={{ ...s.blob, bottom: '-80px', right: '-80px', width: '360px', height: '360px', background: 'radial-gradient(circle, rgba(13,148,136,0.14) 0%, transparent 70%)' }} />

      <div style={s.card}>
        {/* Back button */}
        {onBack && (
          <button style={s.back} onClick={onBack}>← Back</button>
        )}

        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoBox}>🧭</div>
          <div>
            <span style={s.logoText}>CareerPath</span>
            <span style={s.logoAccent}> AI</span>
          </div>
        </div>

        {/* Context banner — show what the user was trying to start */}
        {pendingMode && (() => {
          const m = MODE_LABELS[pendingMode]
          return (
            <div style={{ ...s.contextBanner, borderColor: `${m.color}33`, background: `${m.color}0d` }}>
              <span style={{ fontSize: '18px' }}>{m.icon}</span>
              <p style={{ margin: 0, fontSize: '13px', color: m.color, fontWeight: 600 }}>
                Sign in to start your <strong>{m.label}</strong> session
              </p>
            </div>
          )
        })()}

        <h2 style={s.heading}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p style={s.sub}>
          {mode === 'login'
            ? 'Sign in to access your sessions across any device.'
            : 'Your sessions will sync everywhere you log in.'}
        </p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === 'register' && (
            <div style={s.field}>
              <label style={s.label}>Confirm Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
          )}

          {error && <p style={s.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={s.spinner} />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>

        <p style={s.toggle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            style={s.toggleBtn}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight:       '100vh',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '24px',
    background:      'var(--bg)',
    position:        'relative',
    overflow:        'hidden',
  },
  blob: {
    position:     'absolute',
    width:        '340px',
    height:       '340px',
    borderRadius: '50%',
    pointerEvents:'none',
  },
  card: {
    background:   'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border:       '1.5px solid rgba(255,255,255,0.5)',
    borderRadius: 'var(--radius-lg)',
    boxShadow:    '0 8px 40px rgba(0,0,0,0.12)',
    padding:      '40px 36px',
    width:        '100%',
    maxWidth:     '420px',
    position:     'relative',
    zIndex:       1,
    animation:    'scaleIn 0.35s ease both',
  },
  back: {
    background:   'none',
    border:       'none',
    color:        'var(--text-muted)',
    fontSize:     '13px',
    cursor:       'pointer',
    padding:      0,
    marginBottom: '20px',
    display:      'block',
  },
  contextBanner: {
    display:      'flex',
    alignItems:   'center',
    gap:          '10px',
    padding:      '10px 14px',
    borderRadius: 'var(--radius)',
    border:       '1.5px solid',
    marginBottom: '20px',
  },
  logoRow: {
    display:      'flex',
    alignItems:   'center',
    gap:          '10px',
    marginBottom: '20px',
  },
  logoBox: {
    width:          '40px',
    height:         '40px',
    borderRadius:   '12px',
    background:     'linear-gradient(135deg,#7c3aed,#a855f7)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '20px',
  },
  logoText: {
    fontSize:   '1.2rem',
    fontWeight: 800,
    color:      'var(--text-primary)',
  },
  logoAccent: {
    fontSize:   '1.2rem',
    fontWeight: 800,
    background: 'linear-gradient(90deg,#7c3aed,#0d9488)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor:  'transparent',
  },
  heading: {
    fontSize:     '1.4rem',
    fontWeight:   700,
    color:        'var(--text-primary)',
    marginBottom: '6px',
  },
  sub: {
    fontSize:     '14px',
    color:        'var(--text-secondary)',
    marginBottom: '28px',
    lineHeight:   1.5,
  },
  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '16px',
  },
  field: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '6px',
  },
  label: {
    fontSize:   '13px',
    fontWeight: 600,
    color:      'var(--text-primary)',
  },
  input: {
    padding:      '11px 14px',
    borderRadius: 'var(--radius)',
    border:       '1.5px solid var(--border)',
    fontSize:     '14px',
    color:        'var(--text-primary)',
    background:   'var(--bg)',
    outline:      'none',
    transition:   'border-color 0.15s',
    width:        '100%',
    boxSizing:    'border-box',
  },
  error: {
    fontSize:     '13px',
    color:        'var(--accent-coral)',
    margin:       0,
    padding:      '8px 12px',
    background:   'rgba(239,68,68,0.08)',
    borderRadius: 'var(--radius)',
  },
  btn: {
    padding:      '13px',
    borderRadius: 'var(--radius)',
    border:       'none',
    background:   'linear-gradient(135deg,#7c3aed,#a855f7)',
    color:        '#fff',
    fontSize:     '15px',
    fontWeight:   700,
    cursor:       'pointer',
    marginTop:    '4px',
    boxShadow:    '0 4px 16px rgba(124,58,237,0.3)',
    transition:   'opacity 0.15s, transform 0.1s',
  },
  spinner: {
    width:           '16px',
    height:          '16px',
    border:          '2px solid rgba(255,255,255,0.4)',
    borderTopColor:  '#fff',
    borderRadius:    '50%',
    animation:       'spin 0.7s linear infinite',
    display:         'inline-block',
  },
  toggle: {
    marginTop:  '20px',
    fontSize:   '13px',
    color:      'var(--text-secondary)',
    textAlign:  'center',
  },
  toggleBtn: {
    background:  'none',
    border:      'none',
    color:       '#7c3aed',
    fontWeight:  600,
    cursor:      'pointer',
    fontSize:    '13px',
    padding:     0,
  },
}
