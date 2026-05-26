import { useState, useRef, useEffect } from 'react'
import { sendMessage, getSessionMessages } from '../api'
import type { ChatResponse } from '../api'
import MessageBubble from '../components/MessageBubble'

interface Message {
  role:      'user' | 'agent'
  text:      string
  response?: ChatResponse
}

interface Props {
  sessionId: string
  mode:      'job_search' | 'career_guidance'
  isResumed: boolean
  onReset:   () => void
}

const STAGE_COLORS: Record<string, string> = {
  entry:      'var(--stage-entry)',
  assessment: 'var(--stage-assessment)',
  job_search: 'var(--stage-job-search)',
  applying:   'var(--stage-applying)',
  tracking:   'var(--stage-tracking)',
}

export default function Chat({ sessionId, mode, isResumed, onReset }: Props) {
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(isResumed)
  const [stage,        setStage]        = useState(mode === 'job_search' ? 'job_search' : 'entry')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isResumed) {
      setLoadingHistory(true)
      getSessionMessages(sessionId).then(({ messages: history }) => {
        if (history.length > 0) {
          setMessages(history)
        } else {
          setMessages([{ role: 'agent', text: 'Welcome back! Where would you like to pick up?' }])
        }
        setLoadingHistory(false)
      }).catch(() => {
        setMessages([{ role: 'agent', text: 'Welcome back! Where would you like to pick up?' }])
        setLoadingHistory(false)
      })
    } else {
      const greeting = mode === 'job_search'
        ? "Hi! I see you already know your target role — let me find the best live listings for you. What's the role you're going for, and where are you located? (You can just say \"anywhere\" if you're open to remote.)"
        : "Hi! I'm CareerPath AI, your personal career advisor. I'm here to help you figure out the right path and put together a real plan. To start — tell me a little about yourself. What have you been up to lately, and what brought you here today?"
      setMessages([{ role: 'agent', text: greeting }])
    }
  }, [sessionId, mode, isResumed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const response = await sendMessage(sessionId, text)
      setMessages(prev => [...prev, {
        role:     'agent',
        text:     response.user_facing_message,
        response,
      }])
      if (response.user_stage) setStage(response.user_stage)
    } catch {
      setMessages(prev => [...prev, {
        role: 'agent',
        text: 'Something went wrong on my end — please try again in a moment.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const stageColor = STAGE_COLORS[stage] || 'var(--accent-purple)'

  const bgImage = mode === 'career_guidance'
    ? '/hero-illustration-2.png'
    : '/hero-illustration-3.png'

  return (
    <div style={styles.root}>
      {/* Full-screen background illustration */}
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          width:         '100%',
          height:        '100%',
          objectFit:     'cover',
          objectPosition:'center',
          opacity:       0.10,
          pointerEvents: 'none',
          userSelect:    'none',
          zIndex:        0,
        }}
      />

      {/* Subtle ambient blobs */}
      <div style={{ ...styles.blob, top: '-60px', left: '-60px', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', animationName: 'float', animationDuration: '10s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />
      <div style={{ ...styles.blob, bottom: '60px', right: '-40px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)', animationName: 'floatB', animationDuration: '13s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />

      {/* Main chat area */}
      <main style={styles.main}>
        {/* Top bar */}
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <div style={styles.logoMark}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>CP</span>
            </div>
            <div>
              <p style={styles.topbarTitle}>
                {mode === 'job_search' ? 'Job Search' : 'Career Guidance'}
              </p>
              <p style={styles.topbarSub}>CareerPath AI</p>
            </div>
          </div>
          <button style={styles.resetBtn} onClick={onReset}>
            ← Start Over
          </button>
        </div>
        {/* Gradient accent bar */}
        <div style={styles.topbarAccent} />

        {/* Messages */}
        <div style={styles.messages}>
          {loadingHistory && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
              <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading your conversation…
            </div>
          )}
          {!loadingHistory && messages.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              text={msg.text}
              response={msg.response}
            />
          ))}

          {loading && (
            <div style={styles.typingRow}>
              <div style={styles.avatar}>
                <span style={{ fontSize: '16px' }}>🤖</span>
              </div>
              <div style={styles.typingBubble}>
                <span className="dot" style={styles.dot} />
                <span className="dot" style={styles.dot} />
                <span className="dot" style={styles.dot} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={styles.inputArea}>
          <div style={{
            ...styles.inputWrapper,
            borderColor: input.trim() ? stageColor : 'var(--border)',
            boxShadow: input.trim() ? `0 0 0 3px ${stageColor}18` : 'none',
          }}>
            <textarea
              ref={inputRef}
              style={styles.textarea}
              placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              style={{
                ...styles.sendBtn,
                background: input.trim() && !loading
                  ? `linear-gradient(135deg,${stageColor},${stageColor}aa)`
                  : 'var(--border)',
                transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.95)',
                boxShadow: input.trim() && !loading ? `0 4px 14px ${stageColor}44` : 'none',
              }}
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              ) : '↑'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height:   '100vh',
    display:  'flex',
    overflow: 'hidden',
    background:'var(--bg)',
    position: 'relative',
  },
  blob: {
    position:     'absolute',
    width:        '400px',
    height:       '400px',
    borderRadius: '50%',
    pointerEvents:'none',
    zIndex:       0,
  },
  main: {
    flex:         1,
    display:      'flex',
    flexDirection:'column',
    overflow:     'hidden',
    position:     'relative',
    zIndex:       1,
  },
  topbar: {
    padding:        '12px 24px',
    background:     'var(--bg-card)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    flexShrink:     0,
  },
  topbarAccent: {
    height:     '2px',
    background: 'linear-gradient(90deg,#7c3aed,#ec4899,#0d9488)',
    flexShrink: 0,
  },
  topbarLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
  },
  logoMark: {
    width:          '36px',
    height:         '36px',
    borderRadius:   '10px',
    background:     'linear-gradient(135deg,#7c3aed,#0d9488)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow:      '0 4px 12px rgba(124,58,237,0.3)',
    flexShrink:     0,
  },
  topbarTitle: {
    fontSize:  '14px',
    fontWeight:700,
    color:     'var(--text-primary)',
    margin:    0,
    lineHeight:1.2,
  },
  topbarSub: {
    fontSize:  '11px',
    color:     'var(--text-muted)',
    margin:    0,
  },
  resetBtn: {
    background:   'none',
    border:       '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding:      '7px 14px',
    fontSize:     '12px',
    color:        'var(--text-secondary)',
    cursor:       'pointer',
    transition:   'border-color 0.15s, color 0.15s',
  },
  messages: {
    flex:      1,
    overflowY: 'auto',
    padding:   '24px',
    display:   'flex',
    flexDirection:'column',
    gap:       '16px',
  },
  typingRow: {
    display:   'flex',
    gap:       '10px',
    alignItems:'center',
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
    boxShadow:      '0 2px 8px rgba(124,58,237,0.3)',
    animation:      'avatarPop 0.3s ease both',
  },
  typingBubble: {
    background:   'var(--bg-card)',
    border:       '1.5px solid var(--border)',
    borderRadius: '16px',
    borderTopLeftRadius:'4px',
    padding:      '12px 18px',
    display:      'flex',
    gap:          '5px',
    alignItems:   'center',
    boxShadow:    'var(--shadow)',
  },
  dot: {
    width:           '7px',
    height:          '7px',
    borderRadius:    '50%',
    background:      'var(--accent-purple)',
    display:         'inline-block',
    animation:       'bounce 1.2s infinite',
  },
  inputArea: {
    padding:      '16px 24px 20px',
    borderTop:    '1.5px solid var(--border)',
    background:   'var(--bg-card)',
    flexShrink:   0,
  },
  inputWrapper: {
    display:      'flex',
    gap:          '10px',
    alignItems:   'flex-end',
    background:   'var(--bg-card)',
    border:       '1.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding:      '8px 8px 8px 16px',
    transition:   'border-color 0.2s, box-shadow 0.2s',
  },
  textarea: {
    flex:        1,
    background:  'none',
    border:      'none',
    outline:     'none',
    fontSize:    '14px',
    color:       'var(--text-primary)',
    resize:      'none',
    lineHeight:  1.5,
    maxHeight:   '120px',
    overflowY:   'auto',
  },
  sendBtn: {
    width:          '38px',
    height:         '38px',
    borderRadius:   '10px',
    border:         'none',
    color:          '#fff',
    fontSize:       '18px',
    fontWeight:     700,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    transition:     'background 0.15s, transform 0.15s, box-shadow 0.15s',
    flexShrink:     0,
    cursor:         'pointer',
  },
  inputHint: {
    marginTop: '8px',
    fontSize:  '11px',
    color:     'var(--text-muted)',
    textAlign: 'center',
  },
}
