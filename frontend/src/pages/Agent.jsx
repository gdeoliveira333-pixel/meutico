import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { Zap, ShieldCheck, AlertTriangle, Info, Sparkles } from 'lucide-react'
import { PageHeader, Card, StatCard, BtnPrimary, BtnDanger, EmptyState, Alert } from '../components/UI'

const RISK = {
  LOW:    { label: 'BAIXO',  color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  icon: ShieldCheck },
  MEDIUM: { label: 'MÉDIO',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)',  icon: AlertTriangle },
  HIGH:   { label: 'ALTO',   color: '#f87171', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   icon: AlertTriangle },
}

export default function Agent() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [committing, setCommitting] = useState(null)
  const [commitResult, setCommitResult] = useState({})

  const run = async () => {
    setLoading(true); setData(null); setCommitResult({})
    try { setData(await api.getAgent()) }
    finally { setLoading(false) }
  }

  const execute = async (rec) => {
    setCommitting(rec.type)
    try {
      const res = await api.commit(rec.file_ids)
      setCommitResult(prev => ({ ...prev, [rec.type]: res }))
    } finally { setCommitting(null) }
  }

  return (
    <div>
      <PageHeader
        title="Agente IA"
        subtitle="Análise inteligente com recomendações contextualizadas em linguagem natural."
        action={
          <BtnPrimary onClick={run} disabled={loading}>
            <Zap size={13} className={loading ? 'animate-pulse' : ''} />
            {loading ? 'Analisando...' : 'Analisar'}
          </BtnPrimary>
        }
      />

      <AnimatePresence>
        {data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard value={data.total_recommendations} label="recomendações geradas" color="#00f5d4" />
              <StatCard value={`${data.total_savings_mb} MB`} label="podem ser liberados" color="#34d399" />
            </div>

            {/* AI Analysis */}
            {data.ai_analysis && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card glow>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(0,245,212,0.1)', border: '1px solid rgba(0,245,212,0.2)' }}>
                      <Sparkles size={11} style={{ color: '#00f5d4' }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#00f5d4' }}>Análise do Meu Tico</span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'rgba(226,232,240,0.8)', fontFamily: 'system-ui' }}>
                    {data.ai_analysis}
                  </div>
                </Card>
              </motion.div>
            )}

            {!data.ai_available && (
              <Alert type="info">
                <div className="flex items-center gap-2">
                  <Info size={12} /> {data.ai_message}
                </div>
              </Alert>
            )}

            {/* Recommendations */}
            <div className="space-y-3">
              {data.recommendations.map((rec, i) => {
                const cfg = RISK[rec.risk]
                const Icon = cfg.icon
                const result = commitResult[rec.type]
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
                    className="rounded-2xl p-5 card-hover"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, backdropFilter: 'blur(12px)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={12} style={{ color: cfg.color }} />
                          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>{rec.type}</span>
                        </div>
                        <p className="text-sm font-semibold text-white mb-1">{rec.title}</p>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.7)' }}>{rec.description}</p>
                        {rec.potential_savings_mb > 0 && (
                          <p className="text-xs mt-2" style={{ color: 'rgba(0,245,212,0.6)' }}>
                            Economia estimada: {rec.potential_savings_mb} MB
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {result ? (
                          <span className={`text-xs px-2 py-1 rounded-lg ${result.success ? 'tag-success' : 'tag-warn'}`}>
                            {result.success ? '✓ executado' : '✗ erro'}
                          </span>
                        ) : rec.file_ids.length > 0 && (
                          <BtnDanger onClick={() => execute(rec)} disabled={!!committing}>
                            <ShieldCheck size={11} />
                            {committing === rec.type ? 'Executando...' : 'Executar'}
                          </BtnDanger>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {data.recommendations.length === 0 && (
              <Alert type="success">Nenhuma recomendação. Seu armazenamento está em ordem!</Alert>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!data && !loading && (
        <EmptyState icon={Zap} message="Clique em 'Analisar' para gerar recomendações com IA." />
      )}
    </div>
  )
}
