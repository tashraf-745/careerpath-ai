import { useState, useRef } from 'react'
import { setTargetRole, uploadResume } from '../api'

interface Props {
  sessionId: string
  mode:      'job_search' | 'career_guidance'
  onReady:   () => void
  onBack:    () => void
}

export default function StageOptions({ sessionId, mode, onReady, onBack }: Props) {
  const [role,          setRole]          = useState('')
  const [resumeFile,    setResumeFile]    = useState<File | null>(null)
  const [resumePreview, setResumePreview] = useState('')
  const [uploading,     setUploading]     = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const isJobSearch = mode === 'job_search'

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeFile(file)
    setUploading(true)
    setError('')
    try {
      const res = await uploadResume(sessionId, file)
      setResumePreview(res.preview)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setResumeFile(null)
    } finally {
      setUploading(false)
    }
  }

  async function handleStart() {
    setError('')
    if (isJobSearch && !role.trim()) {
      setError('Please enter a target role.')
      return
    }
    setLoading(true)
    try {
      if (isJobSearch && role.trim()) {
        await setTargetRole(sessionId, role.trim())
      }
      onReady()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const accent = isJobSearch ? '#0d9488' : '#7c3aed'
  const accentBg = isJobSearch ? '#ccfbf1' : '#ede9fe'

  return (
    <div style={styles.root}>
      {/* Hero background image */}
      <img
        src="/hero-image.jpg"
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

      {/* Background blobs */}
      <div style={{ ...styles.blob, top: '-80px', left: '-80px', background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)', animationName: 'float', animationDuration: '8s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />
      <div style={{ ...styles.blob, bottom: '-60px', right: '-60px', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)', animationName: 'floatB', animationDuration: '10s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />

      <div style={{ ...styles.card, animation: 'scaleIn 0.4s ease both' }}>
        {/* Back */}
        <button style={styles.back} onClick={onBack}>← Back</button>

        {/* Header */}
        <div style={styles.header}>
          <div style={{ ...styles.iconBox, background: `linear-gradient(135deg,${accent},${accent}99)` }}>
            {isJobSearch ? '🔍' : '🧭'}
          </div>
          <div>
            <h1 style={styles.title}>
              {isJobSearch ? 'Job Search' : 'Career Guidance'}
            </h1>
            <p style={styles.subtitle}>
              {isJobSearch
                ? 'Tell me what role you\'re targeting and optionally upload your resume.'
                : 'Optionally upload your resume so I can ground the conversation in your real background.'}
            </p>
          </div>
        </div>

        {/* Target role (job search only) */}
        {isJobSearch && (
          <div style={styles.field}>
            <label style={styles.label}>Target Role <span style={{ color: accent }}>*</span></label>
            <input
              style={{ ...styles.input, '--focus-color': accent } as React.CSSProperties}
              placeholder="e.g. UX Designer, Data Analyst, Software Engineer"
              value={role}
              onChange={e => setRole(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
            />
          </div>
        )}

        {/* Resume upload */}
        <div style={styles.field}>
          <label style={styles.label}>
            Resume <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — PDF, DOCX, or TXT)</span>
          </label>

          <div
            className="dropzone-hover"
            style={{ ...styles.dropzone, borderColor: resumeFile ? accent : 'var(--border)' }}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {uploading ? (
              <div style={styles.dropzoneInner}>
                <span style={{ fontSize: '24px' }}>⏳</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Parsing resume…</p>
              </div>
            ) : resumeFile ? (
              <div style={styles.dropzoneInner}>
                <span style={{ fontSize: '24px' }}>✅</span>
                <p style={{ fontWeight: 600, color: accent }}>{resumeFile.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click to replace</p>
              </div>
            ) : (
              <div style={styles.dropzoneInner}>
                <span style={{ fontSize: '32px' }}>📄</span>
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Click to upload your resume</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PDF, DOCX, or TXT · Parsed locally</p>
              </div>
            )}
          </div>

          {resumePreview && (
            <div style={{ ...styles.preview, borderColor: accentBg }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: accent, marginBottom: '6px' }}>RESUME PREVIEW</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {resumePreview}…
              </p>
            </div>
          )}
        </div>

        {/* What to expect */}
        <div style={{ ...styles.infoBox, background: accentBg, borderColor: `${accent}33` }}>
          <p style={{ fontWeight: 600, color: accent, marginBottom: '8px', fontSize: '13px' }}>
            What happens next
          </p>
          {isJobSearch ? (
            <ul style={styles.infoList}>
              <li>I'll search for live job listings matching your role and background</li>
              <li>You pick the one you want — I'll tailor your resume and write a cover letter</li>
              <li>I'll generate role-specific interview questions and STAR examples</li>
            </ul>
          ) : (
            <ul style={styles.infoList}>
              <li>I'll ask you a few questions to understand what makes you tick</li>
              <li>I'll research career paths and salary data in real time</li>
              <li>You'll get a personalised career plan with a month-by-month action plan</li>
            </ul>
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          className="start-btn-glow ripple-btn"
          style={{
            ...styles.startBtn,
            background: `linear-gradient(135deg,${accent},${accent}cc)`,
            opacity: loading ? 0.7 : 1,
          }}
          onClick={handleStart}
          disabled={loading || uploading}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              Starting…
            </span>
          ) : 'Start Chat →'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '24px',
    background:     'var(--bg)',
    position:       'relative',
    overflow:       'hidden',
  },
  blob: {
    position:     'absolute',
    width:        '320px',
    height:       '320px',
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
    padding:      '36px',
    maxWidth:     '580px',
    width:        '100%',
    position:     'relative',
    zIndex:       1,
  },
  back: {
    background:   'none',
    border:       'none',
    color:        'var(--text-muted)',
    fontSize:     '13px',
    cursor:       'pointer',
    marginBottom: '24px',
    padding:      0,
  },
  header: {
    display:      'flex',
    alignItems:   'flex-start',
    gap:          '16px',
    marginBottom: '28px',
  },
  iconBox: {
    width:        '52px',
    height:       '52px',
    borderRadius: '14px',
    fontSize:     '24px',
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    flexShrink:   0,
  },
  title: {
    fontSize:     '1.4rem',
    fontWeight:   700,
    color:        'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize:  '0.875rem',
    color:     'var(--text-secondary)',
    lineHeight:1.5,
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display:      'block',
    fontSize:     '13px',
    fontWeight:   600,
    color:        'var(--text-primary)',
    marginBottom: '8px',
  },
  input: {
    width:       '100%',
    padding:     '12px 16px',
    borderRadius:'var(--radius)',
    border:      '1.5px solid var(--border)',
    fontSize:    '14px',
    color:       'var(--text-primary)',
    background:  'var(--bg)',
    outline:     'none',
    transition:  'border-color 0.15s',
  },
  dropzone: {
    border:       '2px dashed',
    borderRadius: 'var(--radius)',
    padding:      '28px 20px',
    textAlign:    'center',
    cursor:       'pointer',
    transition:   'border-color 0.15s',
    background:   'var(--bg)',
  },
  dropzoneInner: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '8px',
  },
  preview: {
    marginTop:    '12px',
    padding:      '12px 14px',
    borderRadius: 'var(--radius)',
    border:       '1.5px solid',
    background:   'var(--bg)',
  },
  infoBox: {
    borderRadius: 'var(--radius)',
    border:       '1.5px solid',
    padding:      '16px',
    marginBottom: '20px',
  },
  infoList: {
    paddingLeft: '18px',
    display:     'flex',
    flexDirection:'column',
    gap:          '5px',
    fontSize:     '13px',
    color:        'var(--text-secondary)',
  },
  error: {
    color:        'var(--accent-coral)',
    fontSize:     '13px',
    marginBottom: '12px',
  },
  startBtn: {
    width:        '100%',
    padding:      '14px',
    borderRadius: 'var(--radius)',
    border:       'none',
    color:        '#fff',
    fontSize:     '15px',
    fontWeight:   700,
    cursor:       'pointer',
    transition:   'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
  },
}
