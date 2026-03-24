import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { History, RotateCcw, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react'
import { PageHeader, BtnPrimary, EmptyState, Alert } from '../components/UI'

const STATUS = {
  SUCCESS:     { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.15)',  icon: CheckCircle, label: 'Sucesso' },
  FAILED:      { color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.15)',   icon: XCircle,     label: 'Falhou' },
  ROLLED_BACK: { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)', icon: RefreshCw,   label: 'Desfeito' },
}

export default function AuditLog() {
  const [logs, setLogs]       = useState([])
  const [rolling, setRolling] = useState(null)
  const [result, setResult]   = useState(null)

  const load = () => api.getAuditLog().then(d => setLogs(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const rollback = async (id) => {
    setRolling(id); setResult(null)
    try {
      const res = await api.rollback([id])
      setResult(res); load()
    } finally { setRolling(null) }
  }

  const fmt = dt => new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <PageHeader
        title="Histórico de Ações"
        subtitle="Registro imutável de tudo que foi executado — com rollback disponível."
        action={
          <BtnPrimary onClick={load}>
            <RefreshCw size={13} /> Atualizar
          </BtnPrimary>
        }
      />

      {result && (
        <div className="mb-6">
          <Alert type={result.success ? 'success' : 'error'}>
            {result.success
              ? `✓ ${result.restored?.length} arquivo(s) restaurado(s) com sucesso.`
              : `Erro: ${result.failed?.map(f => f.error).join(', ')}`}
          </Alert>
        </div>
      )}

      {logs.length === 0
        ? <EmptyState icon={History} message="Nenhuma ação registrada ainda." />
        : (
          <div className="space-y-2">
            <AnimatePresence>
              {logs.map((log, i) => {
                const cfg = STATUS[log.status] || STATUS.FAILED
                const Icon = cfg.icon
                return (
                  <motion.div key={log.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 rounded-2xl px-5 py-4 card-hover"
                    style={{ background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>

                    {/* Icon */}
                    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>{log.action}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs truncate" style={{ color: 'rgba(148,163,184,0.6)' }}>{log.source_path}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={9} style={{ color: 'rgba(148,163,184,0.3)' }} />
                        <span className="text-xs" style={{ color: 'rgba(148,163,184,0.3)' }}>{fmt(log.executed_at)}</span>
                      </div>
                    </div>

                    {/* Rollback */}
                    {log.status === 'SUCCESS' && log.action === 'QUARANTINE' && (
                      <button onClick={() => rollback(log.id)} disabled={rolling === log.id}
                        className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                        style={{
                          color: 'rgba(148,163,184,0.7)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(15,22,35,0.5)',
                        }}>
                        <RotateCcw size={10} />
                        {rolling === log.id ? 'Desfazendo...' : 'Desfazer'}
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )
      }
    </div>
  )
}
