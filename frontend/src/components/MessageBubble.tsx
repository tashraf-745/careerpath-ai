import type { ChatResponse } from '../api'

interface Props {
  role:     'user' | 'agent'
  text:     string
  response?: ChatResponse
}

function renderText(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const isLast = i === lines.length - 1

    // ━━━ divider lines
    if (/^━+$/.test(line.trim())) {
      return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />
    }

    // Bold **text** inline
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span key={i}>
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>
        )}
        {!isLast && <br />}
      </span>
    )
  })
}

export default function MessageBubble({ role, text, response }: Props) {
  const isUser = role === 'user'

  return (
    <div style={{
      ...styles.wrapper,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: isUser ? 'fadeInRight 0.3s ease both' : 'fadeInLeft 0.3s ease both',
    }}>
      {!isUser && (
        <div style={styles.avatar}>🤖</div>
      )}

      <div style={{ maxWidth: '72%' }}>

        {/* Bubble */}
        <div style={{
          ...styles.bubble,
          ...(isUser ? styles.bubbleUser : styles.bubbleAgent),
        }}>
          <p style={styles.text}>{renderText(text)}</p>
        </div>

        {/* Job listings inline */}
        {!isUser && response?.listings && response.listings.length > 0 && (
          <div style={styles.listingsGrid}>
            {response.listings.slice(0, 5).map((job, i) => (
              <div key={i} style={styles.jobCard}>
                <div style={styles.jobCardHeader}>
                  <span style={styles.jobNum}>{i + 1}</span>
                  <div style={styles.jobInfo}>
                    <p style={styles.jobTitle}>{job.title}</p>
                    <p style={styles.jobCompany}>{job.company} · {job.location}</p>
                  </div>
                  <span style={styles.fitBadge}>{Math.round(job.fit_score * 100)}%</span>
                </div>
                {job.salary_range && (
                  <p style={styles.jobSalary}>{job.salary_range}</p>
                )}
                {job.apply_link && (
                  <a
                    href={job.apply_link}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.applyLink}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1';    (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  >
                    Apply ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tailored resume + cover letter */}
        {!isUser && response?.tailored_resume && (
          <div style={styles.docCard}>
            <p style={styles.docTitle}>📄 Tailored Resume</p>
            <pre style={styles.docPre}>{response.tailored_resume}</pre>
          </div>
        )}
        {!isUser && response?.cover_letter && (
          <div style={styles.docCard}>
            <p style={styles.docTitle}>✉️ Cover Letter</p>
            <pre style={styles.docPre}>{response.cover_letter}</pre>
          </div>
        )}

        {/* Interview questions */}
        {!isUser && response?.likely_questions && response.likely_questions.length > 0 && (
          <div style={styles.docCard}>
            <p style={styles.docTitle}>🎯 Likely Interview Questions</p>
            <ol style={styles.questionList}>
              {response.likely_questions.map((q, i) => (
                <li key={i} style={styles.questionItem}>{q}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Coaching note */}
        {!isUser && response?.coaching_note && (
          <div style={styles.coachingNote}>
            💡 {response.coaching_note}
          </div>
        )}
      </div>

      {isUser && (
        <div style={styles.avatarUser}>👤</div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display:   'flex',
    gap:       '10px',
    alignItems:'flex-start',
    marginBottom:'4px',
  },
  avatar: {
    width:          '34px',
    height:         '34px',
    borderRadius:   '50%',
    background:     'linear-gradient(135deg,#7c3aed,#a855f7)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '16px',
    flexShrink:     0,
    marginTop:      '2px',
    boxShadow:      '0 2px 10px rgba(124,58,237,0.28)',
    animation:      'avatarPop 0.3s ease both',
  },
  avatarUser: {
    width:          '34px',
    height:         '34px',
    borderRadius:   '50%',
    background:     'linear-gradient(135deg,#0d9488,#14b8a6)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '16px',
    flexShrink:     0,
    marginTop:      '2px',
    boxShadow:      '0 2px 10px rgba(13,148,136,0.28)',
    animation:      'avatarPop 0.3s ease both',
  },
  stageBadgeRow: {
    display:      'flex',
    gap:          '6px',
    alignItems:   'center',
    marginBottom: '5px',
  },
  stageBadge: {
    fontSize:    '10px',
    fontWeight:  700,
    color:       '#fff',
    padding:     '2px 8px',
    borderRadius:'999px',
    letterSpacing:'0.04em',
    textTransform:'uppercase',
  },
  reactBadge: {
    fontSize:    '10px',
    fontWeight:  600,
    color:       'var(--accent-amber)',
    background:  '#fef3c7',
    padding:     '2px 8px',
    borderRadius:'999px',
  },
  bubble: {
    padding:      '12px 16px',
    borderRadius: '16px',
    lineHeight:   1.6,
  },
  bubbleUser: {
    background:           'linear-gradient(135deg,#7c3aed,#a855f7)',
    color:                '#fff',
    borderTopRightRadius: '4px',
    boxShadow:            '0 4px 16px rgba(124,58,237,0.25)',
  },
  bubbleAgent: {
    background:          'var(--bg-card)',
    color:               'var(--text-primary)',
    border:              '1.5px solid var(--border)',
    borderTopLeftRadius: '4px',
    boxShadow:           '0 2px 12px rgba(124,58,237,0.08)',
  },
  text: {
    fontSize:  '14px',
    margin:    0,
    whiteSpace:'pre-wrap',
  },
  listingsGrid: {
    marginTop:     '10px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '8px',
  },
  jobCard: {
    background:   'var(--bg-card)',
    border:       '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding:      '12px 14px',
    boxShadow:    '0 2px 12px rgba(13,148,136,0.08)',
    transition:   'transform 0.15s, box-shadow 0.15s',
  },
  jobCardHeader: {
    display:     'flex',
    gap:         '10px',
    alignItems:  'flex-start',
    marginBottom:'4px',
  },
  jobNum: {
    width:        '22px',
    height:       '22px',
    borderRadius: '50%',
    background:   'var(--accent-teal)',
    color:        '#fff',
    fontSize:     '11px',
    fontWeight:   700,
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    flexShrink:   0,
  },
  jobInfo: { flex: 1 },
  jobTitle: {
    fontSize:     '13px',
    fontWeight:   700,
    color:        'var(--text-primary)',
    marginBottom: '2px',
  },
  jobCompany: {
    fontSize: '12px',
    color:    'var(--text-secondary)',
  },
  fitBadge: {
    fontSize:    '11px',
    fontWeight:  700,
    color:       'var(--accent-teal)',
    background:  '#ccfbf1',
    padding:     '2px 7px',
    borderRadius:'999px',
    flexShrink:  0,
  },
  jobSalary: {
    fontSize:  '12px',
    color:     'var(--accent-amber)',
    marginTop: '4px',
    fontWeight:600,
  },
  applyLink: {
    display:         'inline-block',
    marginTop:       '8px',
    fontSize:        '12px',
    fontWeight:      700,
    color:           '#fff',
    background:      'var(--accent-teal)',
    padding:         '5px 14px',
    borderRadius:    '999px',
    textDecoration:  'none',
    letterSpacing:   '0.02em',
    boxShadow:       '0 2px 8px rgba(13,148,136,0.3)',
    transition:      'opacity 0.15s, transform 0.15s',
  },
  docCard: {
    marginTop:    '10px',
    background:   'var(--bg)',
    border:       '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding:      '14px',
  },
  docTitle: {
    fontSize:     '12px',
    fontWeight:   700,
    color:        'var(--text-primary)',
    marginBottom: '8px',
  },
  docPre: {
    fontSize:  '12px',
    color:     'var(--text-secondary)',
    whiteSpace:'pre-wrap',
    margin:    0,
    lineHeight:1.5,
    maxHeight: '200px',
    overflowY: 'auto',
  },
  questionList: {
    paddingLeft: '16px',
    display:     'flex',
    flexDirection:'column',
    gap:         '5px',
  },
  questionItem: {
    fontSize:  '13px',
    color:     'var(--text-secondary)',
    lineHeight:1.45,
  },
  coachingNote: {
    marginTop:    '8px',
    padding:      '8px 12px',
    background:   '#fef3c7',
    borderRadius: 'var(--radius)',
    fontSize:     '12px',
    color:        '#92400e',
    fontWeight:   500,
  },
}
