import { useState, useCallback, useEffect } from 'react'
import { getUserSessions, deleteSession } from '../api'
import type { PastSession } from '../api'
import { useAuth } from '../context/AuthContext'

interface Props {
  onSelect:     (mode: 'job_search' | 'career_guidance') => void
  onResume:     (sessionId: string, mode: 'job_search' | 'career_guidance') => void
  userId:       string
  creatingMode: string | null
}

const FLOATERS = [
  { emoji: '💼', top: '12%',  left: '6%',   size: 38, opacity: 0.22, anim: 'floatRotate',  dur: '7s',  delay: '0s'    },
  { emoji: '📊', top: '18%',  right: '7%',  size: 34, opacity: 0.18, anim: 'floatRotateB', dur: '9s',  delay: '1s'    },
  { emoji: '🎯', top: '52%',  left: '4%',   size: 40, opacity: 0.20, anim: 'floatRotate',  dur: '11s', delay: '0.5s'  },
  { emoji: '🚀', top: '65%',  right: '5%',  size: 36, opacity: 0.18, anim: 'floatRotateB', dur: '8s',  delay: '2s'    },
  { emoji: '✨', top: '80%',  left: '12%',  size: 30, opacity: 0.20, anim: 'floatRotate',  dur: '6s',  delay: '1.5s'  },
  { emoji: '📝', top: '30%',  right: '4%',  size: 32, opacity: 0.16, anim: 'floatRotateB', dur: '13s', delay: '0.3s'  },
  { emoji: '⭐', top: '8%',   right: '20%', size: 26, opacity: 0.15, anim: 'floatRotate',  dur: '10s', delay: '3s'    },
  { emoji: '🔑', top: '75%',  right: '14%', size: 28, opacity: 0.16, anim: 'floatRotateB', dur: '12s', delay: '2.5s'  },
]

