import { useState } from 'react'
import { motion } from 'framer-motion'
import { Film, Eye, EyeOff, LogIn } from 'lucide-react'
import { api } from '../api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true); setError('')
    try {
      const res = await api.login(username, password)
      if (res.token) {
        localStorage.setItem('mt_token', res.token)
        onLogin(res.username)
      } else {
        setError(res.detail || 'Usuário ou senha incorretos.')
      }
    } catch(e) {
      setError('Erro ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 300,
        background: 'radial-gradient(ellipse, rgba(0,245,212,0.06), transparent 65%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 380, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
            background: 'rgba(0,245,212,0.1)',
            border: '1px solid rgba(0,245,212,0.25)',
            boxShadow: '0 0 24px rgba(0,245,212,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Film size={20} style={{ color: '#00f5d4' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 4 }}>
            Meu Tico
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.5)' }}>AI File Manager</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(10,15,25,0.9)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: '28px 28px',
          backdropFilter: 'blur(20px)',
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Entrar</p>
          <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.45)', marginBottom: 24 }}>
            Acesse sua plataforma de gestão de arquivos.
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.5)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
                USUÁRIO
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.5)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
                SENHA
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '10px 42px 10px 14px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(148,163,184,0.4)', padding: 0,
                  }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                color: '#f87171', fontSize: 12,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !username || !password}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px', borderRadius: 12, marginTop: 4,
                background: (loading || !username || !password) ? 'rgba(0,245,212,0.05)' : 'rgba(0,245,212,0.12)',
                border: '1px solid rgba(0,245,212,0.25)',
                color: '#00f5d4', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: (loading || !username || !password) ? 0.5 : 1,
                transition: 'all 0.15s',
              }}>
              <LogIn size={14} />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(148,163,184,0.2)', marginTop: 20 }}>
          Credenciais definidas no arquivo <code style={{ color: 'rgba(0,245,212,0.4)' }}>.env</code> do backend
        </p>
      </motion.div>
    </div>
  )
}
