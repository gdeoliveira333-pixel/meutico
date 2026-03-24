import { motion } from 'framer-motion'

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#fff', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Card({ children, className = '', glow = false, style = {} }) {
  return (
    <div className={`rounded-2xl p-5 card-hover ${className}`} style={{
      background: 'rgba(10,15,25,0.7)',
      border: `1px solid ${glow ? 'rgba(0,245,212,0.25)' : 'rgba(255,255,255,0.06)'}`,
      backdropFilter: 'blur(12px)',
      boxShadow: glow ? '0 0 32px rgba(0,245,212,0.1)' : 'none',
      ...style
    }}>
      {children}
    </div>
  )
}

export function StatCard({ value, label, color = '#00f5d4' }) {
  return (
    <Card>
      <p className="text-3xl font-bold" style={{ color, textShadow: `0 0 20px ${color}60` }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</p>
    </Card>
  )
}

export function BtnPrimary({ children, onClick, disabled, loading, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  )
}

export function BtnDanger({ children, onClick, disabled, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`btn-danger flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40 ${className}`}>
      {children}
    </button>
  )
}

export function Input({ className = '', ...props }) {
  return (
    <input {...props}
      className={`w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 transition-all ${className}`}
      style={{
        background: 'rgba(15,22,35,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    />
  )
}

export function EmptyState({ icon: Icon, message }) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
        style={{ background: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.1)' }}>
        <Icon size={24} style={{ color: 'rgba(0,245,212,0.4)' }} />
      </div>
      <p className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>{message}</p>
    </div>
  )
}

export function Alert({ type = 'success', children }) {
  const cfg = {
    success: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)', color: '#34d399' },
    error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#f87171' },
    info:    { bg: 'rgba(0,245,212,0.08)',  border: 'rgba(0,245,212,0.25)',  color: '#00f5d4' },
  }[type]
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {children}
    </motion.div>
  )
}