export default function Landing({ onSelect, onResume, userId, creatingMode }: Props) {
  const { user, logout } = useAuth()
  const [hovered,      setHovered]      = useState<string | null>(null)
  const [mouse,        setMouse]        = useState({ x: 0, y: 0 })
  const [pastSessions, setPastSessions] = useState<PastSession[]>([])
  const [deletingId,   setDeletingId]   = useState<string | null>(null)

  useEffect(() => {
    if (userId) getUserSessions(userId).then(setPastSessions)
    else setPastSessions([])
  }, [userId])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMouse({
      x: ((e.clientX - rect.left) / rect.width  - 0.5) * 40,
      y: ((e.clientY - rect.top)  / rect.height - 0.5) * 40,
    })
  }, [])

  const loading = creatingMode  // alias for readability in JSX below

  async function handleDelete(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation()
    setDeletingId(sessionId)
    try {
      await deleteSession(sessionId, userId)
      // Only remove from local list after server confirmed deletion
      setPastSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } catch {
      // Server rejected — do nothing, keep the session visible
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={styles.root} onMouseMove={handleMouseMove}>

      {/* Dot-grid texture */}
      <div style={styles.dotGrid} />

      {/* Parallax blobs — shift with mouse */}
      <div style={{
        ...styles.blob,
        top: '-120px', left: '-100px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)',
        transform: `translate(${mouse.x * 0.6}px, ${mouse.y * 0.6}px)`,
        animationName: 'float', animationDuration: '7s',
        animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
      }} />
      <div style={{
        ...styles.blob,
        bottom: '-80px', right: '-80px', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 70%)',
        transform: `translate(${-mouse.x * 0.4}px, ${-mouse.y * 0.4}px)`,
        animationName: 'floatB', animationDuration: '9s',
        animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
      }} />
      <div style={{
        ...styles.blob,
        top: '40%', right: '10%', width: '280px', height: '280px',
        background: 'radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)',
        transform: `translate(${mouse.x * 0.3}px, ${mouse.y * 0.3}px)`,
        animationName: 'float', animationDuration: '11s',
        animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
      }} />

      {/* Hero illustration — full background */}
      <img
        src="/hero-illustration.png"
        alt=""
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          width:         '100%',
          height:        '100%',
          objectFit:     'cover',
          objectPosition:'center',
          opacity:       0.18,
          pointerEvents: 'none',
          userSelect:    'none',
          zIndex:        0,
          transform:     `translate(${mouse.x * 0.06}px, ${mouse.y * 0.06}px) scale(1.04)`,
          transition:    'transform 0.4s ease',
        }}
      />

      {/* Floating career icons */}
      {FLOATERS.map((f, i) => (
        <div
          key={i}
          style={{
            position:     'absolute',
            top:          f.top,
            left:         f.left   || undefined,
            right:        (f as any).right || undefined,
            fontSize:     `${f.size}px`,
            opacity:      f.opacity,
            pointerEvents:'none',
            userSelect:   'none',
            animationName:          f.anim,
            animationDuration:      f.dur,
            animationTimingFunction:'ease-in-out',
            animationIterationCount:'infinite',
            animationDelay:         f.delay,
            transform:    `translate(${mouse.x * 0.15}px, ${mouse.y * 0.15}px)`,
            transition:   'transform 0.4s ease',
            filter:       'drop-shadow(0 4px 8px rgba(124,58,237,0.15))',
          }}
        >
          {f.emoji}
        </div>
      ))}

      <div style={styles.inner}>

        {/* Logo orb with orbit ring */}
        <div style={styles.logoArea}>
          <div style={styles.orbitWrapper}>
            <div style={styles.orbitRing} />
            <div style={styles.orbitDot} />
            <div style={styles.logoOrb}>
              <span style={styles.logoEmoji}>✦</span>
            </div>
          </div>
        </div>

        <h1 style={styles.title}>
          CareerPath <span style={styles.titleAccent}>AI</span>
        </h1>
        <p style={styles.subtitle}>
          Your personal career advisor — from zero clarity to a tailored application.
          What would you like to work on today?
        </p>

        <div style={styles.cards}>

          {/* Career Guidance card */}
          <button
            className="card-hover ripple-btn"
            style={{
              ...styles.card,
              ...(loading === 'career_guidance' ? styles.cardLoading : {}),
              borderColor: hovered === 'career_guidance' ? '#7c3aed' : 'var(--border)',
              animation: 'fadeSlideUp 0.5s ease both',
            }}
            onClick={() => onSelect('career_guidance')}
            onMouseEnter={() => setHovered('career_guidance')}
            onMouseLeave={() => setHovered(null)}
            disabled={loading !== null}
          >
            <div style={{ ...styles.cardGlow, background: 'radial-gradient(circle at 0% 50%, rgba(124,58,237,0.10) 0%, transparent 60%)' }} />
            <div
              className={hovered === 'career_guidance' ? 'icon-wiggle' : ''}
              style={{ ...styles.cardIcon, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: hovered === 'career_guidance' ? '0 6px 20px rgba(124,58,237,0.4)' : '0 4px 14px rgba(0,0,0,0.12)' }}
            >
              🧭
            </div>
            <div style={styles.cardContent}>
              <h2 style={styles.cardTitle}>Career Guidance</h2>
              <p style={styles.cardDesc}>
                Not sure what path to take? I'll get to know you through real conversation,
                research your options live, and build a personalised plan with salary benchmarks.
              </p>
              <div style={styles.cardMeta}>
                <span style={styles.metaDot} />
                <span style={styles.metaText}>Typically takes 5–10 minutes</span>
              </div>
            </div>
            <div style={{
              ...styles.cardArrow,
              background: hovered === 'career_guidance' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'var(--border)',
              color: hovered === 'career_guidance' ? '#fff' : 'var(--text-muted)',
              transform: hovered === 'career_guidance' ? 'scale(1.1)' : 'scale(1)',
            }}>
              {loading === 'career_guidance'
                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                : '→'}
            </div>
          </button>

          {/* Job Search card */}
          <button
            className="card-hover ripple-btn"
            style={{
              ...styles.card,
              ...(loading === 'job_search' ? styles.cardLoading : {}),
              borderColor: hovered === 'job_search' ? '#0d9488' : 'var(--border)',
              animation: 'fadeSlideUp 0.5s ease 0.1s both',
            }}
            onClick={() => onSelect('job_search')}
            onMouseEnter={() => setHovered('job_search')}
            onMouseLeave={() => setHovered(null)}
            disabled={loading !== null}
          >
            <div style={{ ...styles.cardGlow, background: 'radial-gradient(circle at 0% 50%, rgba(13,148,136,0.10) 0%, transparent 60%)' }} />
            <div
              className={hovered === 'job_search' ? 'icon-wiggle' : ''}
              style={{ ...styles.cardIcon, background: 'linear-gradient(135deg,#0d9488,#14b8a6)', boxShadow: hovered === 'job_search' ? '0 6px 20px rgba(13,148,136,0.4)' : '0 4px 14px rgba(0,0,0,0.12)' }}
            >
              🔍
            </div>
            <div style={styles.cardContent}>
              <h2 style={styles.cardTitle}>Job Search</h2>
              <p style={styles.cardDesc}>
                Know your target role? I'll surface live listings ranked by fit, then tailor
                your resume and write a cover letter for the one you choose.
              </p>
              <div style={styles.cardMeta}>
                <span style={{ ...styles.metaDot, background: '#0d9488' }} />
                <span style={styles.metaText}>Upload resume for best results</span>
              </div>
            </div>
            <div style={{
              ...styles.cardArrow,
              background: hovered === 'job_search' ? 'linear-gradient(135deg,#0d9488,#14b8a6)' : 'var(--border)',
              color: hovered === 'job_search' ? '#fff' : 'var(--text-muted)',
              transform: hovered === 'job_search' ? 'scale(1.1)' : 'scale(1)',
            }}>
              {loading === 'job_search'
                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                : '→'}
            </div>
          </button>
        </div>

        {user ? (
          <div style={styles.footerRow}>
            <p style={styles.footer}>🔒 Signed in as <strong>{user.email}</strong></p>
            <button style={styles.logoutBtn} onClick={logout}>Sign out</button>
          </div>
        ) : (
          <p style={{ ...styles.footer, marginTop: '28px', animation: 'fadeSlideUp 0.5s ease 0.3s both' }}>
            🔒 Your sessions are saved when you sign in
          </p>
        )}

        {/* Previous sessions */}
        {pastSessions.length > 0 && (
          <div style={styles.sessionsSection}>
            <p style={styles.sessionsHeading}>Continue where you left off</p>
            <div style={styles.sessionsList}>
              {pastSessions.slice(0, 5).map((s, i) => (
                <div
                  key={s.session_id}
                  style={{
                    ...styles.sessionCard,
                    animation: `fadeSlideUp 0.4s ease ${0.05 * i}s both`,
                    opacity: deletingId === s.session_id ? 0.4 : 1,
                    transition: 'opacity 0.2s, border-color 0.15s, transform 0.15s, box-shadow 0.15s',
                  }}
                >
                  {/* Clickable resume area */}
                  <button
                    style={styles.sessionResumeBtn}
                    onClick={() => onResume(s.session_id, s.mode as 'job_search' | 'career_guidance')}
                  >
                    <span style={styles.sessionIcon}>
                      {s.mode === 'job_search' ? '🔍' : '🧭'}
                    </span>
                    <div style={styles.sessionInfo}>
                      <p style={styles.sessionTitle}>{s.title || 'Untitled session'}</p>
                      <p style={styles.sessionDate}>{formatDate(s.updated_at)}</p>
                    </div>
                    <span style={styles.sessionArrow}>→</span>
                  </button>

                  {/* Delete button */}
                  <button
                    style={styles.deleteBtn}
                    onClick={e => handleDelete(e, s.session_id)}
                    disabled={deletingId === s.session_id}
                    title="Delete session"
                  >
                    {deletingId === s.session_id ? '…' : '×'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const d   = new Date(iso)
  const now = new Date()
  const diffMs  = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)   return 'Just now'
  if (diffMin < 60)  return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)    return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7)     return `${diffD}d ago`
  return d.toLocaleDateString()
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '40px 24px',
    background:     'var(--bg)',
    position:       'relative',
    overflow:       'hidden',
  },
  dotGrid: {
    position:        'absolute',
    inset:           0,
    backgroundImage: 'radial-gradient(circle, rgba(124,58,237,0.12) 1px, transparent 1px)',
    backgroundSize:  '28px 28px',
    pointerEvents:   'none',
    zIndex:          0,
  },
  blob: {
    position:     'absolute',
    width:        '420px',
    height:       '420px',
    borderRadius: '50%',
    pointerEvents:'none',
    transition:   'transform 0.15s ease',
    zIndex:       0,
  },
  inner: {
    maxWidth:  '700px',
    width:     '100%',
    textAlign: 'center',
    position:  'relative',
    zIndex:    2,
  },
  logoArea: {
    display:        'flex',
    justifyContent: 'center',
    marginBottom:   '28px',
    animation:      'fadeSlideUp 0.4s ease both',
  },
  orbitWrapper: {
    position: 'relative',
    width:    '80px',
    height:   '80px',
    display:  'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  orbitRing: {
    position:     'absolute',
    width:        '80px',
    height:       '80px',
    borderRadius: '50%',
    border:       '1.5px dashed rgba(124,58,237,0.35)',
    animation:    'orbitSpin 8s linear infinite',
  },
  orbitDot: {
    position:     'absolute',
    width:        '10px',
    height:       '10px',
    borderRadius: '50%',
    background:   'linear-gradient(135deg,#ec4899,#7c3aed)',
    top:          '-2px',
    left:         '50%',
    marginLeft:   '-5px',
    boxShadow:    '0 0 8px rgba(236,72,153,0.6)',
    animation:    'orbitSpin 8s linear infinite',
  },
  logoOrb: {
    width:          '64px',
    height:         '64px',
    borderRadius:   '20px',
    background:     'linear-gradient(135deg,#7c3aed,#0d9488)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow:      '0 8px 32px rgba(124,58,237,0.40)',
    animation:      'pulse-ring 2.5s infinite',
    position:       'relative',
    zIndex:         1,
  },
  logoEmoji: {
    fontSize:   '28px',
    color:      '#fff',
    fontWeight: 800,
  },
  title: {
    fontSize:     'clamp(2.4rem,5vw,3.4rem)',
    fontWeight:   800,
    color:        'var(--text-primary)',
    marginBottom: '14px',
    lineHeight:   1.1,
    animation:    'fadeSlideUp 0.45s ease 0.05s both',
  },
  titleAccent: {
    background:           'linear-gradient(90deg,#7c3aed,#ec4899,#0d9488)',
    backgroundSize:       '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor:  'transparent',
    animation:            'gradientShift 4s ease infinite',
  },
  subtitle: {
    fontSize:     '1.05rem',
    color:        'var(--text-secondary)',
    maxWidth:     '500px',
    margin:       '0 auto 36px',
    lineHeight:   1.65,
    animation:    'fadeSlideUp 0.5s ease 0.1s both',
  },
  cards: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '14px',
  },
  card: {
    display:        'flex',
    alignItems:     'center',
    gap:            '18px',
    background:     'var(--bg-card)',
    border:         '1.5px solid var(--border)',
    borderRadius:   '20px',
    padding:        '22px 24px',
    textAlign:      'left',
    cursor:         'pointer',
    position:       'relative',
    overflow:       'hidden',
    boxShadow:      '0 2px 20px rgba(124,58,237,0.07)',
  },
  cardGlow: {
    position:      'absolute',
    inset:         0,
    pointerEvents: 'none',
  },
  cardLoading: {
    opacity: 0.65,
  },
  cardIcon: {
    width:          '52px',
    height:         '52px',
    borderRadius:   '14px',
    fontSize:       '24px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    transition:     'box-shadow 0.2s',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize:     '1.1rem',
    fontWeight:   700,
    color:        'var(--text-primary)',
    marginBottom: '5px',
  },
  cardDesc: {
    fontSize:     '0.865rem',
    color:        'var(--text-secondary)',
    lineHeight:   1.6,
    marginBottom: '8px',
  },
  cardMeta: {
    display:    'flex',
    alignItems: 'center',
    gap:        '6px',
  },
  metaDot: {
    width:        '6px',
    height:       '6px',
    borderRadius: '50%',
    background:   '#7c3aed',
    flexShrink:   0,
  },
  metaText: {
    fontSize: '11px',
    color:    'var(--text-muted)',
  },
  cardArrow: {
    width:          '36px',
    height:         '36px',
    borderRadius:   '10px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '16px',
    fontWeight:     700,
    flexShrink:     0,
    transition:     'background 0.2s, color 0.2s, transform 0.2s',
  },
  footerRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    marginTop:  '28px',
    animation:  'fadeSlideUp 0.5s ease 0.3s both',
  },
  footer: {
    fontSize: '12px',
    color:    'var(--text-muted)',
    margin:   0,
  },
  logoutBtn: {
    background:   'none',
    border:       '1px solid var(--border)',
    borderRadius: '999px',
    padding:      '3px 12px',
    fontSize:     '12px',
    color:        'var(--text-muted)',
    cursor:       'pointer',
    transition:   'color 0.15s, border-color 0.15s',
  },
  sessionsSection: {
    marginTop:  '36px',
    textAlign:  'left',
    animation:  'fadeSlideUp 0.5s ease 0.35s both',
  },
  sessionsHeading: {
    fontSize:     '11px',
    fontWeight:   700,
    color:        'var(--text-muted)',
    letterSpacing:'0.06em',
    textTransform:'uppercase' as const,
    marginBottom: '10px',
  },
  sessionsList: {
    display:       'flex',
    flexDirection: 'column' as const,
    gap:           '8px',
  },
  sessionCard: {
    display:        'flex',
    alignItems:     'center',
    background:     'var(--bg-card)',
    border:         '1.5px solid var(--border)',
    borderRadius:   '14px',
    boxShadow:      '0 1px 8px rgba(124,58,237,0.05)',
    overflow:       'hidden',
  },
  sessionResumeBtn: {
    flex:           1,
    display:        'flex',
    alignItems:     'center',
    gap:            '12px',
    padding:        '12px 16px',
    background:     'none',
    border:         'none',
    cursor:         'pointer',
    textAlign:      'left' as const,
    minWidth:       0,
  },
  deleteBtn: {
    flexShrink:     0,
    width:          '36px',
    height:         '100%',
    minHeight:      '48px',
    background:     'none',
    border:         'none',
    borderLeft:     '1px solid var(--border)',
    color:          'var(--text-muted)',
    fontSize:       '18px',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    transition:     'background 0.15s, color 0.15s',
  },
  sessionIcon: {
    fontSize:  '20px',
    flexShrink: 0,
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0,
  },
  sessionTitle: {
    fontSize:     '13px',
    fontWeight:   600,
    color:        'var(--text-primary)',
    margin:       0,
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap' as const,
  },
  sessionDate: {
    fontSize: '11px',
    color:    'var(--text-muted)',
    margin:   0,
  },
  sessionArrow: {
    fontSize:  '14px',
    color:     'var(--text-muted)',
    flexShrink: 0,
  },
}
