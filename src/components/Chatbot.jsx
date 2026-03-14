import { useState, useRef, useEffect } from 'react'
import { sendMessage } from '../lib/chat-ai'

const WELCOME_MSG = {
  role: 'assistant',
  content: '¡Hola! Soy Setto, tu coach fitness 💪\n\nPreguntame sobre entrenamiento, nutrición, suplementos, tu progreso o escribí "ayuda" para ver todo lo que puedo hacer.',
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  async function handleSend(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await sendMessage(text)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ups, algo salió mal. Intentá de nuevo.',
        isError: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([WELCOME_MSG])
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed z-[60] bottom-14 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 active:scale-90 ${
          open ? 'bg-gray-600' : 'bg-primary'
        }`}
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <span className="material-symbols-outlined text-white text-2xl">
          {open ? 'close' : 'chat'}
        </span>
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed inset-0 z-[55] flex flex-col bg-bg animate-fade-in" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-lg">smart_toy</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Stitch Coach</p>
              <p className="text-[10px] text-text-secondary">Tu asistente fitness</p>
            </div>
            <button
              onClick={clearChat}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              title="Limpiar chat"
            >
              <span className="material-symbols-outlined text-text-secondary text-lg">delete_sweep</span>
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary text-lg">close</span>
            </button>
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 shrink-0">
              {[
                { label: '¿Cómo voy?', msg: '¿Cómo voy con mi progreso?' },
                { label: 'Tip de nutrición', msg: 'Dame un tip de nutrición' },
                { label: 'Rutinas', msg: '¿Qué rutina me recomendás?' },
                { label: 'Motivación', msg: 'Necesito motivación' },
                { label: 'Suplementos', msg: '¿Qué suplementos sirven?' },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => { setInput(q.msg); }}
                  className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : msg.isError
                      ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                      : 'bg-white text-text shadow-sm border border-gray-100 rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-text-secondary shadow-sm border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Preguntale a Setto..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shrink-0 disabled:opacity-40 active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
