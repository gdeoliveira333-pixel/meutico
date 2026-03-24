import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, Copy, Zap, History, Menu, X, Activity, Search, Clock, Cloud, LogOut, LayoutDashboard } from 'lucide-react'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Agent from './pages/Agent'
import AuditLog from './pages/AuditLog'
import SearchPage from './pages/Search'
import Scheduler from './pages/Scheduler'
import CloudPage from './pages/Cloud'

const TABS = [
  { id: 'dashboard',  label: 'Início',     icon: LayoutDashboard },
  { id: 'search',     label: 'Busca IA',   icon: Search },
  { id: 'agent',      label: 'Agente',     icon: Zap },
  { id: 'cloud',      label: 'Drive',      icon: Cloud },
  { id: 'scheduler',  label: 'Agenda',     icon: Clock },
  { id: 'audit',      label: 'Histórico',  icon: History },
]

export default function App() {
  const [loggedIn, setLoggedIn]   = useState(!!localStorage.getItem('mt_token'))
  const [showApp, setShowApp]     = useState(false)
  const [tab, setTab]             = useState('dashboard')
  const [menuOpen, setMenuOpen]   = useState(false)

  // Permite que componentes filhos naveguem para uma aba
  window._setTab = setTab

  const logout = () => {
    localStorage.removeItem('mt_token')
    setLoggedIn(false)
    setShowApp(false)
  }

  if (!showApp) return <Landing onEnter={() => setShowApp(true)} />
  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />

  return (
    <div className="min-h-screen relative" style={{ background: '#080b10' }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(8,11,16,0.85)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => setShowApp(false)} className="flex items-center gap-3 group">
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, rgba(0,245,212,0.2), rgba(0,245,212,0.05))',
              border: '1px solid rgba(0,245,212,0.4)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0,245,212,0.2)',
            }}>
              <Activity size={14} style={{ color: '#00f5d4' }} />
            </div>
            <div className="text-left">
              <span className="font-bold text-white tracking-tight" style={{ fontSize: 15 }}>Meu Tico</span>
              <span className="ml-2 text-xs" style={{ color: 'rgba(0,245,212,0.6)' }}>AI File Manager</span>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button key={id} onClick={() => setTab(id)}
                  className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200"
                  style={{
                    color: active ? '#00f5d4' : 'rgba(148,163,184,0.7)',
                    background: active ? 'rgba(0,245,212,0.08)' : 'transparent',
                    border: active ? '1px solid rgba(0,245,212,0.2)' : '1px solid transparent',
                  }}>
                  <Icon size={13} />
                  {label}
                  {active && (
                    <motion.div layoutId="nav-indicator" style={{
                      position: 'absolute', bottom: -1, left: '20%', right: '20%',
                      height: 1, background: '#00f5d4', boxShadow: '0 0 8px #00f5d4', borderRadius: 99,
                    }} />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={logout}
              className="hidden lg:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(148,163,184,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <LogOut size={12} /> Sair
            </button>
            <button className="lg:hidden" style={{ color: '#94a3b8' }} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div className="px-4 py-3 grid grid-cols-2 gap-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => { setTab(id); setMenuOpen(false) }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left"
                    style={{ color: tab === id ? '#00f5d4' : '#94a3b8', background: tab === id ? 'rgba(0,245,212,0.08)' : 'transparent' }}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}>
            {tab === 'dashboard'  && <Dashboard />}
            {tab === 'search'     && <SearchPage />}
            {tab === 'agent'      && <Agent />}
            {tab === 'cloud'      && <CloudPage />}
            {tab === 'scheduler'  && <Scheduler />}
            {tab === 'audit'      && <AuditLog />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
