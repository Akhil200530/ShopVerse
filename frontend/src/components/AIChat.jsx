import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

function renderBold(text) {
  const parts = text.split('**')
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>
  )
}

export function AIChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const bodyRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || typing) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: message }])
    setTyping(true)
    setSuggestions([])
    try {
      const res = await api.aiChat(
        message,
        messages.slice(-8).map((m) => ({ role: m.role, text: m.text }))
      )
      setMessages((m) => [...m, { role: 'assistant', text: res.reply }])
      setSuggestions(res.suggestions ?? [])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: `Sorry, I hit an error: ${err.message}` }])
    } finally {
      setTyping(false)
    }
  }

  const chip = (label) => {
    if (label === 'Login') {
      navigate('/login')
      setOpen(false)
      return
    }
    send(label)
  }

  return (
    <>
      <button className="ai-fab" onClick={() => setOpen(!open)} aria-label="AI assistant">
        {open ? '✕' : '✨'}
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-head">
            <span style={{ fontSize: 20 }}>✨</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>ShopVerse AI</div>
              <div style={{ fontSize: 11.5, opacity: 0.85 }}>Product recommendations &amp; help</div>
            </div>
          </div>

          <div className="ai-body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="ai-msg bot">
                Hi! 👋 Ask me things like <strong>"headphones under 5000"</strong>, <strong>"recommend a laptop"</strong>, or <strong>"track my order"</strong>.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role === 'user' ? 'user' : 'bot'}`}>
                {renderBold(m.text)}
              </div>
            ))}
            {typing && (
              <div className="ai-msg bot">
                <span className="ai-typing">
                  <span /><span /><span />
                </span>
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="ai-chips">
              {suggestions.map((s) => (
                <button key={s} className="ai-chip" onClick={() => chip(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="ai-input-row"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask ShopVerse AI…"
              maxLength={500}
            />
            <button className="ai-send" type="submit" aria-label="Send">➤</button>
          </form>
        </div>
      )}
    </>
  )
}